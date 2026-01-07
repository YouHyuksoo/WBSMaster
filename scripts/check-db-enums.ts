/**
 * @file scripts/check-db-enums.ts
 * @description
 * 데이터베이스의 enum 상태를 확인하는 스크립트입니다.
 */

import { Pool } from "pg";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function main() {
  const client = await pool.connect();

  try {
    console.log("🔍 데이터베이스 enum 상태 확인...\n");

    // enum 타입 목록 조회
    const enums = await client.query(`
      SELECT t.typname, e.enumlabel
      FROM pg_type t
      JOIN pg_enum e ON t.oid = e.enumtypid
      ORDER BY t.typname, e.enumsortorder
    `);

    const enumMap: Record<string, string[]> = {};
    enums.rows.forEach((row: { typname: string; enumlabel: string }) => {
      if (!enumMap[row.typname]) {
        enumMap[row.typname] = [];
      }
      enumMap[row.typname].push(row.enumlabel);
    });

    console.log("📋 Enum 타입 목록:");
    Object.entries(enumMap).forEach(([name, values]) => {
      console.log(`\n   ${name}:`);
      values.forEach(v => console.log(`     - ${v}`));
    });

    // requirements 테이블 데이터 확인
    console.log("\n\n📊 requirements 테이블 데이터:");
    const requirements = await client.query(`
      SELECT id, title, status FROM requirements LIMIT 10
    `);
    if (requirements.rowCount === 0) {
      console.log("   (데이터 없음)");
    } else {
      requirements.rows.forEach((row: { id: string; title: string; status: string }) => {
        console.log(`   - ${row.id}: ${row.title} (${row.status})`);
      });
    }

    // tasks 테이블의 assigneeId 확인
    console.log("\n📊 tasks 테이블 assigneeId 데이터:");
    try {
      const tasks = await client.query(`
        SELECT id, title, "assigneeId" FROM tasks WHERE "assigneeId" IS NOT NULL LIMIT 10
      `);
      if (tasks.rowCount === 0) {
        console.log("   (담당자 지정된 태스크 없음)");
      } else {
        tasks.rows.forEach((row: { id: string; title: string; assigneeId: string }) => {
          console.log(`   - ${row.id}: ${row.title} (assignee: ${row.assigneeId})`);
        });
      }
    } catch (e) {
      console.log("   (assigneeId 컬럼이 없거나 접근 불가)");
    }

  } catch (error) {
    console.error("❌ 오류 발생:", error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
