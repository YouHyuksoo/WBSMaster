/**
 * @file scripts/seed-members.ts
 * @description
 * 프로젝트 멤버 2명을 DB에 등록하는 시드 스크립트입니다.
 * - 유혁수: PMO 역할
 * - 김종현: 프로젝트 총괄
 *
 * 실행 방법:
 * npx tsx scripts/seed-members.ts
 */

import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import * as dotenv from "dotenv";

// .env.local 로드
dotenv.config({ path: ".env.local" });

// PostgreSQL 연결 풀 생성
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Prisma adapter 방식으로 연결
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("🚀 멤버 등록 시작...\n");

  // 1. User 생성: 유혁수 (PMO)
  const user1 = await prisma.user.upsert({
    where: { email: "hyuksu.yu@wbsmaster.com" },
    update: { name: "유혁수" },
    create: {
      email: "hyuksu.yu@wbsmaster.com",
      name: "유혁수",
      role: "ADMIN", // 관리자
    },
  });
  console.log("✅ 유혁수 등록 완료:", user1);

  // 2. User 생성: 김종현 (프로젝트 총괄)
  const user2 = await prisma.user.upsert({
    where: { email: "jonghyun.kim@wbsmaster.com" },
    update: { name: "김종현" },
    create: {
      email: "jonghyun.kim@wbsmaster.com",
      name: "김종현",
      role: "USER", // 사용자
    },
  });
  console.log("✅ 김종현 등록 완료:", user2);

  // 3. 프로젝트 확인 (있으면 TeamMember로 추가)
  const project = await prisma.project.findFirst({
    orderBy: { createdAt: "desc" },
  });

  if (project) {
    console.log(`\n📁 프로젝트 발견: ${project.name}`);

    // 유혁수를 PMO로 추가
    const member1 = await prisma.teamMember.upsert({
      where: {
        projectId_userId: {
          projectId: project.id,
          userId: user1.id,
        },
      },
      update: { customRole: "PMO" },
      create: {
        projectId: project.id,
        userId: user1.id,
        role: "MANAGER",
        customRole: "PMO",
      },
    });
    console.log("✅ 유혁수 → PMO로 프로젝트에 추가:", member1);

    // 김종현을 프로젝트 총괄로 추가
    const member2 = await prisma.teamMember.upsert({
      where: {
        projectId_userId: {
          projectId: project.id,
          userId: user2.id,
        },
      },
      update: { customRole: "프로젝트 총괄" },
      create: {
        projectId: project.id,
        userId: user2.id,
        role: "OWNER",
        customRole: "프로젝트 총괄",
      },
    });
    console.log("✅ 김종현 → 프로젝트 총괄로 프로젝트에 추가:", member2);
  } else {
    console.log("\n⚠️ 프로젝트가 없어서 TeamMember는 추가하지 않았어요.");
    console.log("   프로젝트 생성 후 /api/members API로 추가해주세요.");
  }

  console.log("\n🎉 멤버 등록 완료!");
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
