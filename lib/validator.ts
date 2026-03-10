/** Validate URL đầu vào */
export function ztteam_validateUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:" || parsed.protocol === "http:";
  } catch {
    return false;
  }
}

/** Sanitize URL - loại bỏ các ký tự nguy hiểm */
export function ztteam_sanitizeUrl(url: string): string {
  return url.trim().replace(/[<>"']/g, "");
}

/** Extract domain từ URL */
export function ztteam_extractDomain(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return "";
  }
}
