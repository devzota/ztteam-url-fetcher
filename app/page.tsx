"use client";

import { useState } from "react";
import ZTTeamUrlForm from "@/components/UrlForm";
import type { ZTTeamFetchResult, ZTTeamFetchStatus } from "@/types";

/** Copy text vào clipboard */
async function ztteam_copyToClipboard(text: string): Promise<void> {
  await navigator.clipboard.writeText(text);
}

/** Button copy tái sử dụng */
function ZTTeamCopyButton({
  onCopy,
  label,
}: {
  onCopy: () => Promise<void>;
  label: string;
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await onCopy();
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      onClick={handleCopy}
      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-gray-700 hover:bg-gray-600 active:bg-gray-500 text-gray-300 hover:text-white transition-all duration-200"
    >
      {copied ? (
        <>
          <svg
            className="w-3.5 h-3.5 text-green-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 13l4 4L19 7"
            />
          </svg>
          <span className="text-green-400">Đã copy!</span>
        </>
      ) : (
        <>
          <svg
            className="w-3.5 h-3.5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
            />
          </svg>
          <span>{label}</span>
        </>
      )}
    </button>
  );
}

export default function ZTTeamHome() {
  const [status, setStatus] = useState<ZTTeamFetchStatus>("idle");
  const [result, setResult] = useState<ZTTeamFetchResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [publishStatus, setPublishStatus] = useState<
    "idle" | "loading" | "success" | "error"
  >("idle");
  const [publishResult, setPublishResult] = useState<{
    id: number;
    link: string;
    editLink: string;
  } | null>(null);
  const [publishError, setPublishError] = useState<string | null>(null);

  const handleFetch = async (url: string) => {
    setStatus("loading");
    setResult(null);
    setError(null);

    try {
      const response = await fetch("/api/fetch-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });

      const json = await response.json();

      if (json.success) {
        setResult(json.data);
        setStatus("success");
      } else {
        setError(json.error || "Có lỗi xảy ra");
        setStatus("error");
      }
    } catch {
      setError("Không thể kết nối đến server");
      setStatus("error");
    }
  };
  const handlePublish = async () => {
    if (!result) return;
    setPublishStatus("loading");
    setPublishResult(null);
    setPublishError(null);

    try {
      const response = await fetch("/api/publish-wp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: result.title,
          content: result.contentHtml,
          featuredImageUrl: result.image,
        }),
      });

      const json = await response.json();

      if (json.success) {
        setPublishResult(json.data);
        setPublishStatus("success");
      } else {
        setPublishError(json.error || "Có lỗi xảy ra");
        setPublishStatus("error");
      }
    } catch {
      setPublishError("Không thể kết nối đến server");
      setPublishStatus("error");
    }
  };

  return (
    <main className="min-h-screen bg-gray-900">
      <div className="max-w-7xl mx-auto px-6 py-10 flex flex-col gap-8">
        {/** Header */}
        <div className="text-center flex flex-col gap-2">
          <h1 className="text-3xl font-bold text-white">ZTTeam URL Fetcher</h1>
          <p className="text-sm text-gray-400">
            Nhập URL bài viết để lấy ảnh, tiêu đề và nội dung sạch
          </p>
        </div>

        {/** Form */}
        <div className="max-w-3xl mx-auto w-full">
          <ZTTeamUrlForm onSubmit={handleFetch} status={status} />
        </div>

        {/** Error */}
        {status === "error" && error && (
          <div className="max-w-3xl mx-auto w-full bg-red-900/30 border border-red-800 rounded-xl px-5 py-4 flex items-start gap-3">
            <span className="text-lg">⚠️</span>
            <p className="text-sm text-red-400">{error}</p>
          </div>
        )}

        {/** Loading */}
        {status === "loading" && (
          <div className="flex flex-col items-center justify-center py-16 gap-4">
            <div className="w-8 h-8 border-4 border-gray-600 border-t-blue-500 rounded-full animate-spin" />
            <p className="text-sm text-gray-400">Đang lấy dữ liệu...</p>
          </div>
        )}

        {/** Result - 2 cột */}
        {status === "success" && result && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
            {/** Cột trái - Ảnh + Copy ảnh */}
            <div className="flex flex-col gap-6">
              {/** Ảnh */}
              {result.image && (
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                      Ảnh đại diện
                    </span>
                    <ZTTeamCopyButton
                      onCopy={async () => {
                        const proxyUrl = `/api/proxy-image?url=${encodeURIComponent(result.image!)}`;
                        const img = new window.Image();
                        img.crossOrigin = "anonymous";
                        await new Promise<void>((resolve, reject) => {
                          img.onload = () => resolve();
                          img.onerror = () =>
                            reject(new Error("Không thể tải ảnh"));
                          img.src = proxyUrl;
                        });
                        const canvas = document.createElement("canvas");
                        canvas.width = img.naturalWidth;
                        canvas.height = img.naturalHeight;
                        const ctx = canvas.getContext("2d");
                        ctx?.drawImage(img, 0, 0);
                        const blob = await new Promise<Blob>(
                          (resolve, reject) => {
                            canvas.toBlob((b) => {
                              if (b) resolve(b);
                              else reject(new Error("Không thể convert ảnh"));
                            }, "image/png");
                          },
                        );
                        await navigator.clipboard.write([
                          new ClipboardItem({ "image/png": blob }),
                        ]);
                      }}
                      label="Copy ảnh"
                    />
                  </div>
                  <div className="relative w-full aspect-video rounded-xl overflow-hidden bg-gray-800">
                    <img
                      src={result.image}
                      alt={result.title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                </div>
              )}

              {/** Tiêu đề */}
              <div className="flex flex-col gap-2">
                <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                  Tiêu đề
                </span>
                <h2 className="text-2xl font-bold text-white leading-snug">
                  {result.title}
                </h2>
              </div>
            </div>

            {/** Cột phải - Nội dung */}
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                  Nội dung
                </span>
                <ZTTeamCopyButton
                  onCopy={() =>
                    ztteam_copyToClipboard(
                      `${result.title}\n\n${result.content}`,
                    )
                  }
                  label="Copy tất cả"
                />
              </div>
              <div className="bg-gray-800 rounded-xl p-5 h-[600px] overflow-y-auto flex flex-col gap-4">
                <p className="text-base font-bold text-white leading-snug">
                  {result.title}
                </p>
                <hr className="border-gray-700" />
                <div
                  className="text-sm text-gray-300 leading-relaxed prose prose-invert prose-img:rounded-xl prose-img:w-full max-w-none"
                  dangerouslySetInnerHTML={{ __html: result.contentHtml }}
                />
              </div>
            </div>
            {/** Publish Section */}
            <div className="lg:col-span-2 flex flex-col gap-4">
              <hr className="border-gray-700" />
              <div className="flex items-center gap-4">
                <button
                  onClick={handlePublish}
                  disabled={publishStatus === "loading"}
                  className="flex items-center gap-2 px-6 py-3 bg-green-600 hover:bg-green-500 active:bg-green-700 text-white text-sm font-semibold rounded-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {publishStatus === "loading" ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Đang đăng...</span>
                    </>
                  ) : (
                    <>
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                        />
                      </svg>
                      <span>Đăng lên WordPress</span>
                    </>
                  )}
                </button>

                {/** Publish Success */}
                {publishStatus === "success" && publishResult && (
                  <div className="flex items-center gap-3">
                    <span className="text-green-400 text-sm font-medium">
                      ✓ Đăng thành công!
                    </span>
                    <a
                      href={publishResult.editLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-gray-300 hover:text-white rounded-lg transition-all duration-200"
                    >
                      Chỉnh sửa bài
                    </a>
                    <a
                      href={publishResult.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-gray-300 hover:text-white rounded-lg transition-all duration-200"
                    >
                      Xem bài viết
                    </a>
                  </div>
                )}

                {/** Publish Error */}
                {publishStatus === "error" && publishError && (
                  <p className="text-sm text-red-400">⚠️ {publishError}</p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
