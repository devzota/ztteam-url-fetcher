import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

/** POST /api/save-audio - Lưu file audio xuống disk */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json();
    const { audioBase64, articleId } = body;

    if (!audioBase64 || !articleId) {
      return NextResponse.json(
        { success: false, error: "Thiếu dữ liệu" },
        { status: 400 },
      );
    }

    /** Tạo thư mục nếu chưa có */
    const audioDir = path.join(process.cwd(), "public", "audio");
    await mkdir(audioDir, { recursive: true });

    /** Decode base64 → PCM bytes */
    const pcmBuffer = Buffer.from(audioBase64, "base64");
    const len = pcmBuffer.length;

    /** Tạo WAV header */
    const sampleRate = 24000;
    const numChannels = 1;
    const bitsPerSample = 16;
    const byteRate = sampleRate * numChannels * (bitsPerSample / 8);
    const blockAlign = numChannels * (bitsPerSample / 8);

    const headerBuffer = Buffer.alloc(44);

    /** RIFF */
    headerBuffer.write("RIFF", 0, "ascii");
    headerBuffer.writeUInt32LE(36 + len, 4);
    headerBuffer.write("WAVE", 8, "ascii");

    /** fmt */
    headerBuffer.write("fmt ", 12, "ascii");
    headerBuffer.writeUInt32LE(16, 16);
    headerBuffer.writeUInt16LE(1, 20);
    headerBuffer.writeUInt16LE(numChannels, 22);
    headerBuffer.writeUInt32LE(sampleRate, 24);
    headerBuffer.writeUInt32LE(byteRate, 28);
    headerBuffer.writeUInt16LE(blockAlign, 32);
    headerBuffer.writeUInt16LE(bitsPerSample, 34);

    /** data */
    headerBuffer.write("data", 36, "ascii");
    headerBuffer.writeUInt32LE(len, 40);

    /** Ghép header + PCM data */
    const wavBuffer = Buffer.concat([headerBuffer, pcmBuffer]);

    /** Lưu file */
    const filename = `ztteam-${articleId}.wav`;
    const filepath = path.join(audioDir, filename);
    await writeFile(filepath, wavBuffer);

    return NextResponse.json({
      success: true,
      audioPath: `/audio/${filename}`,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Có lỗi xảy ra";
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 },
    );
  }
}
