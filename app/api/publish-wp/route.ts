import { NextRequest, NextResponse } from "next/server";

/** POST /api/publish-wp */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json();
    const { title, content, featuredImageUrl } = body;

    if (!title || !content) {
      return NextResponse.json(
        { success: false, error: "Thiếu title hoặc content" },
        { status: 400 },
      );
    }

    const siteUrl = process.env.WP_SITE_URL;
    const username = process.env.WP_USERNAME;
    const appPassword = process.env.WP_APP_PASSWORD;

    if (!siteUrl || !username || !appPassword) {
      return NextResponse.json(
        { success: false, error: "Thiếu cấu hình WordPress" },
        { status: 500 },
      );
    }

    const credentials = Buffer.from(`${username}:${appPassword}`).toString(
      "base64",
    );
    const exists = await ztteam_checkPostExists(title, siteUrl, credentials);
    if (exists) {
      return NextResponse.json(
        { success: false, error: "Bài viết này đã tồn tại trên WordPress!" },
        { status: 409 },
      );
    }

    const headers = {
      Authorization: `Basic ${credentials}`,
      "Content-Type": "application/json",
    };

    /** Upload featured image nếu có */
    let featuredMediaId: number | null = null;
    let featuredMediaUrl: string | null = null;

    if (featuredImageUrl) {
      const uploadResult = await ztteam_uploadFeaturedImage(
        featuredImageUrl,
        siteUrl,
        credentials,
      );
      featuredMediaId = uploadResult?.id || null;
      featuredMediaUrl = uploadResult?.url || null;
    }

    /** Thay thế URL ảnh local trong content bằng URL WordPress */
    let finalContent = content;
    /** Strip query string để match đúng trong content */
    const cleanFeaturedUrl = featuredImageUrl
      ? featuredImageUrl.split("?")[0]
      : null;
    console.log("featuredImageUrl:", featuredImageUrl);
    console.log("cleanFeaturedUrl:", cleanFeaturedUrl);
    console.log("featuredMediaUrl:", featuredMediaUrl);
    console.log(
      "content includes image:",
      content.includes(cleanFeaturedUrl || ""),
    );
    if (featuredMediaUrl && cleanFeaturedUrl) {
      finalContent = content.replace(
        new RegExp(
          cleanFeaturedUrl.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
          "g",
        ),
        featuredMediaUrl,
      );
    }

    /** Tạo bài viết */
    const postData: Record<string, unknown> = {
      title,
      content: finalContent,
      status: "publish",
    };

    if (featuredMediaId) {
      postData.featured_media = featuredMediaId;
    }

    const postResponse = await fetch(`${siteUrl}/wp-json/wp/v2/posts`, {
      method: "POST",
      headers,
      body: JSON.stringify(postData),
    });

    if (!postResponse.ok) {
      const error = await postResponse.json();
      throw new Error(error.message || "Không thể tạo bài viết");
    }

    const post = await postResponse.json();

    return NextResponse.json({
      success: true,
      data: {
        id: post.id,
        link: post.link,
        editLink: `${siteUrl}/wp-admin/post.php?post=${post.id}&action=edit`,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Có lỗi xảy ra";
    const stack = error instanceof Error ? error.stack : "";
    console.error("Fetch error:", message, stack);
    return NextResponse.json(
      { success: false, error: message, stack },
      { status: 500 },
    );
  }
}

/** Upload ảnh đại diện lên WordPress Media Library */
async function ztteam_uploadFeaturedImage(
  imageUrl: string,
  siteUrl: string,
  credentials: string,
): Promise<{ id: number; url: string } | null> {
  try {
    /** Fetch ảnh — hỗ trợ cả URL local (Next.js) và URL bên ngoài */
    let imageBuffer: ArrayBuffer;
    let contentType: string;
    let filename: string;

    if (imageUrl.startsWith("/")) {
      /** Ảnh local từ Next.js public folder */
      const fs = await import("fs");
      const path = await import("path");
      /** Strip query string trước khi đọc file */
      const cleanImageUrl = imageUrl.split("?")[0];
      const localPath = path.join(process.cwd(), "public", cleanImageUrl);
      const fileBuffer = fs.readFileSync(localPath);
      imageBuffer = fileBuffer.buffer.slice(
        fileBuffer.byteOffset,
        fileBuffer.byteOffset + fileBuffer.byteLength,
      );
      contentType = "image/png";
      filename = cleanImageUrl.split("/").pop() || "featured-image.png";
    } else {
      /** Ảnh từ URL bên ngoài */
      const imageResponse = await fetch(imageUrl, {
        headers: { "User-Agent": "Mozilla/5.0" },
      });
      if (!imageResponse.ok) return null;
      imageBuffer = await imageResponse.arrayBuffer();
      contentType = imageResponse.headers.get("Content-Type") || "image/jpeg";
      filename =
        imageUrl.split("/").pop()?.split("?")[0] || "featured-image.jpg";
    }

    /** Upload lên WP Media */
    const uploadResponse = await fetch(`${siteUrl}/wp-json/wp/v2/media`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${credentials}`,
        "Content-Type": contentType,
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
      body: imageBuffer,
    });

    if (!uploadResponse.ok) return null;

    const media = await uploadResponse.json();
    return {
      id: media.id,
      url: media.source_url,
    };
  } catch {
    return null;
  }
}

/** Kiểm tra bài viết đã tồn tại theo title */
async function ztteam_checkPostExists(
  title: string,
  siteUrl: string,
  credentials: string,
): Promise<boolean> {
  try {
    const response = await fetch(
      `${siteUrl}/wp-json/wp/v2/posts?per_page=100&orderby=date&order=desc`,
      {
        headers: { Authorization: `Basic ${credentials}` },
      },
    );

    if (!response.ok) return false;

    const posts = await response.json();
    const normalizedTitle = title
      .trim()
      .toLowerCase()
      .replace(/[-–—]+$/, "")
      .trim();

    return posts.some((post: { title: { rendered: string } }) => {
      /** Decode HTML entities từ WP title */
      const wpTitle = post.title.rendered
        .replace(/&#8211;/g, "–")
        .replace(/&#8212;/g, "—")
        .replace(/&amp;/g, "&")
        .replace(/&quot;/g, '"')
        .replace(/&#039;/g, "'")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/[-–—]+$/, "")
        .trim()
        .toLowerCase();

      return wpTitle === normalizedTitle;
    });
  } catch {
    return false;
  }
}
