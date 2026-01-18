/**
 * @file scripts/fix-business-units.ts
 * @description
 * 잘못 생성된 V_EMS 사업부 데이터를 삭제하는 스크립트
 *
 * 실행 방법:
 * npx tsx scripts/fix-business-units.ts
 *
 * 문제:
 * - 마이그레이션 시 V_EMS 사업부가 잘못 생성됨
 * - 실제 SMD 사업부: V_IVI, V_DISP, V_PCBA
 * - V_EMS는 존재하지 않는 사업부
 */

import { config } from "dotenv";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

// 환경 변수 로드
config({ path: ".env.local" });

// Prisma Client 생성 (adapter 패턴)
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 10,
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

/**
 * V_EMS 데이터 정리
 */
async function fixBusinessUnits() {
  console.log("=".repeat(60));
  console.log("사업부 데이터 정리");
  console.log("=".repeat(60));
  console.log();

  // 1. 현재 사업부별 분포 확인
  console.log("[1/3] 현재 사업부별 분포 확인...");

  const businessUnits = await prisma.processVerificationBusinessUnit.groupBy({
    by: ["businessUnit"],
    _count: { id: true },
  });

  console.log("  현재 사업부 분포:");
  businessUnits.forEach((bu) => {
    console.log(`    - ${bu.businessUnit}: ${bu._count.id}개`);
  });

  // 2. V_EMS 데이터 삭제
  console.log("\n[2/3] V_EMS 데이터 삭제 중...");

  const deleteResult = await prisma.processVerificationBusinessUnit.deleteMany({
    where: { businessUnit: "V_EMS" },
  });

  console.log(`  - 삭제된 V_EMS 레코드: ${deleteResult.count}개`);

  // 3. 정리 후 분포 확인
  console.log("\n[3/3] 정리 후 사업부별 분포 확인...");

  const updatedBusinessUnits = await prisma.processVerificationBusinessUnit.groupBy({
    by: ["businessUnit"],
    _count: { id: true },
  });

  console.log("  정리 후 사업부 분포:");
  updatedBusinessUnits.forEach((bu) => {
    console.log(`    - ${bu.businessUnit}: ${bu._count.id}개`);
  });

  // 사업부별 적용률 통계
  console.log("\n사업부별 적용률:");
  for (const bu of updatedBusinessUnits) {
    const applied = await prisma.processVerificationBusinessUnit.count({
      where: { businessUnit: bu.businessUnit, isApplied: true },
    });
    const rate = bu._count.id > 0 ? Math.round((applied / bu._count.id) * 100) : 0;
    console.log(`  - ${bu.businessUnit}: ${applied}/${bu._count.id} (${rate}%)`);
  }

  console.log("\n=".repeat(60));
  console.log("사업부 데이터 정리 완료!");
  console.log("=".repeat(60));
}

/**
 * 메인 실행
 */
async function main() {
  try {
    await fixBusinessUnits();
  } catch (error) {
    console.error("\n오류:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
