"use client";

import { useState, useEffect } from "react";
import type { ZTTeamArticle } from "@/lib/database";

/** Card so sánh trong list — lướt qua thấy ngay */
function ZTTeamReviewCard({
  article,
  isSelected,
  onClick,
}: {
  article: ZTTeamArticle;
  isSelected: boolean;
  onClick: () => void;
}) {
  return (
    <div
      onClick={onClick}
      className={`p-4 cursor-pointer transition-all border-l-2 ${
        isSelected
          ? "bg-[#1337ec]/10 border-[#1337ec]"
          : "hover:bg-slate-800/50 border-transparent"
      }`}
    >
      {/** So sánh ảnh nhỏ */}
      <div className="grid grid-cols-2 gap-2 mb-3">
        <div className="flex flex-col gap-1">
          <p className="text-xs text-slate-500">Gốc</p>
          <div className="aspect-video rounded-lg overflow-hidden bg-slate-800">
            {article.image_original ? (
              <img
                src={article.image_original}
                alt="Original"
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
        </div>
        <div className="flex flex-col gap-1">
          <p className="text-xs text-purple-400">AI mới</p>
          <div className="aspect-video rounded-lg overflow-hidden bg-slate-800">
            {article.image_new ? (
              <img
                src={article.image_new}
                alt="Generated"
                className="w-full h-full object-contain"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <span className="material-symbols-outlined text-slate-600 text-xs">
                  hide_image
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/** Tiêu đề mới */}
      <p className="text-xs font-semibold text-white leading-snug truncate">
        {article.title_new || article.title_original}
      </p>
      <p className="text-xs text-slate-500 mt-1">
        {new Date(article.updated_at).toLocaleString("vi-VN")}
      </p>
    </div>
  );
}

export default function ZTTeamReviewPage() {
  const [articles, setArticles] = useState<ZTTeamArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<number | null>(null);
  const [selected, setSelected] = useState<ZTTeamArticle | null>(null);
  const [publishStatus, setPublishStatus] = useState<
    "idle" | "loading" | "success" | "error"
  >("idle");
  const [publishError, setPublishError] = useState<string | null>(null);
  const [isRegeneratingImage, setIsRegeneratingImage] = useState(false);
  const [regenImageError, setRegenImageError] = useState<string | null>(null);
  const [publishResult, setPublishResult] = useState<{
    id: number;
    link: string;
    editLink: string;
  } | null>(null);

  /** Fetch ready articles */
  const ztteam_fetchReady = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/queue");
      const json = await res.json();
      if (json.success) {
        const ready = json.data.filter(
          (a: ZTTeamArticle) => a.status === "ready",
        );
        setArticles(ready);
        if (ready.length > 0 && !selected) {
          setSelected(ready[0]);
        } else if (selected) {
          /** Cập nhật selected nếu đang xem bài vừa update */
          const updated = ready.find(
            (a: ZTTeamArticle) => a.id === selected.id,
          );
          if (updated) {
            setSelected({
              ...updated,
              image_new: updated.image_new
                ? `${updated.image_new}?t=${Date.now()}`
                : null,
            });
          }
        }
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    ztteam_fetchReady();
  }, []);

  /** Reset publish state khi chọn bài khác */
  const ztteam_handleSelect = (article: ZTTeamArticle) => {
    setSelected(article);
    setPublishStatus("idle");
    setPublishError(null);
    setPublishResult(null);
  };
  /** Tạo lại ảnh mới từ ảnh gốc — không generate lại script/audio */
  const ztteam_handleRegenImage = async () => {
    if (!selected?.image_original) return;
    setIsRegeneratingImage(true);
    setRegenImageError(null);

    try {
      const { GoogleGenAI, Modality } = await import("@google/genai");
      const ai = new GoogleGenAI({
        apiKey: process.env.NEXT_PUBLIC_GEMINI_API_KEY || "",
      });

      /** Fetch ảnh gốc qua proxy */
      const imgRes = await fetch(
        `/api/proxy-image?url=${encodeURIComponent(selected.image_original)}`,
      );
      const imgBlob = await imgRes.blob();
      const base64 = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () =>
          resolve((reader.result as string).split(",")[1]);
        reader.readAsDataURL(imgBlob);
      });

      /** Generate ảnh mới */
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
- Title: "${selected.title_new || selected.title_original}"
- Keep text in upper 75% of image, bottom 25% clear for subtitles.
- Square 1:1 aspect ratio, no white borders.`,
            },
          ],
        },
        config: {
          responseModalities: [Modality.IMAGE, Modality.TEXT],
        },
      });

      /** Lấy base64 ảnh mới */
      let newImageBase64: string | null = null;
      for (const part of imageResponse.candidates?.[0]?.content?.parts || []) {
        if (part.inlineData) {
          newImageBase64 = `data:image/png;base64,${part.inlineData.data}`;
          break;
        }
      }

      if (!newImageBase64) {
        setRegenImageError("Không tạo được ảnh mới");
        return;
      }

      /** Lưu ảnh xuống file */
      const saveRes = await fetch("/api/save-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageBase64: newImageBase64,
          articleId: selected.id,
        }),
      });
      const saveJson = await saveRes.json();

      if (!saveJson.success) {
        setRegenImageError("Không lưu được ảnh");
        return;
      }

      /** Log API usage */
      const imgUsage = imageResponse.usageMetadata;
      await fetch("/api/api-logs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          article_id: selected.id,
          model: "gemini-2.0-flash-exp-image-generation",
          type: "image_regen",
          input_tokens: imgUsage?.promptTokenCount || 0,
          output_tokens: imgUsage?.candidatesTokenCount || 0,
        }),
      });

      /** Cập nhật image_new trong DB */
      await fetch(`/api/queue/${selected.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "update_generated",
          generatedContent: {
            image_new: saveJson.imagePath,
          },
        }),
      });
      /** Refresh list + cập nhật selected */
      const refreshRes = await fetch("/api/queue");
      const refreshJson = await refreshRes.json();
      if (refreshJson.success) {
        const ready = refreshJson.data.filter(
          (a: ZTTeamArticle) => a.status === "ready",
        );
        setArticles(ready);
        const updated = ready.find((a: ZTTeamArticle) => a.id === selected.id);
        if (updated) {
          setSelected({
            ...updated,
            image_new: updated.image_new
              ? `${updated.image_new}?t=${Date.now()}`
              : null,
          });
        }
      }
    } catch (err) {
      setRegenImageError(err instanceof Error ? err.message : "Có lỗi xảy ra");
    } finally {
      setIsRegeneratingImage(false);
    }
  };

  /** Chỉ Approve — chưa đăng WP */
  const ztteam_handleApprove = async () => {
    if (!selected) return;
    setProcessing(selected.id);
    try {
      await fetch(`/api/queue/${selected.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "update_status", status: "approved" }),
      });
      await ztteam_fetchReady();
      setSelected(null);
    } finally {
      setProcessing(null);
    }
  };

  /** Đăng lên WordPress */
  const ztteam_handlePublishWP = async () => {
    if (!selected) return;
    setProcessing(selected.id);
    setPublishStatus("loading");
    setPublishError(null);

    try {
      const wpRes = await fetch("/api/publish-wp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: selected.title_new || selected.title_original,
          content: selected.content_html || selected.content_original || "",
          featuredImageUrl: selected.image_new || selected.image_original,
          sourceUrl: selected.source_url,
        }),
      });
      const wpJson = await wpRes.json();

      if (!wpJson.success) {
        setPublishStatus("error");
        setPublishError(wpJson.error || "Không thể đăng lên WordPress");
        return;
      }

      setPublishStatus("success");
      setPublishResult(wpJson.data);

      /** Cập nhật status → done sau khi đăng WP */
      await fetch(`/api/queue/${selected.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "update_status", status: "done" }),
      });

      await ztteam_fetchReady();
      setSelected(null);
    } finally {
      setProcessing(null);
    }
  };

  /** Reject */
  const ztteam_handleReject = async () => {
    if (!selected) return;
    setProcessing(selected.id);
    try {
      await fetch(`/api/queue/${selected.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "update_status", status: "rejected" }),
      });
      await ztteam_fetchReady();
      setSelected(null);
    } finally {
      setProcessing(null);
    }
  };

  return (
    <div className="flex flex-col gap-8">
      {/** Header */}
      <header>
        <h2 className="text-3xl font-black tracking-tight mb-1">Review</h2>
        <p className="text-slate-400">
          Kiểm tra nội dung AI — Approve để tự động đăng WordPress
        </p>
      </header>

      {loading ? (
        <div className="flex items-center justify-center py-16 gap-3">
          <div className="w-6 h-6 border-2 border-slate-700 border-t-[#1337ec] rounded-full animate-spin" />
          <p className="text-sm text-slate-400">Đang tải...</p>
        </div>
      ) : articles.length === 0 ? (
        <div className="bg-slate-900 rounded-xl border border-slate-800 flex flex-col items-center justify-center py-16 gap-3">
          <span className="material-symbols-outlined text-slate-600 text-5xl">
            rate_review
          </span>
          <p className="text-slate-400 text-sm">Chưa có bài nào cần review</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          {/** Cột trái - List có preview so sánh */}
          <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-800 bg-slate-800/30 flex items-center justify-between">
              <h3 className="font-bold text-sm">Chờ review</h3>
              <span className="text-xs font-bold px-2 py-1 rounded-full text-purple-400 bg-purple-500/10">
                {articles.length} bài
              </span>
            </div>
            <div className="divide-y divide-slate-800 max-h-[80vh] overflow-y-auto">
              {articles.map((article) => (
                <ZTTeamReviewCard
                  key={article.id}
                  article={article}
                  isSelected={selected?.id === article.id}
                  onClick={() => ztteam_handleSelect(article)}
                />
              ))}
            </div>
          </div>

          {/** Cột phải - Detail */}
          {selected ? (
            <div className="lg:col-span-2 flex flex-col gap-5">
              {/** So sánh ảnh lớn */}
              <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden">
                <div className="px-5 py-3 border-b border-slate-800 bg-slate-800/30 flex items-center justify-between">
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    So sánh ảnh
                  </p>
                  <button
                    onClick={ztteam_handleRegenImage}
                    disabled={isRegeneratingImage}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 border border-purple-500/20 rounded-lg transition-all disabled:opacity-50"
                  >
                    {isRegeneratingImage ? (
                      <>
                        <div className="w-3 h-3 border-2 border-purple-400/30 border-t-purple-400 rounded-full animate-spin" />
                        Đang tạo...
                      </>
                    ) : (
                      <>
                        <span className="material-symbols-outlined text-sm">
                          refresh
                        </span>
                        Tạo ảnh lại
                      </>
                    )}
                  </button>
                </div>
                <div className="p-5 grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-2">
                    <p className="text-xs font-semibold text-slate-500">
                      Ảnh gốc
                    </p>
                    <div className="aspect-video rounded-xl overflow-hidden bg-slate-800">
                      {selected.image_original ? (
                        <img
                          src={selected.image_original}
                          alt="Original"
                          className="w-full h-full object-contain"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <span className="material-symbols-outlined text-slate-600">
                            image
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col gap-2">
                    <p className="text-xs font-semibold text-purple-400">
                      Ảnh AI mới
                    </p>
                    <div className="aspect-video rounded-xl overflow-hidden bg-slate-800">
                      {selected.image_new ? (
                        <img
                          src={selected.image_new}
                          alt="Generated"
                          className="w-full h-full object-contain"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center gap-2">
                          <span className="material-symbols-outlined text-slate-600">
                            hide_image
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/** So sánh tiêu đề */}
              <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden">
                <div className="px-5 py-3 border-b border-slate-800 bg-slate-800/30">
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    So sánh tiêu đề
                  </p>
                </div>
                <div className="grid grid-cols-2 divide-x divide-slate-800">
                  <div className="p-4">
                    <p className="text-xs font-semibold text-slate-500 mb-2">
                      Gốc
                    </p>
                    <p className="text-sm text-slate-300 leading-snug">
                      {selected.title_original}
                    </p>
                  </div>
                  <div className="p-4">
                    <p className="text-xs font-semibold text-purple-400 mb-2">
                      AI mới
                    </p>
                    <p className="text-sm font-bold text-white leading-snug">
                      {selected.title_new}
                    </p>
                  </div>
                </div>
              </div>

              {/** Script */}
              <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden">
                <div className="px-5 py-3 border-b border-slate-800 bg-slate-800/30">
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Script Voice-over
                  </p>
                </div>
                <div className="p-5">
                  <p className="text-sm text-slate-300 leading-relaxed">
                    {selected.script}
                  </p>
                </div>
              </div>

              {/** Audio */}
              {selected.audio_path && (
                <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden">
                  <div className="px-5 py-3 border-b border-slate-800 bg-slate-800/30">
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                      Audio
                    </p>
                  </div>
                  <div className="p-5">
                    <audio
                      src={selected.audio_path}
                      controls
                      className="w-full accent-[#1337ec]"
                    />
                  </div>
                </div>
              )}

              {/** Social Post */}
              <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden">
                <div className="px-5 py-3 border-b border-slate-800 bg-slate-800/30">
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Social Post
                  </p>
                </div>
                <div className="p-5">
                  <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-line">
                    {selected.social_post}
                  </p>
                </div>
              </div>

              {/** Publish result */}
              {publishStatus === "success" && publishResult && (
                <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-emerald-400">
                      check_circle
                    </span>
                    <p className="text-sm text-emerald-400 font-semibold">
                      Đã đăng lên WordPress!
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <a
                      href={publishResult.editLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-slate-400 hover:text-white transition-colors"
                    >
                      Chỉnh sửa
                    </a>
                    <a
                      href={publishResult.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-emerald-400 hover:text-emerald-300 transition-colors font-semibold"
                    >
                      Xem bài →
                    </a>
                  </div>
                </div>
              )}
              {regenImageError && (
                <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 flex items-center gap-2">
                  <span className="material-symbols-outlined text-red-400 text-sm">
                    error
                  </span>
                  <p className="text-sm text-red-400">{regenImageError}</p>
                </div>
              )}
              {publishStatus === "error" && publishError && (
                <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 flex items-center gap-2">
                  <span className="material-symbols-outlined text-red-400 text-sm">
                    error
                  </span>
                  <p className="text-sm text-red-400">{publishError}</p>
                </div>
              )}

              {/** Action Buttons */}
              <div className="flex flex-col gap-3">
                {/** Row 1: Reject + Approve */}
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={ztteam_handleReject}
                    disabled={!!processing}
                    className="py-3 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 font-bold rounded-xl transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {processing === selected.id ? (
                      <div className="w-4 h-4 border-2 border-red-400/30 border-t-red-400 rounded-full animate-spin" />
                    ) : (
                      <>
                        <span className="material-symbols-outlined text-sm">
                          close
                        </span>
                        Reject
                      </>
                    )}
                  </button>
                  <button
                    onClick={ztteam_handleApprove}
                    disabled={!!processing}
                    className="py-3 bg-slate-700 hover:bg-slate-600 text-white font-bold rounded-xl transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {processing === selected.id ? (
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <>
                        <span className="material-symbols-outlined text-sm">
                          check
                        </span>
                        Approve
                      </>
                    )}
                  </button>
                </div>

                {/** Row 2: Đăng WP + Tạo video */}
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={ztteam_handlePublishWP}
                    disabled={!!processing}
                    className="py-3 bg-[#1337ec] hover:bg-[#1337ec]/90 text-white font-bold rounded-xl transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {publishStatus === "loading" ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Đang đăng...
                      </>
                    ) : (
                      <>
                        <span className="material-symbols-outlined text-sm">
                          language
                        </span>
                        Đăng WordPress
                      </>
                    )}
                  </button>
                  <button
                    disabled={true}
                    className="py-3 bg-emerald-600/20 border border-emerald-500/20 text-emerald-500/50 font-bold rounded-xl transition-all flex items-center justify-center gap-2 cursor-not-allowed"
                  >
                    <span className="material-symbols-outlined text-sm">
                      movie
                    </span>
                    Tạo video
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="lg:col-span-2 bg-slate-900 rounded-xl border border-slate-800 border-dashed flex flex-col items-center justify-center py-24 gap-3">
              <span className="material-symbols-outlined text-slate-600 text-5xl">
                touch_app
              </span>
              <p className="text-slate-400 text-sm">Chọn bài để xem chi tiết</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
