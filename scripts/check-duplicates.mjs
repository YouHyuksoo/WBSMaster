/**
 * 중복 관리코드 확인 스크립트
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
    const result = await client.query(`
      SELECT "managementCode", COUNT(*) as cnt
      FROM process_verification_items
      GROUP BY "managementCode"
      HAVING COUNT(*) > 1
      ORDER BY cnt DESC
      LIMIT 10
    `);

    if (result.rows.length === 0) {
      console.log("중복된 관리코드가 없습니다.");
    } else {
      console.log("중복된 관리코드:");
      result.rows.forEach(row => {
        console.log(`  - ${row.managementCode}: ${row.cnt}개`);
      });
    }
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch(console.error);
