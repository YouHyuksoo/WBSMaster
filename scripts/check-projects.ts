/**
 * @file scripts/check-projects.ts
 * @description 프로젝트 목록 조회
 */

import { config } from "dotenv";
config({ path: ".env.local" });

import { prisma } from "../src/lib/prisma";

async function main() {
  const projects = await prisma.project.findMany({
    select: {
      id: true,
      name: true,
      status: true,
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  console.log("=== 프로젝트 목록 ===");
  projects.forEach((p) => {
    console.log(`ID: ${p.id}`);
    console.log(`이름: ${p.name}`);
    console.log(`상태: ${p.status}`);
    console.log("---");
  });
  console.log(`\n총 ${projects.length}개 프로젝트`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
