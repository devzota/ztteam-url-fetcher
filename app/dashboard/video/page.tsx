"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import type { ZTTeamArticle } from "@/lib/database";

/** Copy text to clipboard */
async function ztteam_copyText(text: string): Promise<void> {
  await navigator.clipboard.writeText(text);
}

/** Format social post với Readmore link */
function ztteam_formatSocialPost(
  socialPost: string,
  wpLink: string | null,
): string {
  if (!wpLink || !socialPost) return socialPost || "";
  const sentences = socialPost.split("\n");
  if (sentences.length === 0) return socialPost;
  /** Chèn Readmore sau câu đầu tiên */
  sentences.splice(1, 0, `\nReadmore: ${wpLink}\n`);
  return sentences.join("\n");
}

export default function ZTTeamVideoPage() {
  const [articles, setArticles] = useState<ZTTeamArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<ZTTeamArticle | null>(null);
  const [filter, setFilter] = useState<"approved" | "done">("approved");
  const [isCreatingVideo, setIsCreatingVideo] = useState(false);
  const [videoError, setVideoError] = useState<string | null>(null);
  const [pollingId, setPollingId] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);
  const [markingDone, setMarkingDone] = useState(false);
  const pollingRef = useRef<NodeJS.Timeout | null>(null);

  /** Fetch articles */
  const ztteam_fetchArticles = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/queue");
      const json = await res.json();
      if (json.success) {
        const filtered = json.data.filter(
          (a: ZTTeamArticle) =>
            a.status === "approved" ||
            a.status === "processing" ||
            a.status === "done",
        );
        setArticles(filtered);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    ztteam_fetchArticles();
  }, [ztteam_fetchArticles]);

  /** Polling check video status */
  const ztteam_startPolling = useCallback(
    (id: number) => {
      setPollingId(id);
      pollingRef.current = setInterval(async () => {
        try {
          const res = await fetch(`/api/video-status?id=${id}`);
          const json = await res.json();
          if (json.success && json.data.ready) {
            /** Video xong — dừng polling + refresh */
            if (pollingRef.current) clearInterval(pollingRef.current);
            setPollingId(null);
            setIsCreatingVideo(false);
            await ztteam_fetchArticles();
            /** Cập nhật selected */
            const refreshRes = await fetch("/api/queue");
            const refreshJson = await refreshRes.json();
            if (refreshJson.success) {
              const updated = refreshJson.data.find(
                (a: ZTTeamArticle) => a.id === id,
              );
              if (updated) setSelected(updated);
            }
          }
        } catch {
          /** Polling lỗi thì bỏ qua */
        }
      }, 5000);
    },
    [ztteam_fetchArticles],
  );

  useEffect(() => {
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, []);

  /** Tạo video */
  const ztteam_handleCreateVideo = async () => {
    if (!selected) return;
    setIsCreatingVideo(true);
    setVideoError(null);

    try {
      const res = await fetch("/api/create-video", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: selected.id }),
      });
      const json = await res.json();

      if (!json.success) {
        setVideoError(json.error);
        setIsCreatingVideo(false);
        return;
      }

      /** Bắt đầu polling */
      ztteam_startPolling(selected.id);
    } catch (err) {
      setVideoError(err instanceof Error ? err.message : "Có lỗi xảy ra");
      setIsCreatingVideo(false);
    }
  };

  /** Copy social post */
  const ztteam_handleCopySocialPost = async () => {
    if (!selected) return;
    const text = ztteam_formatSocialPost(
      selected.social_post || "",
      selected.wp_link,
    );
    await ztteam_copyText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  /** Xác nhận đã đăng Fanpage */
  const ztteam_handleFanpageDone = async () => {
    if (!selected) return;
    setMarkingDone(true);
    try {
      await fetch(`/api/queue/${selected.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "update_status", status: "done" }),
      });
      await ztteam_fetchArticles();
      setSelected(null);
    } finally {
      setMarkingDone(false);
    }
  };

  const filteredArticles = articles.filter((a) =>
    filter === "approved"
      ? a.status === "approved" || a.status === "processing"
      : a.status === "done",
  );

  return (
    <div className="flex flex-col gap-8">
      {/** Header */}
      <header className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-black tracking-tight mb-1">Video</h2>
          <p className="text-slate-400">Tạo video và đăng Fanpage</p>
        </div>
        <button
          onClick={ztteam_fetchArticles}
          className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-sm font-semibold transition-colors"
        >
          <span className="material-symbols-outlined text-sm">refresh</span>
          Refresh
        </button>
      </header>

      {/** Filter Tabs */}
      <div className="flex items-center gap-2">
        {(["approved", "done"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setFilter(tab)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
              filter === tab
                ? "bg-[#1337ec] text-white"
                : "bg-slate-800 text-slate-400 hover:text-slate-100"
            }`}
          >
            {tab === "approved" ? "Chờ tạo video" : "Đã hoàn thành"}
            <span
              className={`text-xs px-1.5 py-0.5 rounded-full ${
                filter === tab ? "bg-white/20" : "bg-slate-700"
              }`}
            >
              {
                articles.filter((a) =>
                  tab === "approved"
                    ? a.status === "approved" || a.status === "processing"
                    : a.status === "done",
                ).length
              }
            </span>
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16 gap-3">
          <div className="w-6 h-6 border-2 border-slate-700 border-t-[#1337ec] rounded-full animate-spin" />
          <p className="text-sm text-slate-400">Đang tải...</p>
        </div>
      ) : filteredArticles.length === 0 ? (
        <div className="bg-slate-900 rounded-xl border border-slate-800 flex flex-col items-center justify-center py-16 gap-3">
          <span className="material-symbols-outlined text-slate-600 text-5xl">
            movie
          </span>
          <p className="text-slate-400 text-sm">
            {filter === "approved"
              ? "Chưa có bài nào chờ tạo video"
              : "Chưa có video nào hoàn thành"}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          {/** Cột trái */}
          <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-800 bg-slate-800/30">
              <h3 className="font-bold text-sm">Danh sách</h3>
            </div>
            <div className="divide-y divide-slate-800 max-h-[70vh] overflow-y-auto">
              {filteredArticles.map((article) => (
                <div
                  key={article.id}
                  onClick={() => {
                    setSelected(article);
                    setVideoError(null);
                  }}
                  className={`p-4 flex gap-3 cursor-pointer transition-all border-l-2 ${
                    selected?.id === article.id
                      ? "bg-[#1337ec]/10 border-[#1337ec]"
                      : "hover:bg-slate-800/50 border-transparent"
                  }`}
                >
                  <div className="w-14 h-10 rounded-lg overflow-hidden bg-slate-800 shrink-0">
                    {article.image_new || article.image_original ? (
                      <img
                        src={article.image_new || article.image_original || ""}
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
                    <p className="text-xs font-semibold text-white truncate leading-snug">
                      {article.title_new || article.title_original}
                    </p>
                    <div className="flex items-center gap-1.5 mt-1">
                      {article.status === "processing" ? (
                        <div className="flex items-center gap-1">
                          <div className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
                          <span className="text-xs text-blue-400 font-bold">
                            Đang tạo...
                          </span>
                        </div>
                      ) : article.video_path ? (
                        <span className="text-xs text-emerald-400 font-bold">
                          ✓ Video sẵn sàng
                        </span>
                      ) : article.status === "done" ? (
                        <span className="text-xs text-emerald-400 font-bold">
                          ✓ Done
                        </span>
                      ) : (
                        <span className="text-xs text-amber-400 font-bold">
                          ⏳ Chưa có video
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/** Cột phải - Detail */}
          {selected ? (
            <div className="lg:col-span-2 flex flex-col gap-5">
              {/** Ảnh + Tiêu đề — title là link tới source */}
              <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden">
                <div className="p-5 flex gap-4">
                  <div className="w-32 h-24 rounded-xl overflow-hidden bg-slate-800 shrink-0">
                    {(selected.image_new || selected.image_original) && (
                      <img
                        src={
                          selected.image_new || selected.image_original || ""
                        }
                        alt=""
                        className="w-full h-full object-contain"
                      />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <a
                      href={selected.source_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-base font-black text-white hover:text-[#1337ec] leading-snug mb-1 block transition-colors"
                    >
                      {selected.title_new || selected.title_original}
                    </a>
                  </div>
                </div>
              </div>

              {/** Video status */}
              {selected.status === "processing" || pollingId === selected.id ? (
                <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-5 flex items-center gap-4">
                  <div className="w-8 h-8 border-2 border-blue-400/30 border-t-blue-400 rounded-full animate-spin shrink-0" />
                  <div>
                    <p className="text-sm font-bold text-blue-400">
                      Đang tạo video...
                    </p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Tự động cập nhật sau mỗi 5 giây
                    </p>
                  </div>
                </div>
              ) : selected.video_path ? (
                <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-5">
                  <div className="flex items-center gap-3">
                    <span className="material-symbols-outlined text-emerald-400">
                      movie
                    </span>
                    <div>
                      <p className="text-sm font-bold text-emerald-400">
                        Video đã sẵn sàng!
                      </p>
                      <p className="text-xs text-slate-400 font-mono mt-0.5 break-all">
                        {selected.video_path}
                      </p>
                    </div>
                  </div>
                </div>
              ) : null}

              {/** Link WP */}
              {selected.wp_link && (
                <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden">
                  <div className="px-5 py-3 border-b border-slate-800 bg-slate-800/30">
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                      Link bài đã đăng WordPress
                    </p>
                  </div>
                  <div className="p-4">
                    <a
                      href={selected.wp_link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-[#1337ec] hover:underline break-all"
                    >
                      {selected.wp_link}
                    </a>
                  </div>
                </div>
              )}

              {/** Social Post */}
              <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden">
                <div className="px-5 py-3 border-b border-slate-800 bg-slate-800/30 flex items-center justify-between">
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Nội dung đăng Fanpage
                  </p>
                  <button
                    onClick={ztteam_handleCopySocialPost}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      copied
                        ? "bg-emerald-500/20 text-emerald-400"
                        : "bg-slate-800 hover:bg-slate-700 text-slate-300"
                    }`}
                  >
                    <span className="material-symbols-outlined text-sm">
                      {copied ? "check" : "content_copy"}
                    </span>
                    {copied ? "Đã copy!" : "Copy"}
                  </button>
                </div>
                <div className="p-5">
                  <pre className="text-sm text-slate-300 leading-relaxed whitespace-pre-wrap font-sans">
                    {ztteam_formatSocialPost(
                      selected.social_post || "",
                      selected.wp_link,
                    )}
                  </pre>
                </div>
              </div>

              {/** Error */}
              {videoError && (
                <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 flex items-center gap-2">
                  <span className="material-symbols-outlined text-red-400 text-sm">
                    error
                  </span>
                  <p className="text-sm text-red-400">{videoError}</p>
                </div>
              )}

              {/** Action buttons */}
              <div className="flex flex-col gap-3">
                {/** Tạo video — chỉ hiện khi chưa có video */}
                {!selected.video_path && selected.status !== "processing" && (
                  <button
                    onClick={ztteam_handleCreateVideo}
                    disabled={isCreatingVideo}
                    className="w-full py-3 bg-gradient-to-r from-[#1337ec] to-purple-600 hover:from-[#1337ec]/90 hover:to-purple-500 disabled:from-slate-800 disabled:to-slate-800 disabled:text-slate-500 text-white font-bold rounded-xl transition-all flex items-center justify-center gap-2"
                  >
                    {isCreatingVideo ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Đang khởi động...
                      </>
                    ) : (
                      <>
                        <span className="material-symbols-outlined text-sm">
                          movie
                        </span>
                        Tạo video
                      </>
                    )}
                  </button>
                )}

                {/** Xác nhận đã đăng Fanpage */}
                {selected.status !== "done" && (
                  <button
                    onClick={ztteam_handleFanpageDone}
                    disabled={markingDone}
                    className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 disabled:text-slate-500 text-white font-bold rounded-xl transition-all flex items-center justify-center gap-2"
                  >
                    {markingDone ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Đang lưu...
                      </>
                    ) : (
                      <>
                        <span className="material-symbols-outlined text-sm">
                          done_all
                        </span>
                        Xác nhận đã đăng Fanpage
                      </>
                    )}
                  </button>
                )}
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
