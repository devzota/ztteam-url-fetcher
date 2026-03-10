"use client";

import { useState, useEffect } from "react";
import type { ZTTeamArticle } from "@/lib/database";

/** Download file từ base64 hoặc URL */
async function ztteam_downloadFile(
  url: string,
  filename: string,
): Promise<void> {
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
}

export default function ZTTeamVideoPage() {
  const [articles, setArticles] = useState<ZTTeamArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<ZTTeamArticle | null>(null);
  const [filter, setFilter] = useState<"approved" | "done">("approved");

  /** Fetch approved + done articles */
  const ztteam_fetchArticles = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/queue");
      const json = await res.json();
      if (json.success) {
        const filtered = json.data.filter(
          (a: ZTTeamArticle) => a.status === "approved" || a.status === "done",
        );
        setArticles(filtered);
        if (filtered.length > 0 && !selected) {
          setSelected(filtered[0]);
        }
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    ztteam_fetchArticles();
  }, []);

  /** Mark as done */
  const ztteam_markDone = async (id: number) => {
    await fetch(`/api/queue/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "update_status", status: "done" }),
    });
    await ztteam_fetchArticles();
  };

  const filteredArticles = articles.filter((a) => a.status === filter);

  return (
    <div className="flex flex-col gap-8">
      {/** Header */}
      <header className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-black tracking-tight mb-1">Video</h2>
          <p className="text-slate-400">
            Danh sách bài đã approve, sẵn sàng tạo video
          </p>
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
              {articles.filter((a) => a.status === tab).length}
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
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          {/** Cột trái - Danh sách */}
          <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-800 bg-slate-800/30">
              <h3 className="font-bold">Danh sách</h3>
            </div>
            <div className="divide-y divide-slate-800 max-h-[700px] overflow-y-auto">
              {filteredArticles.map((article) => (
                <div
                  key={article.id}
                  onClick={() => setSelected(article)}
                  className={`p-4 flex gap-3 cursor-pointer transition-colors ${
                    selected?.id === article.id
                      ? "bg-[#1337ec]/10 border-l-2 border-[#1337ec]"
                      : "hover:bg-slate-800/50"
                  }`}
                >
                  {/** Ảnh */}
                  <div className="w-14 h-14 rounded-lg overflow-hidden bg-slate-800 shrink-0">
                    {article.image_new ? (
                      <img
                        src={article.image_new}
                        alt={article.title_new || ""}
                        className="w-full h-full object-contain"
                      />
                    ) : article.image_original ? (
                      <img
                        src={article.image_original}
                        alt={article.title_original || ""}
                        className="w-full h-full object-contain"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <span className="material-symbols-outlined text-slate-600 text-sm">
                          image
                        </span>
                      </div>
                    )}
                  </div>

                  {/** Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-white truncate">
                      {article.title_new || article.title_original}
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {new Date(article.updated_at).toLocaleString("vi-VN")}
                    </p>
                    <span
                      className={`text-xs font-bold mt-1 inline-block ${
                        article.status === "done"
                          ? "text-emerald-400"
                          : "text-amber-400"
                      }`}
                    >
                      {article.status === "done" ? "✓ Done" : "⏳ Approved"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/** Cột phải - Detail */}
          {selected && (
            <div className="lg:col-span-2 flex flex-col gap-5">
              {/** Ảnh + Download */}
              <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden">
                <div className="px-5 py-4 border-b border-slate-800 bg-slate-800/30 flex items-center justify-between">
                  <h3 className="font-bold">Ảnh thumbnail</h3>
                  {selected.image_new && (
                    <button
                      onClick={() =>
                        ztteam_downloadFile(
                          selected.image_new!,
                          `ztteam-thumbnail-${selected.id}.png`,
                        )
                      }
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-semibold transition-colors"
                    >
                      <span className="material-symbols-outlined text-sm">
                        download
                      </span>
                      Tải ảnh
                    </button>
                  )}
                </div>
                <div className="p-5">
                  <div className="aspect-video rounded-xl overflow-hidden bg-slate-800">
                    {selected.image_new ? (
                      <img
                        src={selected.image_new}
                        alt="Thumbnail"
                        className="w-full h-full object-contain"
                      />
                    ) : selected.image_original ? (
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
              </div>

              {/** Nội dung cho Python app */}
              <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden">
                <div className="px-5 py-4 border-b border-slate-800 bg-slate-800/30 flex items-center justify-between">
                  <h3 className="font-bold">Dữ liệu cho Python App</h3>
                  <button
                    onClick={() => {
                      const data = JSON.stringify(
                        {
                          id: selected.id,
                          title: selected.title_new,
                          script: selected.script,
                          social_post: selected.social_post,
                          image_new: selected.image_new,
                          audio_path: selected.audio_path,
                        },
                        null,
                        2,
                      );
                      navigator.clipboard.writeText(data);
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-semibold transition-colors"
                  >
                    <span className="material-symbols-outlined text-sm">
                      content_copy
                    </span>
                    Copy JSON
                  </button>
                </div>
                <div className="p-5 flex flex-col gap-4">
                  {/** Title */}
                  <div>
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                      Tiêu đề
                    </p>
                    <p className="text-sm font-bold text-white">
                      {selected.title_new || selected.title_original}
                    </p>
                  </div>

                  {/** Script */}
                  <div>
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                      Script
                    </p>
                    <p className="text-sm text-slate-300 leading-relaxed bg-slate-800 rounded-xl p-4">
                      {selected.script}
                    </p>
                  </div>

                  {/** Social Post */}
                  <div>
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                      Social Post
                    </p>
                    <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-line bg-slate-800 rounded-xl p-4">
                      {selected.social_post}
                    </p>
                  </div>
                </div>
              </div>

              {/** Mark Done button */}
              {selected.status === "approved" && (
                <button
                  onClick={() => ztteam_markDone(selected.id)}
                  className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl transition-all flex items-center justify-center gap-2"
                >
                  <span className="material-symbols-outlined">done_all</span>
                  <span>Đánh dấu hoàn thành</span>
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
