/**
 * 데이터 확인 스크립트
 */
import { createRequire } from "module";
const require = createRequire(import.meta.url);

const { Pool } = require("pg");
const dotenv = require("dotenv");

dotenv.config({ path: ".env.local" });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function main() {
  const client = await pool.connect();
  try {
    // 카테고리 수
    const categories = await client.query(`
      SELECT COUNT(*) as cnt FROM process_verification_categories
    `);
    console.log(`카테고리 수: ${categories.rows[0].cnt}개`);

    // 항목 수
    const items = await client.query(`
      SELECT COUNT(*) as cnt FROM process_verification_items
    `);
    console.log(`항목 수: ${items.rows[0].cnt}개`);

    // 카테고리별 항목 수
    const byCategory = await client.query(`
      SELECT c.name, COUNT(i.id) as cnt
      FROM process_verification_categories c
      LEFT JOIN process_verification_items i ON c.id = i."categoryId"
      GROUP BY c.id, c.name
      ORDER BY c."order"
    `);
    console.log("\n카테고리별 항목 수:");
    byCategory.rows.forEach(row => {
      console.log(`  - ${row.name}: ${row.cnt}개`);
    });

  } finally {
    client.release();
    await pool.end();
  }
}

main().catch(console.error);
