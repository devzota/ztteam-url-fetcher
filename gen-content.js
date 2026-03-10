const Database = require('better-sqlite3');
const { GoogleGenAI } = require('@google/genai');

const db = new Database('D:/projects/ztteam-pipeline.db');
const article = db.prepare('SELECT * FROM ztteam_articles WHERE id = 2').get();

const ai = new GoogleGenAI({ apiKey: 'AIzaSyCgVPHM-nitImjZdXCFPzsAQQskbmF9EsU' });

async function run() {
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: {
      parts: [{ text: 'Nội dung yêu cầu: ' + article.content_original }]
    },
    config: {
      systemInstruction: 'Dựa trên nội dung gốc, viết lại hoàn toàn bằng Tiếng Anh theo phong cách báo chí chuyên nghiệp, hấp dẫn, SEO-friendly. TUYỆT ĐỐI không dùng từ ngữ vi phạm chính sách Google AdSense. Trả về HTML thuần dùng thẻ <p>, <h2>, <h3>, <strong>, <ul>, <li>. KHÔNG có <html>, <head>, <body>.',
    }
  });

  const contentNew = response.text || '';
  db.prepare("UPDATE ztteam_articles SET content_new = ?, updated_at = datetime('now', '+7 hours') WHERE id = 2").run(contentNew);
  console.log('Done! content_new saved.');
  db.close();
}

run().catch(console.error);
