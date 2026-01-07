/**
 * @file scripts/migrate-roles.ts
 * @description
 * 기존 사용자 역할을 새 역할 체계로 마이그레이션합니다.
 * - ADMIN → EXECUTIVE (경영자)
 * - MANAGER → PMO
 * - MEMBER → MEMBER (그대로)
 *
 * 실행 방법:
 * npx tsx scripts/migrate-roles.ts
 */

import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import * as dotenv from "dotenv";

// .env 로드
dotenv.config({ path: ".env" });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("🚀 역할 마이그레이션 시작...\n");

  // ADMIN → EXECUTIVE로 변경
  const adminUsers = await prisma.$executeRaw`
    UPDATE users SET role = 'EXECUTIVE' WHERE role = 'ADMIN'
  `;
  console.log(`✅ ADMIN → EXECUTIVE: ${adminUsers}명 변경`);

  // MANAGER → PMO로 변경
  const managerUsers = await prisma.$executeRaw`
    UPDATE users SET role = 'PMO' WHERE role = 'MANAGER'
  `;
  console.log(`✅ MANAGER → PMO: ${managerUsers}명 변경`);

  console.log("\n🎉 역할 마이그레이션 완료!");
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
