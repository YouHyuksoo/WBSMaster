/**
 * @file scripts/update-user-roles.ts
 * @description
 * 유혁수, 김종현의 역할을 설정합니다.
 * - 유혁수: PMO
 * - 김종현: DIRECTOR (총괄)
 */

import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("🚀 사용자 역할 업데이트 시작...\n");

  // 유혁수 → ADMIN
  const user1 = await prisma.user.update({
    where: { email: "hyuksu.yu@wbsmaster.com" },
    data: { role: "ADMIN" },
  });
  console.log(`✅ ${user1.name}: ${user1.role}`);

  // 김종현 → USER
  const user2 = await prisma.user.update({
    where: { email: "jonghyun.kim@wbsmaster.com" },
    data: { role: "USER" },
  });
  console.log(`✅ ${user2.name}: ${user2.role}`);

  console.log("\n🎉 역할 업데이트 완료!");
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
