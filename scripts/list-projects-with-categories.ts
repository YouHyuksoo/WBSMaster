/**
 * @file scripts/list-projects-with-categories.ts
 * @description 프로젝트 목록과 각 프로젝트의 stageCategory별 majorCategory 목록 조회
 * 실행: npx tsx scripts/list-projects-with-categories.ts
 */

import { config } from "dotenv";
config({ path: ".env.local" });

import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const projects = await prisma.project.findMany({
    select: { id: true, name: true, status: true, createdAt: true },
    orderBy: { createdAt: "desc" },
  });

  console.log("=== 프로젝트 목록 ===\n");
  for (const p of projects) {
    console.log(`ID: ${p.id}`);
    console.log(`이름: ${p.name}`);
    console.log(`상태: ${p.status}`);

    const tasks = await prisma.progressTask.findMany({
      where: { projectId: p.id },
      select: { stageCategory: true, category: true },
    });
    if (tasks.length > 0) {
      const map = new Map<string, Set<string>>();
      for (const t of tasks) {
        if (!t.category) continue;
        if (!map.has(t.stageCategory)) map.set(t.stageCategory, new Set());
        map.get(t.stageCategory)!.add(t.category);
      }
      console.log(`  태스크 수: ${tasks.length}`);
      console.log(`  카테고리별 대분류:`);
      for (const [cat, majors] of map.entries()) {
        console.log(`    - ${cat}: ${[...majors].join(", ")}`);
      }
    } else {
      console.log(`  태스크: 없음`);
    }
    console.log("---");
  }
  console.log(`\n총 ${projects.length}개 프로젝트`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
