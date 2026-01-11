/**
 * 프로젝트 ID 확인 스크립트
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
    // 프로젝트 목록
    const projects = await client.query(`
      SELECT id, name FROM projects
    `);
    console.log("프로젝트 목록:");
    projects.rows.forEach(row => {
      console.log(`  - ${row.id}: ${row.name}`);
    });

    // 카테고리별 projectId
    const categories = await client.query(`
      SELECT DISTINCT "projectId", COUNT(*) as cnt
      FROM process_verification_categories
      GROUP BY "projectId"
    `);
    console.log("\n카테고리의 projectId:");
    categories.rows.forEach(row => {
      console.log(`  - ${row.projectId}: ${row.cnt}개 카테고리`);
    });

    // 첫 번째 프로젝트 ID와 카테고리 projectId 비교
    if (projects.rows.length > 0 && categories.rows.length > 0) {
      const firstProjectId = projects.rows[0].id;
      const categoryProjectId = categories.rows[0].projectId;

      console.log("\n비교:");
      console.log(`  첫 번째 프로젝트: ${firstProjectId}`);
      console.log(`  카테고리 프로젝트: ${categoryProjectId}`);
      console.log(`  일치 여부: ${firstProjectId === categoryProjectId ? '✅ 일치' : '❌ 불일치'}`);
    }

  } finally {
    client.release();
    await pool.end();
  }
}

main().catch(console.error);
