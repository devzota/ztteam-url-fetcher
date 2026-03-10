import Database from "better-sqlite3";
import path from "path";

/** Đường dẫn tới file SQLite */
const DB_PATH = path.join("D:/projects", "ztteam-pipeline.db");

/** Khởi tạo database connection */
const db = new Database(DB_PATH);

/** Bật WAL mode để tối ưu performance */
db.pragma("journal_mode = WAL");

/** Khởi tạo bảng ztteam_articles */
db.exec(`
  CREATE TABLE IF NOT EXISTS ztteam_articles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    status TEXT NOT NULL DEFAULT 'pending',
    source_url TEXT UNIQUE NOT NULL,
    title_original TEXT,
    content_original TEXT,
    content_html TEXT,
    image_original TEXT,
    title_new TEXT,
    script TEXT,
    social_post TEXT,
    image_new TEXT,
    audio_path TEXT,
    video_path TEXT,
    created_at TEXT DEFAULT (datetime('now', '+7 hours')),
    updated_at TEXT DEFAULT (datetime('now', '+7 hours'))
  )
`);
db.exec(`
  CREATE TABLE IF NOT EXISTS ztteam_api_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    article_id INTEGER,
    model TEXT NOT NULL,
    type TEXT NOT NULL,
    input_tokens INTEGER DEFAULT 0,
    output_tokens INTEGER DEFAULT 0,
    cost_usd REAL DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now', '+7 hours')),
    FOREIGN KEY (article_id) REFERENCES ztteam_articles(id)
  )
`);
/** Interface cho ZTTeamArticle */
export interface ZTTeamArticle {
  id: number;
  status: string;
  source_url: string;
  title_original: string | null;
  content_original: string | null;
  content_html: string | null;
  image_original: string | null;
  title_new: string | null;
  script: string | null;
  social_post: string | null;
  image_new: string | null;
  audio_path: string | null;
  video_path: string | null;
  created_at: string;
  updated_at: string;
}

/** Lấy tất cả articles */
export function ztteam_getAllArticles(): ZTTeamArticle[] {
  return db
    .prepare(`SELECT * FROM ztteam_articles ORDER BY created_at DESC`)
    .all() as ZTTeamArticle[];
}

/** Lấy articles theo status */
export function ztteam_getArticlesByStatus(status: string): ZTTeamArticle[] {
  return db
    .prepare(
      `SELECT * FROM ztteam_articles WHERE status = ? ORDER BY created_at DESC`,
    )
    .all(status) as ZTTeamArticle[];
}

/** Lấy article theo ID */
export function ztteam_getArticleById(id: number): ZTTeamArticle | undefined {
  return db.prepare(`SELECT * FROM ztteam_articles WHERE id = ?`).get(id) as
    | ZTTeamArticle
    | undefined;
}

/** Kiểm tra URL đã tồn tại chưa */
export function ztteam_checkUrlExists(source_url: string): boolean {
  const row = db
    .prepare(`SELECT id FROM ztteam_articles WHERE source_url = ?`)
    .get(source_url);
  return !!row;
}

/** Đếm articles theo status */
export function ztteam_countByStatus(): Record<string, number> {
  const rows = db
    .prepare(
      `SELECT status, COUNT(*) as count FROM ztteam_articles GROUP BY status`,
    )
    .all() as { status: string; count: number }[];
  const result: Record<string, number> = {};
  for (const row of rows) {
    result[row.status] = row.count;
  }
  return result;
}

/** Thêm article mới vào queue */
export function ztteam_insertArticle(data: {
  source_url: string;
  title_original: string;
  content_original: string;
  content_html: string | null;
  image_original: string | null;
}): ZTTeamArticle {
  const stmt = db.prepare(`
    INSERT INTO ztteam_articles (source_url, title_original, content_original, content_html, image_original)
    VALUES (@source_url, @title_original, @content_original, @content_html, @image_original)
  `);
  const result = stmt.run(data);
  return ztteam_getArticleById(result.lastInsertRowid as number)!;
}

/** Cập nhật status của article */
export function ztteam_updateStatus(
  id: number,
  status: string,
): ZTTeamArticle | undefined {
  db.prepare(
    `
    UPDATE ztteam_articles
    SET status = ?, updated_at = datetime('now', '+7 hours')
    WHERE id = ?
  `,
  ).run(status, id);
  return ztteam_getArticleById(id);
}

/** Cập nhật nội dung generated từ AI */
export function ztteam_updateGeneratedContent(
  id: number,
  data: {
    title_new?: string | null;
    script?: string | null;
    social_post?: string | null;
    image_new?: string | null;
    audio_path?: string | null;
  },
): ZTTeamArticle | undefined {
  const current = ztteam_getArticleById(id);
  if (!current) return undefined;

  db.prepare(
    `
    UPDATE ztteam_articles
    SET
      title_new = ?,
      script = ?,
      social_post = ?,
      image_new = ?,
      audio_path = ?,
      status = 'ready',
      updated_at = datetime('now', '+7 hours')
    WHERE id = ?
  `,
  ).run(
    data.title_new !== undefined ? data.title_new : current.title_new,
    data.script !== undefined ? data.script : current.script,
    data.social_post !== undefined ? data.social_post : current.social_post,
    data.image_new !== undefined ? data.image_new : current.image_new,
    data.audio_path !== undefined ? data.audio_path : current.audio_path,
    id,
  );
  return ztteam_getArticleById(id);
}

/** Interface cho API log */
export interface ZTTeamApiLog {
  id: number;
  article_id: number | null;
  model: string;
  type: string;
  input_tokens: number;
  output_tokens: number;
  cost_usd: number;
  created_at: string;
}

/** Ghi log API usage */
export function ztteam_insertApiLog(data: {
  article_id: number | null;
  model: string;
  type: string;
  input_tokens: number;
  output_tokens: number;
  cost_usd: number;
}): void {
  db.prepare(
    `
    INSERT INTO ztteam_api_logs (article_id, model, type, input_tokens, output_tokens, cost_usd)
    VALUES (@article_id, @model, @type, @input_tokens, @output_tokens, @cost_usd)
  `,
  ).run(data);
}

/** Lấy tổng stats API usage */
export function ztteam_getApiStats(): {
  total_calls: number;
  total_input_tokens: number;
  total_output_tokens: number;
  total_cost_usd: number;
  by_model: {
    model: string;
    calls: number;
    input_tokens: number;
    output_tokens: number;
    cost_usd: number;
  }[];
} {
  const totals = db
    .prepare(
      `
    SELECT
      COUNT(*) as total_calls,
      SUM(input_tokens) as total_input_tokens,
      SUM(output_tokens) as total_output_tokens,
      SUM(cost_usd) as total_cost_usd
    FROM ztteam_api_logs
  `,
    )
    .get() as {
    total_calls: number;
    total_input_tokens: number;
    total_output_tokens: number;
    total_cost_usd: number;
  };

  const byModel = db
    .prepare(
      `
    SELECT
      model,
      COUNT(*) as calls,
      SUM(input_tokens) as input_tokens,
      SUM(output_tokens) as output_tokens,
      SUM(cost_usd) as cost_usd
    FROM ztteam_api_logs
    GROUP BY model
    ORDER BY cost_usd DESC
  `,
    )
    .all() as {
    model: string;
    calls: number;
    input_tokens: number;
    output_tokens: number;
    cost_usd: number;
  }[];

  return {
    total_calls: totals.total_calls || 0,
    total_input_tokens: totals.total_input_tokens || 0,
    total_output_tokens: totals.total_output_tokens || 0,
    total_cost_usd: totals.total_cost_usd || 0,
    by_model: byModel,
  };
}

/** Lấy logs gần đây */
export function ztteam_getRecentApiLogs(limit = 20): ZTTeamApiLog[] {
  return db
    .prepare(
      `
    SELECT * FROM ztteam_api_logs
    ORDER BY created_at DESC
    LIMIT ?
  `,
    )
    .all(limit) as ZTTeamApiLog[];
}

/** Reset API logs */
export function ztteam_resetApiLogs(): void {
  db.prepare(`DELETE FROM ztteam_api_logs`).run();
}

/** Export database instance */
export default db;
