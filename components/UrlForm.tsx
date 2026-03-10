"use client";

import { useState } from "react";
import type { ZTTeamFetchStatus } from "@/types";

interface ZTTeamUrlFormProps {
  onSubmit: (url: string) => void;
  status: ZTTeamFetchStatus;
}

export default function ZTTeamUrlForm({
  onSubmit,
  status,
}: ZTTeamUrlFormProps) {
  const [url, setUrl] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (url.trim()) onSubmit(url.trim());
  };

  const isLoading = status === "loading";

  return (
    <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3">
      <input
        type="url"
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        placeholder="https://example.com/bai-viet/"
        disabled={isLoading}
        className="flex-1 px-4 py-3 rounded-xl border border-gray-700 bg-gray-800 text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
      />
      <button
        type="submit"
        disabled={isLoading || !url.trim()}
        className="px-6 py-3 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white text-sm font-semibold rounded-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
      >
        {isLoading ? "Đang lấy..." : "Lấy dữ liệu"}
      </button>
    </form>
  );
}
