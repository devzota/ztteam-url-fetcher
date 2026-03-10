"use client";

import { useState, useRef, useCallback } from "react";

/** Trạng thái từng URL */
type ZTTeamUrlStatus = "waiting" | "fetching" | "done" | "duplicate" | "error";

interface ZTTeamUrlItem {
  url: string;
  status: ZTTeamUrlStatus;
  message?: string;
  title?: string;
}

/** Status Badge */
function ZTTeamUrlStatusBadge({ item }: { item: ZTTeamUrlItem }) {
  const ztteam_config = {
    waiting: { icon: "pause_circle", color: "text-slate-400", label: "Chờ" },
    fetching: { icon: "sync", color: "text-blue-400", label: "Đang fetch..." },
    done: { icon: "check_circle", color: "text-emerald-400", label: "Đã lưu" },
    duplicate: {
      icon: "content_copy",
      color: "text-amber-400",
      label: "Trùng URL",
    },
    error: { icon: "error", color: "text-red-400", label: "Lỗi" },
  };

  const config = ztteam_config[item.status];

  return (
    <div className={`flex items-center gap-1.5 ${config.color}`}>
      <span
        className={`material-symbols-outlined text-sm ${item.status === "fetching" ? "animate-spin" : ""}`}
      >
        {config.icon}
      </span>
      <span className="text-xs font-medium">
        {item.status === "done" && item.title ? item.title : config.label}
        {item.status === "error" && item.message ? ` — ${item.message}` : ""}
      </span>
    </div>
  );
}

export default function ZTTeamUrlsPage() {
  const [input, setInput] = useState("");
  const [urlItems, setUrlItems] = useState<ZTTeamUrlItem[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [stats, setStats] = useState({
    total: 0,
    done: 0,
    error: 0,
    duplicate: 0,
  });
  const pauseRef = useRef(false);
  const stopRef = useRef(false);

  /** Parse URLs từ textarea */
  const ztteam_parseUrls = (text: string): string[] => {
    return text
      .split("\n")
      .map((url) => url.trim())
      .filter((url) => url.length > 0 && url.startsWith("http"));
  };

  /** Update trạng thái 1 URL */
  const ztteam_updateItem = useCallback(
    (url: string, update: Partial<ZTTeamUrlItem>) => {
      setUrlItems((prev) =>
        prev.map((item) => (item.url === url ? { ...item, ...update } : item)),
      );
    },
    [],
  );

  /** Fetch 1 URL */
  const ztteam_fetchOne = async (url: string): Promise<void> => {
    ztteam_updateItem(url, { status: "fetching" });

    try {
      const res = await fetch("/api/fetch-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      const json = await res.json();

      if (!json.success) {
        ztteam_updateItem(url, { status: "error", message: json.error });
        return;
      }

      /** Lưu vào queue */
      const saveRes = await fetch("/api/queue", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          source_url: json.data.url,
          title_original: json.data.title,
          content_original: json.data.content,
          content_html: json.data.contentHtml,
          image_original: json.data.image,
        }),
      });
      const saveJson = await saveRes.json();

      if (saveJson.success) {
        ztteam_updateItem(url, {
          status: "done",
          title: json.data.title,
        });
        setStats((prev) => ({ ...prev, done: prev.done + 1 }));
      } else if (saveRes.status === 409) {
        ztteam_updateItem(url, { status: "duplicate" });
        setStats((prev) => ({ ...prev, duplicate: prev.duplicate + 1 }));
      } else {
        ztteam_updateItem(url, { status: "error", message: saveJson.error });
        setStats((prev) => ({ ...prev, error: prev.error + 1 }));
      }
    } catch {
      ztteam_updateItem(url, { status: "error", message: "Không thể kết nối" });
      setStats((prev) => ({ ...prev, error: prev.error + 1 }));
    }
  };

  /** Chạy với delay giữa các request */
  const ztteam_runQueue = async (urls: string[], limit?: number) => {
    const targets = limit ? urls.slice(0, limit) : urls;
    stopRef.current = false;
    pauseRef.current = false;
    setIsRunning(true);
    setIsPaused(false);

    for (const url of targets) {
      if (stopRef.current) break;

      /** Chờ nếu đang pause */
      while (pauseRef.current) {
        await new Promise((r) => setTimeout(r, 500));
        if (stopRef.current) break;
      }

      if (stopRef.current) break;

      await ztteam_fetchOne(url);

      /** Delay 2.5s giữa các request */
      if (!stopRef.current) {
        await new Promise((r) => setTimeout(r, 2500));
      }
    }

    setIsRunning(false);
    setIsPaused(false);
  };

  /** Validate + init items */
  const ztteam_initItems = (limit?: number) => {
    const urls = ztteam_parseUrls(input);
    if (urls.length === 0) return null;

    const targets = limit ? urls.slice(0, limit) : urls;
    const items: ZTTeamUrlItem[] = targets.map((url) => ({
      url,
      status: "waiting",
    }));

    setUrlItems(items);
    setStats({ total: targets.length, done: 0, error: 0, duplicate: 0 });
    return targets;
  };

  /** Test 3 bài */
  const ztteam_handleTest = () => {
    const urls = ztteam_initItems(3);
    if (urls) ztteam_runQueue(urls, 3);
  };

  /** Chạy tất cả */
  const ztteam_handleAll = () => {
    const urls = ztteam_initItems();
    if (urls) ztteam_runQueue(urls);
  };

  /** Pause / Resume */
  const ztteam_handlePause = () => {
    pauseRef.current = !pauseRef.current;
    setIsPaused(pauseRef.current);
  };

  /** Stop */
  const ztteam_handleStop = () => {
    stopRef.current = true;
    pauseRef.current = false;
    setIsRunning(false);
    setIsPaused(false);
  };

  const urlCount = ztteam_parseUrls(input).length;

  return (
    <div className="flex flex-col gap-8">
      {/** Header */}
      <header>
        <h2 className="text-3xl font-black tracking-tight mb-1">URL Input</h2>
        <p className="text-slate-400">
          Nhập danh sách URL để cào nội dung vào pipeline
        </p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
        {/** Cột trái - Input */}
        <div className="flex flex-col gap-4">
          <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-800 bg-slate-800/30 flex items-center justify-between">
              <h3 className="font-bold">Danh sách URL</h3>
              {urlCount > 0 && (
                <span className="text-xs font-bold px-2 py-1 rounded-full text-blue-400 bg-blue-500/10">
                  {urlCount} URLs
                </span>
              )}
            </div>
            <div className="p-4">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={`https://example.com/bai-viet-1\nhttps://example.com/bai-viet-2\nhttps://example.com/bai-viet-3`}
                disabled={isRunning}
                rows={12}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4 text-sm text-slate-300 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-[#1337ec]/50 focus:border-[#1337ec] transition-all resize-none disabled:opacity-50 font-mono"
              />
            </div>
          </div>

          {/** Buttons */}
          <div className="flex items-center gap-3">
            {!isRunning ? (
              <>
                <button
                  onClick={ztteam_handleTest}
                  disabled={urlCount === 0}
                  className="flex items-center gap-2 px-5 py-3 bg-amber-500 hover:bg-amber-400 disabled:bg-slate-800 disabled:text-slate-500 text-white font-bold rounded-xl transition-all text-sm"
                >
                  <span className="material-symbols-outlined text-sm">
                    science
                  </span>
                  Test 3 bài
                </button>
                <button
                  onClick={ztteam_handleAll}
                  disabled={urlCount === 0}
                  className="flex items-center gap-2 px-5 py-3 bg-[#1337ec] hover:bg-[#1337ec]/90 disabled:bg-slate-800 disabled:text-slate-500 text-white font-bold rounded-xl transition-all text-sm"
                >
                  <span className="material-symbols-outlined text-sm">
                    play_arrow
                  </span>
                  Chạy tất cả ({urlCount})
                </button>
                {urlItems.length > 0 && (
                  <button
                    onClick={() => {
                      setUrlItems([]);
                      setStats({ total: 0, done: 0, error: 0, duplicate: 0 });
                    }}
                    className="flex items-center gap-2 px-4 py-3 bg-slate-800 hover:bg-slate-700 text-slate-400 font-bold rounded-xl transition-all text-sm"
                  >
                    <span className="material-symbols-outlined text-sm">
                      clear_all
                    </span>
                    Xóa
                  </button>
                )}
              </>
            ) : (
              <>
                <button
                  onClick={ztteam_handlePause}
                  className={`flex items-center gap-2 px-5 py-3 font-bold rounded-xl transition-all text-sm ${
                    isPaused
                      ? "bg-emerald-600 hover:bg-emerald-500 text-white"
                      : "bg-amber-500 hover:bg-amber-400 text-white"
                  }`}
                >
                  <span className="material-symbols-outlined text-sm">
                    {isPaused ? "play_arrow" : "pause"}
                  </span>
                  {isPaused ? "Resume" : "Pause"}
                </button>
                <button
                  onClick={ztteam_handleStop}
                  className="flex items-center gap-2 px-5 py-3 bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 text-red-400 font-bold rounded-xl transition-all text-sm"
                >
                  <span className="material-symbols-outlined text-sm">
                    stop
                  </span>
                  Stop
                </button>
              </>
            )}
          </div>
        </div>

        {/** Cột phải - Runtime Info */}
        <div className="flex flex-col gap-4">
          {/** Stats */}
          {urlItems.length > 0 && (
            <div className="grid grid-cols-4 gap-3">
              {[
                { label: "Tổng", value: stats.total, color: "text-white" },
                { label: "Done", value: stats.done, color: "text-emerald-400" },
                { label: "Lỗi", value: stats.error, color: "text-red-400" },
                {
                  label: "Trùng",
                  value: stats.duplicate,
                  color: "text-amber-400",
                },
              ].map((stat) => (
                <div
                  key={stat.label}
                  className="bg-slate-900 rounded-xl border border-slate-800 p-4 text-center"
                >
                  <p className={`text-2xl font-black ${stat.color}`}>
                    {stat.value}
                  </p>
                  <p className="text-xs text-slate-400 mt-1">{stat.label}</p>
                </div>
              ))}
            </div>
          )}

          {/** Runtime list */}
          <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-800 bg-slate-800/30 flex items-center justify-between">
              <h3 className="font-bold">Runtime Info</h3>
              {isRunning && (
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-xs text-emerald-400 font-medium">
                    {isPaused ? "Paused" : "Running..."}
                  </span>
                </div>
              )}
            </div>

            {urlItems.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3">
                <span className="material-symbols-outlined text-slate-600 text-5xl">
                  terminal
                </span>
                <p className="text-slate-400 text-sm">Chưa có gì để hiển thị</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-800 max-h-[500px] overflow-y-auto">
                {urlItems.map((item, index) => (
                  <div
                    key={index}
                    className="px-5 py-3 flex items-center gap-3"
                  >
                    <span className="text-xs text-slate-600 font-mono w-5 shrink-0">
                      {index + 1}
                    </span>
                    <p className="text-xs text-slate-400 truncate flex-1 font-mono">
                      {item.url}
                    </p>
                    <div className="shrink-0">
                      <ZTTeamUrlStatusBadge item={item} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
