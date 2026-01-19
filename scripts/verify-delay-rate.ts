/**
 * @file scripts/verify-delay-rate.ts
 * @description
 * WBS 페이지의 지연율 18%를 검증하는 스크립트입니다.
 * 실제 데이터베이스에서 WBS 항목을 조회하여 지연율을 계산합니다.
 *
 * 실행 방법:
 * npx tsx scripts/verify-delay-rate.ts
 */

// 1. 환경변수 먼저 로드 (필수!)
import { config } from "dotenv";
config({ path: ".env.local" });

// 2. Prisma 7 adapter 설정 (필수!)
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

/**
 * 지연 여부 판단
 */
function isDelayed(endDate: Date | null, status: string): boolean {
  if (!endDate) return false;
  if (status === "COMPLETED" || status === "CANCELLED") return false;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const end = new Date(endDate);
  end.setHours(0, 0, 0, 0);

  return end < today;
}

async function main() {
  console.log("🔍 WBS 지연율 검증 시작...\n");

  // 모든 프로젝트 조회
  const projects = await prisma.project.findMany({
    select: {
      id: true,
      name: true,
    },
  });

  if (projects.length === 0) {
    console.log("❌ 프로젝트가 없습니다.");
    return;
  }

  console.log(`📁 총 ${projects.length}개 프로젝트 발견\n`);

  // 각 프로젝트별로 검증
  for (const project of projects) {
    console.log(`\n${"=".repeat(60)}`);
    console.log(`📊 프로젝트: ${project.name} (ID: ${project.id})`);
    console.log(`${"=".repeat(60)}\n`);

    // 해당 프로젝트의 모든 WBS 항목 조회
    const wbsItems = await prisma.wbsItem.findMany({
      where: {
        projectId: project.id,
      },
      select: {
        id: true,
        code: true,
        name: true,
        level: true,
        status: true,
        startDate: true,
        endDate: true,
        progress: true,
      },
      orderBy: {
        code: "asc",
      },
    });

    if (wbsItems.length === 0) {
      console.log("  ℹ️  WBS 항목이 없습니다.");
      continue;
    }

    console.log(`  총 항목 수: ${wbsItems.length}개\n`);

    // 통계 계산
    const total = wbsItems.length;
    const completed = wbsItems.filter(i => i.status === "COMPLETED").length;
    const cancelled = wbsItems.filter(i => i.status === "CANCELLED").length;
    const activeItems = wbsItems.filter(i =>
      i.status !== "COMPLETED" && i.status !== "CANCELLED"
    );
    const delayed = wbsItems.filter(i =>
      isDelayed(i.endDate, i.status)
    );

    const delayedRate = activeItems.length > 0
      ? Math.round((delayed.length / activeItems.length) * 100)
      : 0;

    // 결과 출력
    console.log("  📈 상태별 통계:");
    console.log(`    - 전체 항목: ${total}개`);
    console.log(`    - 완료(COMPLETED): ${completed}개`);
    console.log(`    - 취소(CANCELLED): ${cancelled}개`);
    console.log(`    - 활성 항목: ${activeItems.length}개 (완료/취소 제외)`);
    console.log(`    - 지연 항목: ${delayed.length}개\n`);

    console.log("  🎯 지연율 계산:");
    console.log(`    공식: (지연 항목 / 활성 항목) × 100`);
    console.log(`    계산: (${delayed.length} / ${activeItems.length}) × 100 = ${
      activeItems.length > 0
        ? ((delayed.length / activeItems.length) * 100).toFixed(2)
        : 0
    }%`);
    console.log(`    반올림: ${delayedRate}%\n`);

    // 지연 항목 상세 출력
    if (delayed.length > 0) {
      console.log("  ⚠️  지연 항목 상세:");
      delayed.forEach((item, index) => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const end = item.endDate ? new Date(item.endDate) : null;
        const delayDays = end
          ? Math.ceil((today.getTime() - end.getTime()) / (1000 * 60 * 60 * 24))
          : 0;

        console.log(`    ${index + 1}. [${item.code}] ${item.name}`);
        console.log(`       - 상태: ${item.status}`);
        console.log(`       - 종료일: ${end ? end.toLocaleDateString('ko-KR') : '없음'}`);
        console.log(`       - 지연 일수: ${delayDays}일`);
        console.log(`       - 진행률: ${item.progress}%`);
      });
    }

    // 활성 항목 상세 (지연 아닌 항목)
    const activeNotDelayed = activeItems.filter(i => !isDelayed(i.endDate, i.status));
    if (activeNotDelayed.length > 0) {
      console.log(`\n  ✅ 활성 항목 (지연 아님): ${activeNotDelayed.length}개`);
      activeNotDelayed.forEach((item, index) => {
        console.log(`    ${index + 1}. [${item.code}] ${item.name}`);
        console.log(`       - 상태: ${item.status}`);
        console.log(`       - 종료일: ${item.endDate ? new Date(item.endDate).toLocaleDateString('ko-KR') : '없음'}`);
        console.log(`       - 진행률: ${item.progress}%`);
      });
    }
  }

  console.log(`\n${"=".repeat(60)}`);
  console.log("✅ 검증 완료!");
  console.log(`${"=".repeat(60)}\n`);
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
