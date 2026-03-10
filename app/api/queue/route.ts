import { NextRequest, NextResponse } from "next/server";
import {
  ztteam_getAllArticles,
  ztteam_insertArticle,
  ztteam_checkUrlExists,
  ztteam_countByStatus,
} from "@/lib/database";

/** GET /api/queue - Lấy tất cả articles + stats */
export async function GET(): Promise<NextResponse> {
  try {
    const articles = ztteam_getAllArticles();
    const stats = ztteam_countByStatus();
    return NextResponse.json({ success: true, data: articles, stats });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Có lỗi xảy ra";
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 },
    );
  }
}

/** POST /api/queue - Thêm article mới vào queue */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json();
    const {
      source_url,
      title_original,
      content_original,
      content_html,
      image_original,
    } = body;

    body;

    if (!source_url || !title_original || !content_original) {
      return NextResponse.json(
        { success: false, error: "Thiếu thông tin bắt buộc" },
        { status: 400 },
      );
    }

    /** Kiểm tra URL đã tồn tại chưa */
    if (ztteam_checkUrlExists(source_url)) {
      return NextResponse.json(
        { success: false, error: "URL này đã có trong queue!" },
        { status: 409 },
      );
    }

    const article = ztteam_insertArticle({
      source_url,
      title_original,
      content_original,
      content_html: content_html || null,
      image_original: image_original || null,
    });

    return NextResponse.json({ success: true, data: article }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Có lỗi xảy ra";
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 },
    );
  }
}
