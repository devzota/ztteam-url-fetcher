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
    if (featuredImageUrl) {
      featuredMediaId = await ztteam_uploadFeaturedImage(
        featuredImageUrl,
        siteUrl,
        credentials,
      );
    }

    /** Tạo bài viết */
    const postData: Record<string, unknown> = {
      title,
      content,
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
): Promise<number | null> {
  try {
    /** Fetch ảnh từ URL gốc */
    const imageResponse = await fetch(imageUrl, {
      headers: { "User-Agent": "Mozilla/5.0" },
    });

    if (!imageResponse.ok) return null;

    const imageBuffer = await imageResponse.arrayBuffer();
    const contentType =
      imageResponse.headers.get("Content-Type") || "image/jpeg";
    const filename =
      imageUrl.split("/").pop()?.split("?")[0] || "featured-image.jpg";

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
    return media.id || null;
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
