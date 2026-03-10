"use client";

import Image from "next/image";
import { useState } from "react";
import type { ZTTeamFetchResult } from "@/types";

interface ZTTeamResultCardProps {
  data: ZTTeamFetchResult;
}

/** Copy text vào clipboard */
async function ztteam_copyToClipboard(text: string): Promise<void> {
  await navigator.clipboard.writeText(text);
}

/** Convert ảnh sang PNG qua Canvas rồi copy vào clipboard */
async function ztteam_copyImageUrl(url: string): Promise<void> {
  const proxyUrl = `/api/proxy-image?url=${encodeURIComponent(url)}`;

  const img = new window.Image();
  img.crossOrigin = "anonymous";

  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = () => reject(new Error("Không thể tải ảnh"));
    img.src = proxyUrl;
  });

  const canvas = document.createElement("canvas");
  canvas.width = img.naturalWidth;
  canvas.height = img.naturalHeight;

  const ctx = canvas.getContext("2d");
  ctx?.drawImage(img, 0, 0);

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((b) => {
      if (b) resolve(b);
      else reject(new Error("Không thể convert ảnh"));
    }, "image/png");
  });

  await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
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

export default function ZTTeamResultCard({ data }: ZTTeamResultCardProps) {
  return (
    <div className="flex flex-col gap-6">
      {/** Ảnh đại diện */}
      {data.image && (
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
              Ảnh đại diện
            </span>
            <ZTTeamCopyButton
              onCopy={() => ztteam_copyImageUrl(data.image!)}
              label="Copy ảnh"
            />
          </div>
          <div className="relative w-full h-64 rounded-xl overflow-hidden bg-gray-800">
            <Image
              src={data.image}
              alt={data.title}
              fill
              className="object-cover"
              unoptimized
            />
          </div>
        </div>
      )}

      {/** Title */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
            Tiêu đề
          </span>
          <ZTTeamCopyButton
            onCopy={() => ztteam_copyToClipboard(data.title)}
            label="Copy tiêu đề"
          />
        </div>
        <h2 className="text-xl font-bold text-white leading-snug">
          {data.title}
        </h2>
      </div>

      {/** Nội dung */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
            Nội dung
          </span>
          <ZTTeamCopyButton
            onCopy={() => ztteam_copyToClipboard(data.content)}
            label="Copy nội dung"
          />
        </div>
        <div className="bg-gray-800 rounded-xl p-5 max-h-96 overflow-y-auto">
          <div className="flex flex-col gap-4">
            {data.content
              .split("\n")
              .filter((line) => line.trim() !== "")
              .map((line, index) => (
                <p
                  key={index}
                  className="text-sm text-gray-300 leading-relaxed"
                >
                  {line.trim()}
                </p>
              ))}
          </div>
        </div>
      </div>
    </div>
  );
}
