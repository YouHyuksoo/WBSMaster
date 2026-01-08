/**
 * @file scripts/add-holidays.ts
 * @description
 * 휴무일을 등록하는 스크립트입니다.
 * 모든 프로젝트에 공휴일을 등록합니다.
 *
 * 실행: npx tsx scripts/add-holidays.ts
 */

import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import pg from "pg";

const connectionString = process.env.DATABASE_URL!;
const pool = new pg.Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

/** 등록할 휴일 목록 */
const holidays = [
  { title: "신정", date: "2026-01-01" },
  { title: "설날", date: "2026-02-16" },
  { title: "설날", date: "2026-02-17" },
  { title: "설날", date: "2026-02-18" },
  { title: "삼일절 대체공휴일", date: "2026-03-02" },
  { title: "베트남 공휴일 1", date: "2026-04-24" },
  { title: "베트남 공휴일 2", date: "2026-04-30" },
  { title: "베트남 공휴일 3", date: "2026-05-01" },
];

async function main() {
  console.log("휴무일 등록 시작...\n");

  // 모든 프로젝트 조회
  const projects = await prisma.project.findMany({
    select: { id: true, name: true },
  });

  if (projects.length === 0) {
    console.log("등록된 프로젝트가 없습니다.");
    return;
  }

  console.log(`프로젝트 ${projects.length}개에 휴일 등록:\n`);

  let totalCreated = 0;
  let totalSkipped = 0;

  for (const project of projects) {
    console.log(`📁 프로젝트: ${project.name}`);

    for (const holiday of holidays) {
      // 이미 같은 날짜에 휴일이 있는지 확인
      const existing = await prisma.holiday.findFirst({
        where: {
          projectId: project.id,
          date: new Date(holiday.date),
          title: holiday.title,
        },
      });

      if (existing) {
        console.log(`  ⏭️  ${holiday.title} (${holiday.date}) - 이미 존재`);
        totalSkipped++;
        continue;
      }

      // 휴일 생성
      await prisma.holiday.create({
        data: {
          title: holiday.title,
          date: new Date(holiday.date),
          type: "COMPANY_HOLIDAY",
          projectId: project.id,
        },
      });

      console.log(`  ✅ ${holiday.title} (${holiday.date}) - 등록 완료`);
      totalCreated++;
    }

    console.log("");
  }

  console.log(`\n=== 완료 ===`);
  console.log(`생성된 휴일: ${totalCreated}개`);
  console.log(`건너뛴 휴일: ${totalSkipped}개 (이미 존재)`);
}

main()
  .catch((e) => {
    console.error("오류 발생:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
