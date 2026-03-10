import { NextRequest, NextResponse } from "next/server";
import {
  ztteam_getArticleById,
  ztteam_updateVideoInfo,
  ztteam_updateStatus,
} from "@/lib/database";
import fs from "fs";
import path from "path";

const ZTTEAM_VIDEO_MAKER_PATH = "D:\\ztteam-video-maker";

/** GET /api/video-status?id=1 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const id = Number(request.nextUrl.searchParams.get("id"));
    if (!id) {
      return NextResponse.json(
        { success: false, error: "Thiếu ID" },
        { status: 400 },
      );
    }

    const article = ztteam_getArticleById(id);
    if (!article || !article.video_folder) {
      return NextResponse.json(
        { success: false, error: "Không tìm thấy" },
        { status: 404 },
      );
    }

    const parts = article.video_folder.split("/");
    const dayFolder = parts[0];
    const index = parts[1];
    const videoPath = path.join(
      ZTTEAM_VIDEO_MAKER_PATH,
      "output",
      dayFolder,
      `${index}.mp4`,
    );

    const exists = fs.existsSync(videoPath);

    if (
      exists &&
      (article.status === "processing" || article.status === "approved")
    ) {
      /** Cập nhật DB khi video đã xong */
      ztteam_updateVideoInfo(id, { video_path: videoPath });
      ztteam_updateStatus(id, "approved");
    }

    return NextResponse.json({
      success: true,
      data: {
        ready: exists,
        videoPath: exists ? videoPath : null,
        status: article.status,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Có lỗi xảy ra";
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 },
    );
  }
}
