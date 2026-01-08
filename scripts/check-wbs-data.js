/**
 * @file scripts/check-wbs-data.js
 * @description
 * 현재 WBS 데이터와 멤버 목록을 확인하는 스크립트입니다.
 * 단위업무가 없는 소부류를 파악합니다.
 *
 * 실행 방법:
 * node scripts/check-wbs-data.js
 */

const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function main() {
  console.log("=== 프로젝트 목록 ===");
  const projects = await prisma.project.findMany({
    select: { id: true, name: true },
  });
  console.log(JSON.stringify(projects, null, 2));

  if (projects.length === 0) {
    console.log("프로젝트가 없습니다.");
    return;
  }

  const projectId = projects[0].id;
  console.log(`\n선택된 프로젝트: ${projects[0].name}\n`);

  console.log("=== 팀 멤버 목록 ===");
  const members = await prisma.teamMember.findMany({
    where: { projectId },
    include: {
      user: {
        select: { id: true, name: true, email: true },
      },
    },
  });
  console.log(JSON.stringify(members.map((m) => m.user), null, 2));

  console.log("\n=== 소부류(LEVEL3) 목록 및 단위업무 유무 ===");
  const level3Items = await prisma.wbsItem.findMany({
    where: {
      projectId,
      level: "LEVEL3",
    },
    include: {
      _count: {
        select: { children: true },
      },
    },
    orderBy: { code: "asc" },
  });

  const noTaskItems = [];
  for (const item of level3Items) {
    const hasChildren = item._count.children > 0;
    console.log(
      `${item.code} ${item.name}: ${hasChildren ? `✅ (${item._count.children}개)` : "❌ 단위업무 없음"}`
    );
    if (!hasChildren) {
      noTaskItems.push(item);
    }
  }

  console.log(`\n=== 단위업무가 없는 소부류: ${noTaskItems.length}개 ===`);
  noTaskItems.forEach((item) => {
    console.log(`  - ${item.code} ${item.name}`);
  });
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
