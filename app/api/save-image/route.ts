import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

/** POST /api/save-image - Lưu file ảnh xuống disk */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json();
    const { imageBase64, articleId } = body;

    if (!imageBase64 || !articleId) {
      return NextResponse.json(
        { success: false, error: "Thiếu dữ liệu" },
        { status: 400 },
      );
    }

    /** Tạo thư mục nếu chưa có */
    const imageDir = path.join(process.cwd(), "public", "images");
    await mkdir(imageDir, { recursive: true });

    /** Bỏ prefix data:image/png;base64, nếu có */
    const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, "");

    /** Lưu file */
    const filename = `ztteam-image-${articleId}-${Date.now()}.png`;
    const filepath = path.join(imageDir, filename);
    const buffer = Buffer.from(base64Data, "base64");
    await writeFile(filepath, buffer);

    return NextResponse.json({
      success: true,
      imagePath: `/images/${filename}`,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Có lỗi xảy ra";
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 },
    );
  }
}
