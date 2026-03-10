import { NextRequest, NextResponse } from "next/server";
import {
  ztteam_insertApiLog,
  ztteam_getApiStats,
  ztteam_getRecentApiLogs,
  ztteam_resetApiLogs,
} from "@/lib/database";

/** Giá USD per 1M tokens — cập nhật từ ai.google.dev/gemini-api/docs/pricing ngày 10/03/2026 */
const ZTTEAM_PRICING: Record<
  string,
  { input: number; output: number; note?: string }
> = {
  /** gemini-2.5-flash: $0.30 input / $2.50 output per 1M tokens */
  "gemini-2.5-flash": { input: 0.3, output: 2.5 },

  /** gemini-2.0-flash-exp-image-generation: $0.30 input / $30 per 1M output tokens
   * Mỗi ảnh output (~1290 tokens) = $0.039/ảnh
   * Dùng giá per-token để tính tổng quát */
  "gemini-2.0-flash-exp-image-generation": {
    input: 0.3,
    output: 30.0,
    note: "image",
  },

  /** gemini-2.5-flash-preview-tts: $0.50 input text / $10.00 output audio per 1M tokens */
  "gemini-2.5-flash-preview-tts": { input: 0.5, output: 10.0, note: "tts" },
};

/** GET /api/api-logs — Lấy stats + recent logs */
export async function GET(): Promise<NextResponse> {
  try {
    const stats = ztteam_getApiStats();
    const recent = ztteam_getRecentApiLogs(20);
    return NextResponse.json({ success: true, stats, recent });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Có lỗi xảy ra";
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 },
    );
  }
}

/** POST /api/api-logs — Ghi log mới */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json();
    const { article_id, model, type, input_tokens, output_tokens } = body;

    if (!model || !type) {
      return NextResponse.json(
        { success: false, error: "Thiếu model hoặc type" },
        { status: 400 },
      );
    }

    /** Tính cost */
    const pricing = ZTTEAM_PRICING[model] || { input: 0.1, output: 0.4 };
    const cost_usd =
      ((input_tokens || 0) * pricing.input +
        (output_tokens || 0) * pricing.output) /
      1_000_000;

    ztteam_insertApiLog({
      article_id: article_id || null,
      model,
      type,
      input_tokens: input_tokens || 0,
      output_tokens: output_tokens || 0,
      cost_usd,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Có lỗi xảy ra";
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 },
    );
  }
}

/** DELETE /api/api-logs — Reset logs */
export async function DELETE(): Promise<NextResponse> {
  try {
    ztteam_resetApiLogs();
    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Có lỗi xảy ra";
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 },
    );
  }
}
