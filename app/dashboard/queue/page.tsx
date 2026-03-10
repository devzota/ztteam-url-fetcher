"use client";

import { useState, useEffect } from "react";
import type { ZTTeamArticle } from "@/lib/database";

/** Badge status */
function ZTTeamStatusBadge({ status }: { status: string }) {
  const ztteam_statusConfig: Record<string, { label: string; color: string }> =
    {
      pending: { label: "Pending", color: "text-amber-500 bg-amber-500/10" },
      processing: {
        label: "Processing",
        color: "text-blue-500 bg-blue-500/10",
      },
      ready: { label: "Ready", color: "text-purple-500 bg-purple-500/10" },
      approved: {
        label: "Approved",
        color: "text-emerald-500 bg-emerald-500/10",
      },
      rejected: { label: "Rejected", color: "text-red-500 bg-red-500/10" },
      done: { label: "Done", color: "text-slate-400 bg-slate-800" },
    };
  const config = ztteam_statusConfig[status] ?? {
    label: status,
    color: "text-slate-400 bg-slate-800",
  };
  return (
    <span
      className={`text-xs font-bold px-2 py-1 rounded-full ${config.color}`}
    >
      {config.label}
    </span>
  );
}

/** Modal xem chi tiết */
function ZTTeamArticleModal({
  article,
  onClose,
  onDelete,
}: {
  article: ZTTeamArticle;
  onClose: () => void;
  onDelete: (id: number) => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/** Modal Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <ZTTeamStatusBadge status={article.status} />
            <span className="text-xs text-slate-500 font-mono">
              #{article.id}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                onDelete(article.id);
                onClose();
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
            >
              <span className="material-symbols-outlined text-sm">delete</span>
              Xóa
            </button>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
            >
              <span className="material-symbols-outlined text-sm">close</span>
            </button>
          </div>
        </div>

        {/** Modal Body */}
        <div className="overflow-y-auto flex-1 p-6 flex flex-col gap-6">
          {/** Ảnh + Tiêu đề */}
          <div className="flex gap-4">
            {article.image_original && (
              <img
                src={article.image_original}
                alt={article.title_original || ""}
                className="w-40 h-28 object-contain rounded-xl shrink-0"
              />
            )}
            <div className="flex flex-col gap-2 flex-1 min-w-0">
              <p className="text-lg font-black leading-snug">
                {article.title_original || "Chưa có tiêu đề"}
              </p>
              <a
                href={article.source_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-[#1337ec] hover:underline truncate"
              >
                {article.source_url}
              </a>
              <p className="text-xs text-slate-500">
                {new Date(article.created_at).toLocaleString("vi-VN")}
              </p>
            </div>
          </div>

          {/** Nội dung gốc */}
          {(article.content_html || article.content_original) && (
            <div className="flex flex-col gap-2">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Nội dung gốc
              </p>
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 text-sm text-slate-300 leading-relaxed max-h-64 overflow-y-auto prose prose-invert prose-img:rounded-xl prose-img:w-full prose-a:text-[#1337ec] max-w-none">
                {article.content_html ? (
                  <div
                    dangerouslySetInnerHTML={{ __html: article.content_html }}
                  />
                ) : (
                  article.content_original
                )}
              </div>
            </div>
          )}

          {/** Nội dung AI (nếu có) */}
          {article.title_new && (
            <div className="flex flex-col gap-2">
              <p className="text-xs font-bold text-purple-400 uppercase tracking-wider">
                Tiêu đề mới
              </p>
              <p className="text-sm font-bold text-white">
                {article.title_new}
              </p>
            </div>
          )}

          {article.script && (
            <div className="flex flex-col gap-2">
              <p className="text-xs font-bold text-purple-400 uppercase tracking-wider">
                Script
              </p>
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 text-sm text-slate-300 leading-relaxed max-h-48 overflow-y-auto">
                {article.script}
              </div>
            </div>
          )}

          {article.social_post && (
            <div className="flex flex-col gap-2">
              <p className="text-xs font-bold text-purple-400 uppercase tracking-wider">
                Social Post
              </p>
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 text-sm text-slate-300 leading-relaxed">
                {article.social_post}
              </div>
            </div>
          )}

          {/** Ảnh mới + Audio */}
          {(article.image_new || article.audio_path) && (
            <div className="flex flex-col gap-3">
              {article.image_new && (
                <div className="flex flex-col gap-2">
                  <p className="text-xs font-bold text-purple-400 uppercase tracking-wider">
                    Ảnh mới
                  </p>
                  <img
                    src={article.image_new}
                    alt="Generated"
                    className="rounded-xl max-h-48 object-contain"
                  />
                </div>
              )}
              {article.audio_path && (
                <div className="flex flex-col gap-2">
                  <p className="text-xs font-bold text-purple-400 uppercase tracking-wider">
                    Audio
                  </p>
                  <audio
                    src={article.audio_path}
                    controls
                    className="w-full accent-[#1337ec]"
                  />
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ZTTeamQueuePage() {
  const [articles, setArticles] = useState<ZTTeamArticle[]>([]);
  const [stats, setStats] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");
  const [deleting, setDeleting] = useState<number | null>(null);
  const [selected, setSelected] = useState<ZTTeamArticle | null>(null);

  /** Fetch danh sách articles */
  const ztteam_fetchArticles = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/queue");
      const json = await res.json();
      if (json.success) {
        setArticles(json.data);
        setStats(json.stats);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    ztteam_fetchArticles();
  }, []);

  /** Xóa article */
  const ztteam_handleDelete = async (id: number) => {
    setDeleting(id);
    try {
      await fetch(`/api/queue/${id}`, { method: "DELETE" });
      await ztteam_fetchArticles();
    } finally {
      setDeleting(null);
    }
  };

  /** Filter articles */
  const filteredArticles =
    filter === "all" ? articles : articles.filter((a) => a.status === filter);

  const ztteam_filterTabs = [
    { key: "all", label: "Tất cả", count: articles.length },
    { key: "pending", label: "Pending", count: stats.pending || 0 },
    { key: "processing", label: "Processing", count: stats.processing || 0 },
    { key: "ready", label: "Ready", count: stats.ready || 0 },
    { key: "approved", label: "Approved", count: stats.approved || 0 },
    { key: "done", label: "Done", count: stats.done || 0 },
  ];

  return (
    <div className="flex flex-col gap-8">
      {/** Header */}
      <header className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-black tracking-tight mb-1">Queue</h2>
          <p className="text-slate-400">Danh sách bài viết trong pipeline</p>
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
      <div className="flex items-center gap-2 flex-wrap">
        {ztteam_filterTabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
              filter === tab.key
                ? "bg-[#1337ec] text-white"
                : "bg-slate-800 text-slate-400 hover:text-slate-100"
            }`}
          >
            {tab.label}
            <span
              className={`text-xs px-1.5 py-0.5 rounded-full ${
                filter === tab.key ? "bg-white/20" : "bg-slate-700"
              }`}
            >
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/** Table */}
      <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-800 bg-slate-800/30 flex items-center justify-between">
          <h3 className="font-bold">Danh sách bài viết</h3>
          <p className="text-sm text-slate-400">
            {filteredArticles.length} bài
          </p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16 gap-3">
            <div className="w-6 h-6 border-2 border-slate-700 border-t-[#1337ec] rounded-full animate-spin" />
            <p className="text-sm text-slate-400">Đang tải...</p>
          </div>
        ) : filteredArticles.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <span className="material-symbols-outlined text-slate-600 text-5xl">
              inbox
            </span>
            <p className="text-slate-400 text-sm">Chưa có bài viết nào</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-800">
            {filteredArticles.map((article) => (
              <div
                key={article.id}
                onClick={() => setSelected(article)}
                className="p-5 flex gap-4 hover:bg-slate-800/30 transition-colors cursor-pointer"
              >
                {/** Ảnh */}
                <div className="w-20 h-14 rounded-lg overflow-hidden bg-slate-800 shrink-0">
                  {article.image_original ? (
                    <img
                      src={article.image_original}
                      alt={article.title_original || ""}
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

                {/** Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-4 mb-1">
                    <p className="text-sm font-bold truncate">
                      {article.title_original || "Chưa có tiêu đề"}
                    </p>
                    <ZTTeamStatusBadge status={article.status} />
                  </div>
                  <a
                    href={article.source_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="text-xs text-slate-400 hover:text-[#1337ec] transition-colors truncate block"
                  >
                    {article.source_url}
                  </a>
                  <p className="text-xs text-slate-500 mt-1">
                    {new Date(article.created_at).toLocaleString("vi-VN")}
                  </p>
                </div>

                {/** Delete button */}
                <div className="flex items-center shrink-0">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      ztteam_handleDelete(article.id);
                    }}
                    disabled={deleting === article.id}
                    className="p-2 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors disabled:opacity-50"
                  >
                    {deleting === article.id ? (
                      <div className="w-4 h-4 border-2 border-slate-600 border-t-red-400 rounded-full animate-spin" />
                    ) : (
                      <span className="material-symbols-outlined text-sm">
                        delete
                      </span>
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/** Modal chi tiết */}
      {selected && (
        <ZTTeamArticleModal
          article={selected}
          onClose={() => setSelected(null)}
          onDelete={ztteam_handleDelete}
        />
      )}
    </div>
  );
}
