/**
 * @file scripts/delete-tasks.ts
 * @description
 * 모든 Task 데이터를 삭제하는 스크립트입니다.
 * TaskNudge, TaskAssignee 관련 데이터도 함께 삭제됩니다.
 *
 * 실행 방법:
 * npx tsx scripts/delete-tasks.ts
 */

import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import * as dotenv from "dotenv";

// .env.local 파일 로드
dotenv.config({ path: ".env.local" });

// PostgreSQL 연결 풀 생성
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Prisma adapter 방식으로 연결
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("🚀 모든 Task 데이터 삭제 시작...\n");

  // 1. 현재 Task 수 확인
  const taskCount = await prisma.task.count();
  console.log(`📋 현재 Task 수: ${taskCount}개`);

  if (taskCount === 0) {
    console.log("✅ 삭제할 Task가 없습니다.");
    return;
  }

  // 2. TaskNudge 삭제 (외래키 참조로 인해 먼저 삭제)
  const deletedNudges = await prisma.taskNudge.deleteMany();
  console.log(`🗑️  TaskNudge 삭제: ${deletedNudges.count}개`);

  // 3. TaskAssignee 삭제
  const deletedAssignees = await prisma.taskAssignee.deleteMany();
  console.log(`🗑️  TaskAssignee 삭제: ${deletedAssignees.count}개`);

  // 4. Task 삭제
  const deletedTasks = await prisma.task.deleteMany();
  console.log(`🗑️  Task 삭제: ${deletedTasks.count}개`);

  console.log("\n✅ 모든 Task 데이터 삭제 완료!");
}

main()
  .catch((e) => {
    console.error("❌ 오류 발생:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
