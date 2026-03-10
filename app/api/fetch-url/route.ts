import { NextRequest, NextResponse } from "next/server";
import { ztteam_fetchUrlData } from "@/lib/fetcher";
import type { ZTTeamApiResponse } from "@/types";

/** POST /api/fetch-url */
export async function POST(
  request: NextRequest,
): Promise<NextResponse<ZTTeamApiResponse>> {
  try {
    const body = await request.json();
    const { url } = body;

    if (!url || typeof url !== "string") {
      return NextResponse.json(
        { success: false, error: "Vui lòng nhập URL hợp lệ" },
        { status: 400 },
      );
    }

    const data = await ztteam_fetchUrlData(url);

    return NextResponse.json({ success: true, data }, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Có lỗi xảy ra";
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 },
    );
  }
}
