/** Kết quả trả về sau khi fetch URL */
export interface ZTTeamFetchResult {
  title: string;
  image: string | null;
  content: string;
  contentHtml: string;
  excerpt: string;
  siteName: string | null;
  url: string;
}

/** Response từ API route */
export interface ZTTeamApiResponse {
  success: boolean;
  data?: ZTTeamFetchResult;
  error?: string;
}

/** Trạng thái của form */
export type ZTTeamFetchStatus = "idle" | "loading" | "success" | "error";
