import { NextRequest, NextResponse } from "next/server";
import {
  ztteam_getArticleById,
  ztteam_updateVideoInfo,
  ztteam_updateStatus,
} from "@/lib/database";
import fs from "fs";
import path from "path";
import { spawn } from "child_process";

const ZTTEAM_VIDEO_MAKER_PATH = "D:\\ztteam-video-maker";

/** Lấy số thứ tự tiếp theo trong thư mục ngày */
function ztteam_getNextIndex(dayFolder: string): number {
  const inputDay = path.join(ZTTEAM_VIDEO_MAKER_PATH, "input", dayFolder);
  if (!fs.existsSync(inputDay)) return 1;
  const existing = fs
    .readdirSync(inputDay)
    .filter((f) => fs.statSync(path.join(inputDay, f)).isDirectory());
  return existing.length + 1;
}

/** Format ngày: DD-MM-YY */
function ztteam_getDayFolder(): string {
  const now = new Date();
  const d = String(now.getDate()).padStart(2, "0");
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const y = String(now.getFullYear()).slice(-2);
  return `${d}-${m}-${y}`;
}

/** POST /api/create-video */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const { id } = await request.json();
    if (!id) {
      return NextResponse.json(
        { success: false, error: "Thiếu article ID" },
        { status: 400 },
      );
    }

    const article = ztteam_getArticleById(id);
    if (!article) {
      return NextResponse.json(
        { success: false, error: "Không tìm thấy bài viết" },
        { status: 404 },
      );
    }

    if (!article.audio_path) {
      return NextResponse.json(
        { success: false, error: "Không có audio" },
        { status: 400 },
      );
    }

    const imagePath = article.image_new || article.image_original;
    if (!imagePath) {
      return NextResponse.json(
        { success: false, error: "Không có ảnh" },
        { status: 400 },
      );
    }

    /** Tạo thư mục input */
    const dayFolder = ztteam_getDayFolder();
    const index = ztteam_getNextIndex(dayFolder);
    const jobFolder = path.join(
      ZTTEAM_VIDEO_MAKER_PATH,
      "input",
      dayFolder,
      String(index),
    );
    fs.mkdirSync(jobFolder, { recursive: true });

    /** Copy ảnh */
    const srcImage = path.join(
      process.cwd(),
      "public",
      imagePath.split("?")[0],
    );
    fs.copyFileSync(srcImage, path.join(jobFolder, "1.png"));

    /** Copy audio */
    const srcAudio = path.join(process.cwd(), "public", article.audio_path);
    fs.copyFileSync(srcAudio, path.join(jobFolder, "1.wav"));

    /** Lưu video_folder vào DB */
    const videoFolder = `${dayFolder}/${index}`;
    ztteam_updateVideoInfo(id, { video_folder: videoFolder });
    ztteam_updateStatus(id, "processing");

    /** Spawn Python background */
    const inputDir = path.join(ZTTEAM_VIDEO_MAKER_PATH, "input", dayFolder);
    const outputDir = path.join(ZTTEAM_VIDEO_MAKER_PATH, "output", dayFolder);
    fs.mkdirSync(outputDir, { recursive: true });

    const batchContent = `@echo off
cd /d "${ZTTEAM_VIDEO_MAKER_PATH}"
call .venv\\Scripts\\activate
python main.py --input "${inputDir}" --output "${outputDir}" --workers 1
`;

    const batchPath = path.join(ZTTEAM_VIDEO_MAKER_PATH, "run-video.bat");
    fs.writeFileSync(batchPath, batchContent, "utf8");

    const python = spawn(
      "C:\\Windows\\System32\\cmd.exe",
      ["/c", "start", "/b", batchPath],
      {
        detached: true,
        stdio: "ignore",
        cwd: ZTTEAM_VIDEO_MAKER_PATH,
      },
    );
    python.unref();

    return NextResponse.json({
      success: true,
      data: {
        videoFolder,
        index,
        dayFolder,
        outputPath: path.join(outputDir, `${index}.mp4`),
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
