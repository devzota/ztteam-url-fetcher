"use client";

import { useState, useEffect, useRef } from "react";
import type { ZTTeamArticle } from "@/lib/database";
/** Ghi log API usage sau mỗi lần gọi Gemini */
async function ztteam_logApiUsage(data: {
  article_id: number;
  model: string;
  type: string;
  input_tokens: number;
  output_tokens: number;
}): Promise<void> {
  try {
    await fetch("/api/api-logs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
  } catch {
    /** Lỗi log không ảnh hưởng flow chính */
  }
}

/** Gemini API types */
interface ZTTeamScriptData {
  title: string;
  script: string;
  socialPost: string;
  largeTitle: string;
  smallTitle: string;
}

/** Section card wrapper */
function ZTTeamCard({
  title,
  children,
  accent,
}: {
  title: string;
  children: React.ReactNode;
  accent?: boolean;
}) {
  return (
    <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden">
      <div
        className={`px-5 py-3 border-b border-slate-800 ${accent ? "bg-purple-500/10" : "bg-slate-800/30"}`}
      >
        <p
          className={`text-xs font-bold uppercase tracking-wider ${accent ? "text-purple-400" : "text-slate-400"}`}
        >
          {title}
        </p>
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

/** Compare row: gốc vs mới */
function ZTTeamCompareRow({
  label,
  original,
  generated,
}: {
  label: string;
  original: React.ReactNode;
  generated: React.ReactNode;
}) {
  return (
    <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden">
      <div className="px-5 py-3 border-b border-slate-800 bg-slate-800/30">
        <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
          {label}
        </p>
      </div>
      <div className="grid grid-cols-2 divide-x divide-slate-800">
        <div className="p-4">
          <p className="text-xs font-semibold text-slate-500 mb-2">Gốc</p>
          {original}
        </div>
        <div className="p-4">
          <p className="text-xs font-semibold text-purple-400 mb-2">AI mới</p>
          {generated}
        </div>
      </div>
    </div>
  );
}

export default function ZTTeamGeneratePage() {
  const [articles, setArticles] = useState<ZTTeamArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<ZTTeamArticle | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [scriptData, setScriptData] = useState<ZTTeamScriptData | null>(null);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [generatedAudio, setGeneratedAudio] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedId, setSavedId] = useState<number | null>(null);
  const [showOriginal, setShowOriginal] = useState(false);
  const audioRef = useRef<string | null>(null);
  const audioPathRef = useRef<string | null>(null);
  const imagePathRef = useRef<string | null>(null);

  /** Fetch pending articles */
  const ztteam_fetchPending = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/queue");
      const json = await res.json();
      if (json.success) {
        const pending = json.data.filter(
          (a: ZTTeamArticle) =>
            a.status === "pending" || a.status === "rejected",
        );
        setArticles(pending);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    ztteam_fetchPending();
  }, []);

  useEffect(() => {
    return () => {
      if (audioRef.current) URL.revokeObjectURL(audioRef.current);
    };
  }, []);

  /** Select article */
  const ztteam_handleSelect = (article: ZTTeamArticle) => {
    setSelected(article);
    setScriptData(null);
    setGeneratedImage(null);
    setGeneratedAudio(null);
    setError(null);
    setSavedId(null);
    setShowOriginal(false);
    audioPathRef.current = null;
    imagePathRef.current = null;
  };

  /** Generate */
  const ztteam_handleGenerate = async () => {
    if (!selected) return;
    setIsGenerating(true);
    setError(null);
    setScriptData(null);
    setGeneratedImage(null);
    setGeneratedAudio(null);
    audioPathRef.current = null;
    imagePathRef.current = null;

    try {
      const { GoogleGenAI, Type, Modality } = await import("@google/genai");
      const ai = new GoogleGenAI({
        apiKey: process.env.NEXT_PUBLIC_GEMINI_API_KEY || "",
      });

      /** Step 1: Script */
      const scriptResponse = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: {
          parts: [{ text: `Nội dung yêu cầu: ${selected.content_original}` }],
        },
        config: {
          systemInstruction: `Bạn là AI chuyên tạo kịch bản video ngắn và bài đăng mạng xã hội (Fanpage).
Nhiệm vụ: Dựa vào NỘI DUNG được cung cấp, hãy tạo kịch bản voice-over cho video ngắn dưới 60 giây VÀ một bài đăng Fanpage kèm theo.
QUAN TRỌNG: TOÀN BỘ NỘI DUNG PHẢI ĐƯỢC VIẾT BẰNG TIẾNG ANH.
Yêu cầu kịch bản video: Giọng điệu tin tức, chuyên nghiệp, 100-130 từ, hook mạnh 3 giây đầu.
Yêu cầu bài đăng Fanpage: Hấp dẫn, có CTA, hashtag, emoji, tuân thủ chính sách Facebook.
Large Title: 2-4 từ gây sốc. Small Title: 4-7 từ bổ sung.`,
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              script: { type: Type.STRING },
              socialPost: { type: Type.STRING },
              largeTitle: { type: Type.STRING },
              smallTitle: { type: Type.STRING },
            },
            required: [
              "title",
              "script",
              "socialPost",
              "largeTitle",
              "smallTitle",
            ],
          },
        },
      });

      const parsedScript = JSON.parse(
        scriptResponse.text || "{}",
      ) as ZTTeamScriptData;
      setScriptData(parsedScript);

      /** Step 2: Image + Audio parallel */
      const promises: Promise<void>[] = [];
      /** Log script generation */
      const scriptUsage = scriptResponse.usageMetadata;
      await ztteam_logApiUsage({
        article_id: selected.id,
        model: "gemini-2.5-flash",
        type: "script",
        input_tokens: scriptUsage?.promptTokenCount || 0,
        output_tokens: scriptUsage?.candidatesTokenCount || 0,
      });

      /** Generate image */
      if (selected.image_original) {
        promises.push(
          (async () => {
            try {
              const imgRes = await fetch(
                `/api/proxy-image?url=${encodeURIComponent(selected.image_original!)}`,
              );
              const imgBlob = await imgRes.blob();
              const base64 = await new Promise<string>((resolve) => {
                const reader = new FileReader();
                reader.onloadend = () =>
                  resolve((reader.result as string).split(",")[1]);
                reader.readAsDataURL(imgBlob);
              });

              const imageResponse = await ai.models.generateContent({
                model: "gemini-2.0-flash-exp-image-generation",
                contents: {
                  parts: [
                    { inlineData: { data: base64, mimeType: imgBlob.type } },
                    {
                      text: `Redraw this image beautifully for a breaking news thumbnail.
- Professional news studio background (blue/red/white theme).
- Remove ALL existing logos, text, watermarks.
- Add breaking news graphic frame.
- Large title: "${parsedScript.largeTitle}"
- Small title: "${parsedScript.smallTitle}"
- Keep text in upper 75% of image, bottom 25% clear for subtitles.
- Square 1:1 aspect ratio, no white borders.`,
                    },
                  ],
                },
                config: {
                  responseModalities: [Modality.IMAGE, Modality.TEXT],
                },
              });

              for (const part of imageResponse.candidates?.[0]?.content
                ?.parts || []) {
                if (part.inlineData) {
                  const base64Image = `data:image/png;base64,${part.inlineData.data}`;
                  setGeneratedImage(base64Image);

                  const saveImgRes = await fetch("/api/save-image", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      imageBase64: base64Image,
                      articleId: selected.id,
                    }),
                  });
                  const saveImgJson = await saveImgRes.json();
                  if (saveImgJson.success) {
                    imagePathRef.current = saveImgJson.imagePath;
                    /** Log image generation */
                    const imgUsage = imageResponse.usageMetadata;
                    await ztteam_logApiUsage({
                      article_id: selected.id,
                      model: "gemini-2.0-flash-exp-image-generation",
                      type: "image",
                      input_tokens: imgUsage?.promptTokenCount || 0,
                      output_tokens: imgUsage?.candidatesTokenCount || 0,
                    });
                  }
                  break;
                }
              }
            } catch (imgErr) {
              console.error("Image generation failed:", imgErr);
            }
          })(),
        );
      }

      /** Generate audio */
      promises.push(
        (async () => {
          const audioResponse = await ai.models.generateContent({
            model: "gemini-2.5-flash-preview-tts",
            contents: [
              {
                parts: [
                  {
                    text: `Say professionally like a news anchor: ${parsedScript.script}`,
                  },
                ],
              },
            ],
            config: {
              responseModalities: [Modality.AUDIO],
              speechConfig: {
                voiceConfig: {
                  prebuiltVoiceConfig: { voiceName: "Zephyr" },
                },
              },
            },
          });

          const base64Audio =
            audioResponse.candidates?.[0]?.content?.parts?.[0]?.inlineData
              ?.data;
          if (base64Audio) {
            const binaryString = window.atob(base64Audio);
            const len = binaryString.length;
            const bytes = new Uint8Array(len);
            for (let i = 0; i < len; i++) {
              bytes[i] = binaryString.charCodeAt(i);
            }

            const sampleRate = 24000;
            const numChannels = 1;
            const bitsPerSample = 16;
            const byteRate = sampleRate * numChannels * (bitsPerSample / 8);
            const blockAlign = numChannels * (bitsPerSample / 8);
            const wavHeader = new ArrayBuffer(44);
            const view = new DataView(wavHeader);

            view.setUint8(0, 0x52);
            view.setUint8(1, 0x49);
            view.setUint8(2, 0x46);
            view.setUint8(3, 0x46);
            view.setUint32(4, 36 + len, true);
            view.setUint8(8, 0x57);
            view.setUint8(9, 0x41);
            view.setUint8(10, 0x56);
            view.setUint8(11, 0x45);
            view.setUint8(12, 0x66);
            view.setUint8(13, 0x6d);
            view.setUint8(14, 0x74);
            view.setUint8(15, 0x20);
            view.setUint32(16, 16, true);
            view.setUint16(20, 1, true);
            view.setUint16(22, numChannels, true);
            view.setUint32(24, sampleRate, true);
            view.setUint32(28, byteRate, true);
            view.setUint16(32, blockAlign, true);
            view.setUint16(34, bitsPerSample, true);
            view.setUint8(36, 0x64);
            view.setUint8(37, 0x61);
            view.setUint8(38, 0x74);
            view.setUint8(39, 0x61);
            view.setUint32(40, len, true);

            const blob = new Blob([wavHeader, bytes], { type: "audio/wav" });
            const audioUrl = URL.createObjectURL(blob);
            if (audioRef.current) URL.revokeObjectURL(audioRef.current);
            audioRef.current = audioUrl;
            setGeneratedAudio(audioUrl);

            const saveRes = await fetch("/api/save-audio", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                audioBase64: base64Audio,
                articleId: selected.id,
              }),
            });
            const saveJson = await saveRes.json();
            if (saveJson.success) {
              audioPathRef.current = saveJson.audioPath;
              /** Log audio generation */
              const audioUsage = audioResponse.usageMetadata;
              await ztteam_logApiUsage({
                article_id: selected.id,
                model: "gemini-2.5-flash-preview-tts",
                type: "audio",
                input_tokens: audioUsage?.promptTokenCount || 0,
                output_tokens: audioUsage?.candidatesTokenCount || 0,
              });
            }
          }
        })(),
      );

      await Promise.all(promises);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Có lỗi xảy ra");
    } finally {
      setIsGenerating(false);
    }
  };

  /** Lưu vào SQLite */
  const ztteam_handleSave = async () => {
    if (!selected || !scriptData) return;
    setIsSaving(true);
    try {
      const res = await fetch(`/api/queue/${selected.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "update_generated",
          generatedContent: {
            title_new: scriptData.title,
            script: scriptData.script,
            social_post: scriptData.socialPost,
            image_new: imagePathRef.current || generatedImage || null,
            audio_path: audioPathRef.current || null,
          },
        }),
      });
      const json = await res.json();
      if (json.success) {
        setSavedId(selected.id);
        await ztteam_fetchPending();
        setSelected(null);
        setScriptData(null);
        setGeneratedImage(null);
        setGeneratedAudio(null);
      }
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex flex-col gap-8">
      {/** Header */}
      <header>
        <h2 className="text-3xl font-black tracking-tight mb-1">AI Generate</h2>
        <p className="text-slate-400">Chọn bài viết để AI tạo nội dung mới</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/** Cột trái - Danh sách */}
        <div className="lg:col-span-1 bg-slate-900 rounded-xl border border-slate-800 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-800 bg-slate-800/30 flex items-center justify-between">
            <h3 className="font-bold text-sm">Chờ xử lý</h3>
            <span className="text-xs font-bold px-2 py-1 rounded-full text-amber-500 bg-amber-500/10">
              {articles.length} bài
            </span>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12 gap-3">
              <div className="w-5 h-5 border-2 border-slate-700 border-t-[#1337ec] rounded-full animate-spin" />
            </div>
          ) : articles.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 gap-2">
              <span className="material-symbols-outlined text-slate-600 text-4xl">
                check_circle
              </span>
              <p className="text-slate-500 text-xs">Không có bài chờ xử lý</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-800 max-h-[70vh] overflow-y-auto">
              {articles.map((article) => (
                <div
                  key={article.id}
                  onClick={() => ztteam_handleSelect(article)}
                  className={`p-4 flex gap-3 cursor-pointer transition-all ${
                    selected?.id === article.id
                      ? "bg-[#1337ec]/10 border-l-2 border-[#1337ec]"
                      : "hover:bg-slate-800/50 border-l-2 border-transparent"
                  }`}
                >
                  <div className="w-14 h-10 rounded-lg overflow-hidden bg-slate-800 shrink-0">
                    {article.image_original ? (
                      <img
                        src={article.image_original}
                        alt=""
                        className="w-full h-full object-contain"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <span className="material-symbols-outlined text-slate-600 text-xs">
                          image
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold truncate leading-snug">
                      {article.title_original}
                    </p>
                    <span
                      className={`text-xs mt-1 inline-block font-bold ${
                        article.status === "rejected"
                          ? "text-red-400"
                          : "text-amber-400"
                      }`}
                    >
                      {article.status === "rejected" ? "Rejected" : "Pending"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/** Cột phải - Workspace */}
        <div className="lg:col-span-2 flex flex-col gap-5">
          {!selected ? (
            <div className="bg-slate-900 rounded-xl border border-slate-800 border-dashed flex flex-col items-center justify-center py-24 gap-3">
              <span className="material-symbols-outlined text-slate-600 text-5xl">
                touch_app
              </span>
              <p className="text-slate-400 text-sm">Chọn bài viết để bắt đầu</p>
            </div>
          ) : (
            <>
              {/** So sánh ảnh */}
              <ZTTeamCompareRow
                label="Ảnh"
                original={
                  selected.image_original ? (
                    <img
                      src={selected.image_original}
                      alt="Original"
                      className="w-full aspect-video object-contain rounded-lg"
                    />
                  ) : (
                    <div className="w-full aspect-video bg-slate-800 rounded-lg flex items-center justify-center">
                      <span className="material-symbols-outlined text-slate-600">
                        image
                      </span>
                    </div>
                  )
                }
                generated={
                  generatedImage ? (
                    <img
                      src={generatedImage}
                      alt="Generated"
                      className="w-full aspect-video object-contain rounded-lg"
                    />
                  ) : isGenerating ? (
                    <div className="w-full aspect-video bg-slate-800 rounded-lg flex flex-col items-center justify-center gap-2">
                      <div className="w-6 h-6 border-2 border-slate-600 border-t-purple-400 rounded-full animate-spin" />
                      <p className="text-xs text-slate-500">Đang tạo ảnh...</p>
                    </div>
                  ) : (
                    <div className="w-full aspect-video bg-slate-800 rounded-lg flex items-center justify-center">
                      <span className="material-symbols-outlined text-slate-600">
                        auto_awesome
                      </span>
                    </div>
                  )
                }
              />

              {/** So sánh tiêu đề */}
              <ZTTeamCompareRow
                label="Tiêu đề"
                original={
                  <p className="text-sm font-semibold text-slate-300 leading-snug">
                    {selected.title_original}
                  </p>
                }
                generated={
                  scriptData ? (
                    <p className="text-sm font-bold text-white leading-snug">
                      {scriptData.title}
                    </p>
                  ) : (
                    <p className="text-sm text-slate-600 italic">Chưa có</p>
                  )
                }
              />

              {/** Nội dung gốc toggle */}
              <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden">
                <button
                  onClick={() => setShowOriginal(!showOriginal)}
                  className="w-full px-5 py-3 flex items-center justify-between hover:bg-slate-800/50 transition-colors"
                >
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Nội dung gốc
                  </p>
                  <span className="material-symbols-outlined text-slate-500 text-sm">
                    {showOriginal ? "expand_less" : "expand_more"}
                  </span>
                </button>
                {showOriginal && (
                  <div className="px-5 pb-5">
                    {selected.content_html ? (
                      <div
                        className="text-sm text-slate-300 leading-relaxed prose prose-invert prose-img:rounded-xl prose-img:w-full max-w-none max-h-64 overflow-y-auto"
                        dangerouslySetInnerHTML={{
                          __html: selected.content_html,
                        }}
                      />
                    ) : (
                      <p className="text-sm text-slate-300 leading-relaxed max-h-64 overflow-y-auto">
                        {selected.content_original}
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/** Script */}
              <ZTTeamCard title="Script Voice-over" accent={!!scriptData}>
                {scriptData ? (
                  <p className="text-sm text-slate-300 leading-relaxed">
                    {scriptData.script}
                  </p>
                ) : (
                  <p className="text-sm text-slate-600 italic">
                    Chưa có — nhấn Generate
                  </p>
                )}
              </ZTTeamCard>

              {/** Audio */}
              <ZTTeamCard title="Audio" accent={!!generatedAudio}>
                {generatedAudio ? (
                  <audio
                    src={generatedAudio}
                    controls
                    className="w-full accent-[#1337ec]"
                  />
                ) : isGenerating ? (
                  <div className="flex items-center gap-3 py-2">
                    <div className="w-4 h-4 border-2 border-slate-600 border-t-purple-400 rounded-full animate-spin" />
                    <p className="text-xs text-slate-500">Đang tạo audio...</p>
                  </div>
                ) : (
                  <p className="text-sm text-slate-600 italic">
                    Chưa có — nhấn Generate
                  </p>
                )}
              </ZTTeamCard>

              {/** Social Post */}
              <ZTTeamCard title="Social Post" accent={!!scriptData}>
                {scriptData ? (
                  <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-line">
                    {scriptData.socialPost}
                  </p>
                ) : (
                  <p className="text-sm text-slate-600 italic">
                    Chưa có — nhấn Generate
                  </p>
                )}
              </ZTTeamCard>

              {/** Error */}
              {error && (
                <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 text-red-400 text-sm">
                  ⚠️ {error}
                </div>
              )}

              {/** Actions */}
              <div className="flex gap-3">
                <button
                  onClick={ztteam_handleGenerate}
                  disabled={isGenerating}
                  className="flex-1 py-3 bg-gradient-to-r from-[#1337ec] to-purple-600 hover:from-[#1337ec]/90 hover:to-purple-500 disabled:from-slate-800 disabled:to-slate-800 disabled:text-slate-500 text-white rounded-xl font-bold transition-all flex items-center justify-center gap-2 text-sm"
                >
                  {isGenerating ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      AI đang xử lý...
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-sm">
                        auto_awesome
                      </span>
                      {scriptData ? "Generate lại" : "Generate"}
                    </>
                  )}
                </button>

                {scriptData && (
                  <button
                    onClick={ztteam_handleSave}
                    disabled={isSaving}
                    className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 disabled:text-slate-500 text-white rounded-xl font-bold transition-all flex items-center justify-center gap-2 text-sm"
                  >
                    {isSaving ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Đang lưu...
                      </>
                    ) : (
                      <>
                        <span className="material-symbols-outlined text-sm">
                          save
                        </span>
                        Lưu & Review
                      </>
                    )}
                  </button>
                )}
              </div>

              {savedId && (
                <p className="text-center text-sm text-emerald-400 font-semibold">
                  ✓ Đã lưu! Bài đã chuyển sang Review.
                </p>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
