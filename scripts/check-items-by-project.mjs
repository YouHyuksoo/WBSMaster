/**
 * 프로젝트별 항목 수 확인 스크립트
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
    // 프로젝트별 항목 수
    const result = await client.query(`
      SELECT p.name as project_name, p.id as project_id, COUNT(i.id) as item_count
      FROM projects p
      LEFT JOIN process_verification_categories c ON p.id = c."projectId"
      LEFT JOIN process_verification_items i ON c.id = i."categoryId"
      GROUP BY p.id, p.name
      ORDER BY p.name
    `);

    console.log("프로젝트별 항목 수:");
    result.rows.forEach(row => {
      console.log(`  - ${row.project_name}: ${row.item_count}개`);
    });

  } finally {
    client.release();
    await pool.end();
  }
}

main().catch(console.error);
