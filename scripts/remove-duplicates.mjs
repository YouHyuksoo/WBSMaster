/**
 * 중복 관리코드 제거 스크립트
 * 중복된 관리코드 중 가장 먼저 생성된 항목만 남기고 나머지 삭제
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
    // 1. 중복된 관리코드 확인
    const duplicates = await client.query(`
      SELECT "managementCode", COUNT(*) as cnt
      FROM process_verification_items
      GROUP BY "managementCode"
      HAVING COUNT(*) > 1
    `);

    console.log(`중복된 관리코드: ${duplicates.rows.length}개`);

    if (duplicates.rows.length === 0) {
      console.log("중복이 없습니다.");
      return;
    }

    // 2. 중복된 항목 중 나중에 생성된 것들 삭제 (가장 오래된 것만 유지)
    const deleteResult = await client.query(`
      DELETE FROM process_verification_items
      WHERE id IN (
        SELECT id FROM (
          SELECT id,
                 ROW_NUMBER() OVER (PARTITION BY "managementCode" ORDER BY "createdAt" ASC) as rn
          FROM process_verification_items
        ) sub
        WHERE rn > 1
      )
    `);

    console.log(`삭제된 중복 항목: ${deleteResult.rowCount}개`);

    // 3. 삭제 후 확인
    const checkResult = await client.query(`
      SELECT "managementCode", COUNT(*) as cnt
      FROM process_verification_items
      GROUP BY "managementCode"
      HAVING COUNT(*) > 1
    `);

    if (checkResult.rows.length === 0) {
      console.log("✅ 모든 중복이 제거되었습니다.");
    } else {
      console.log(`⚠️ 아직 중복이 남아있습니다: ${checkResult.rows.length}개`);
    }

  } finally {
    client.release();
    await pool.end();
  }
}

main().catch(console.error);
