/**
 * @file scripts/reset-roles.ts
 * @description
 * 기존 사용자 역할을 MEMBER로 리셋합니다.
 * (enum 변경 전 실행 필요)
 */

import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env" });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("🚀 역할 리셋 시작...\n");

  // 모든 사용자를 MEMBER로 변경
  const result = await prisma.$executeRaw`
    UPDATE users SET role = 'MEMBER' WHERE role IN ('ADMIN', 'MANAGER')
  `;
  console.log(`✅ ${result}명의 역할을 MEMBER로 변경했습니다.`);

  console.log("\n🎉 역할 리셋 완료!");
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
