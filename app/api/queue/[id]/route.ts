import { NextRequest, NextResponse } from "next/server";
import db, {
  ztteam_getArticleById,
  ztteam_updateStatus,
  ztteam_updateGeneratedContent,
  ztteam_updateVideoInfo,
} from "@/lib/database";

/** GET /api/queue/[id] - Lấy 1 article */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  try {
    const { id } = await params;
    const article = ztteam_getArticleById(Number(id));

    if (!article) {
      return NextResponse.json(
        { success: false, error: "Không tìm thấy article" },
        { status: 404 },
      );
    }

    return NextResponse.json({ success: true, data: article });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Có lỗi xảy ra";
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 },
    );
  }
}

/** PATCH /api/queue/[id] - Update status hoặc generated content */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  try {
    const { id } = await params;
    const body = await request.json();
    const { action, status, generatedContent } = body;

    const article = ztteam_getArticleById(Number(id));
    if (!article) {
      return NextResponse.json(
        { success: false, error: "Không tìm thấy article" },
        { status: 404 },
      );
    }

    if (action === "update_status" && status) {
      ztteam_updateStatus(Number(id), status);
    }

    if (action === "update_generated" && generatedContent) {
      ztteam_updateGeneratedContent(Number(id), generatedContent);
    }
    if (action === "update_video_info") {
      ztteam_updateVideoInfo(Number(id), {
        wp_link: body.wp_link || null,
      });
    }
    const updated = ztteam_getArticleById(Number(id));
    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Có lỗi xảy ra";
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 },
    );
  }
}
/** DELETE /api/queue/[id] - Xóa article */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  try {
    const { id } = await params;
    const article = ztteam_getArticleById(Number(id));

    if (!article) {
      return NextResponse.json(
        { success: false, error: "Không tìm thấy article" },
        { status: 404 },
      );
    }

    /** Xóa api logs trước để tránh foreign key constraint */
    db.prepare(`DELETE FROM ztteam_api_logs WHERE article_id = ?`).run(
      Number(id),
    );
    /** Xóa article */
    db.prepare(`DELETE FROM ztteam_articles WHERE id = ?`).run(Number(id));

    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Có lỗi xảy ra";
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 },
    );
  }
}
