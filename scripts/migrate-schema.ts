/**
 * @file scripts/migrate-schema.ts
 * @description
 * 스키마 변경 전 데이터 마이그레이션 스크립트입니다.
 * - RequirementStatus 값 변환 (REQUESTED → DRAFT, PENDING → DRAFT, COMPLETED → IMPLEMENTED)
 * - Task assigneeId를 TaskAssignee 테이블로 이관
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
    console.log("🚀 데이터 마이그레이션 시작...\n");

    // 1. RequirementStatus 값 변환
    console.log("1️⃣ RequirementStatus 값 변환 중...");

    // REQUESTED → DRAFT
    const r1 = await client.query(`
      UPDATE requirements SET status = 'DRAFT' WHERE status = 'REQUESTED'
    `);
    console.log(`   - REQUESTED → DRAFT: ${r1.rowCount}건`);

    // PENDING → DRAFT
    const r2 = await client.query(`
      UPDATE requirements SET status = 'DRAFT' WHERE status = 'PENDING'
    `);
    console.log(`   - PENDING → DRAFT: ${r2.rowCount}건`);

    // COMPLETED → IMPLEMENTED
    const r3 = await client.query(`
      UPDATE requirements SET status = 'IMPLEMENTED' WHERE status = 'COMPLETED'
    `);
    console.log(`   - COMPLETED → IMPLEMENTED: ${r3.rowCount}건`);

    // 2. Task assigneeId 데이터 확인 (나중에 TaskAssignee로 이관)
    console.log("\n2️⃣ Task assigneeId 데이터 백업 중...");
    const tasksWithAssignee = await client.query(`
      SELECT id, "assigneeId" FROM tasks WHERE "assigneeId" IS NOT NULL
    `);
    console.log(`   - 담당자가 있는 태스크: ${tasksWithAssignee.rowCount}건`);

    if (tasksWithAssignee.rowCount && tasksWithAssignee.rowCount > 0) {
      console.log("   - 백업 데이터:");
      tasksWithAssignee.rows.forEach((row: { id: string; assigneeId: string }) => {
        console.log(`     taskId: ${row.id}, assigneeId: ${row.assigneeId}`);
      });

      // 백업 데이터를 파일로 저장
      const fs = await import("fs");
      fs.writeFileSync(
        "scripts/assignee-backup.json",
        JSON.stringify(tasksWithAssignee.rows, null, 2)
      );
      console.log("   - 백업 파일 저장: scripts/assignee-backup.json");
    }

    console.log("\n✅ 데이터 마이그레이션 완료!");
    console.log("   이제 'npx prisma db push --accept-data-loss' 를 실행하세요.");

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
