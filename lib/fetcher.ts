import * as cheerio from "cheerio";
import { Readability } from "@mozilla/readability";
import { parseHTML } from "linkedom";

import {
  ztteam_validateUrl,
  ztteam_sanitizeUrl,
  ztteam_extractDomain,
} from "./validator";
import type { ZTTeamFetchResult } from "@/types";

async function ztteam_fetchHtml(url: string): Promise<string> {
  const response = await fetch(url, {
    signal: AbortSignal.timeout(8000),
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
      Accept:
        "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
      "Accept-Language": "en-US,en;q=0.9",
      "Accept-Encoding": "gzip, deflate, br",
      "Cache-Control": "no-cache",
      Pragma: "no-cache",
      "Sec-Fetch-Dest": "document",
      "Sec-Fetch-Mode": "navigate",
      "Sec-Fetch-Site": "none",
      "Sec-Fetch-User": "?1",
      "Upgrade-Insecure-Requests": "1",
    },
  });

  if (!response.ok) {
    throw new Error(`HTTP Error: ${response.status}`);
  }

  return response.text();
}

/** Extract OG image từ HTML */
function ztteam_extractOgImage($: cheerio.Root): string | null {
  return (
    $('meta[property="og:image"]').attr("content") ||
    $('meta[name="twitter:image"]').attr("content") ||
    null
  );
}

/** Extract site name từ HTML */
function ztteam_extractSiteName($: cheerio.Root): string | null {
  return $('meta[property="og:site_name"]').attr("content") || null;
}

/** Parse nội dung sạch bằng Mozilla Readability */
function ztteam_parseReadability(
  html: string,
  url: string,
): {
  title: string;
  content: string;
  contentHtml: string;
  excerpt: string;
} {
  const { document } = parseHTML(html);
  document.baseURI ?? url;
  const reader = new Readability(document as unknown as Document);
  const article = reader.parse();

  if (!article) {
    throw new Error("Không thể parse nội dung bài viết");
  }

  return {
    title: article.title || "",
    content:
      article.textContent
        ?.replace(/\t/g, " ")
        .replace(/[ ]{2,}/g, " ")
        .replace(/\. ([A-Z])/g, ".\n\n$1")
        .replace(/([.!?])\s+([A-Z])/g, "$1\n\n$2")
        .trim() || "",
    contentHtml: article.content || "",
    excerpt: article.excerpt || "",
  };
}

/** Main function: fetch và parse toàn bộ dữ liệu từ URL */
export async function ztteam_fetchUrlData(
  rawUrl: string,
): Promise<ZTTeamFetchResult> {
  const url = ztteam_sanitizeUrl(rawUrl);

  if (!ztteam_validateUrl(url)) {
    throw new Error("URL không hợp lệ");
  }

  const html = await ztteam_fetchHtml(url);
  const $ = cheerio.load(html);

  const image = ztteam_extractOgImage($);
  const siteName = ztteam_extractSiteName($);
  const { title, content, contentHtml, excerpt } = ztteam_parseReadability(
    html,
    url,
  );

  return {
    title,
    image,
    content,
    contentHtml,
    excerpt,
    siteName: siteName || ztteam_extractDomain(url),
    url,
  };
}
