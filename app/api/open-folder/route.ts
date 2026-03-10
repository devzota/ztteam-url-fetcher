import { NextRequest, NextResponse } from "next/server";
import { spawn } from "child_process";
import path from "path";

/** POST /api/open-folder — Mở thư mục trong Explorer */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const { path: filePath } = await request.json();
    if (!filePath) {
      return NextResponse.json(
        { success: false, error: "Thiếu path" },
        { status: 400 },
      );
    }

    /** Normalize path và lấy thư mục cha */
    const normalized = filePath.replace(/\//g, "\\");
    const folder = path.dirname(normalized);

    spawn("explorer.exe", [folder], {
      detached: true,
      stdio: "ignore",
      windowsHide: false,
    }).unref();

    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Có lỗi xảy ra";
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 },
    );
  }
}
