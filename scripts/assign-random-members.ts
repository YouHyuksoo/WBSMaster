/**
 * @file scripts/assign-random-members.ts
 * @description
 * WBS 항목 중 말단 작업(Leaf Node)이면서 담당자가 없는 항목에 대해
 * 프로젝트 멤버 중 한 명을 무작위로 배정하는 스크립트입니다.
 *
 * 실행 방법:
 * npx tsx scripts/assign-random-members.ts
 */

import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import * as dotenv from "dotenv";

// .env.local 파일 로드
dotenv.config({ path: ".env.local" });

// PostgreSQL 연결 풀 생성
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Prisma adapter 방식으로 연결
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

/**
 * 무작위로 배열 요소 선택
 */
function randomPick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

async function main() {
  console.log("🚀 WBS 담당자 무작위 배정 스크립트 시작...\n");

  // 1. 모든 프로젝트 상태 조회
  const projects = await prisma.project.findMany({
    include: {
      _count: {
        select: {
          teamMembers: true,
          wbsItems: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  if (projects.length === 0) {
    console.log("❌ 프로젝트가 없습니다. 먼저 프로젝트를 생성해주세요.");
    return;
  }

  console.log("📊 프로젝트 목록:");
  projects.forEach((p, idx) => {
    console.log(
      `   ${idx + 1}. [${p.name}] (ID: ${p.id}) - 멤버: ${p._count.teamMembers}명, WBS: ${p._count.wbsItems}개`
    );
  });
  console.log();

  // 2. 대상 프로젝트 선정 (WBS 항목이 가장 많은 프로젝트 우선, 없으면 최신)
  // WBS 항목이 있는 프로젝트 중 가장 많은 것을 선택
  const targetProject = projects.reduce((prev, current) => {
    return (prev._count.wbsItems > current._count.wbsItems) ? prev : current;
  });

  if (targetProject._count.wbsItems === 0) {
     // WBS가 아무도 없으면 그냥 최신 프로젝트 선택
     console.log("⚠️ WBS 항목이 있는 프로젝트가 없습니다. 가장 최근 프로젝트를 선택합니다.");
  }

  console.log(`✅ 선택된 프로젝트: ${targetProject.name} (${targetProject.id})`);

  // 3. 팀 멤버 및 사용자 확인 (특정 인원 필터링)
  const targetNames = ["이두한", "김형기", "유성만", "이재영", "최종무"];
  console.log(`🎯 지정된 배정 대상: ${targetNames.join(", ")}`);

  let teamMembers = await prisma.teamMember.findMany({
    where: { projectId: targetProject.id },
    include: {
      user: { select: { id: true, name: true, email: true } },
    },
  });

  // 지정된 멤버들이 프로젝트에 있는지 확인하고, 없으면 시스템 전체 사용자에서 찾아 추가
  const currentMemberNames = new Set(teamMembers.map(m => m.user.name));
  const missingNames = targetNames.filter(name => !currentMemberNames.has(name));

  if (missingNames.length > 0) {
    console.log(`⚡ 일부 대상 멤버(${missingNames.join(", ")})가 프로젝트에 없어 추가를 시도합니다...`);
    
    // 전체 사용자 중 이름이 일치하는 사람 찾기
    const usersToAdd = await prisma.user.findMany({
      where: { name: { in: missingNames } }
    });

    if (usersToAdd.length > 0) {
       const existingMemberIds = new Set(teamMembers.map(m => m.userId));
       const newMembersData = usersToAdd
        .filter(u => !existingMemberIds.has(u.id))
        .map(u => ({
          projectId: targetProject.id,
          userId: u.id,
          role: "MEMBER" as const,
          joinedAt: new Date(),
        }));

      if (newMembersData.length > 0) {
        await prisma.teamMember.createMany({
          data: newMembersData,
        });
        console.log(`   + ${newMembersData.length}명을 팀 멤버로 추가했습니다.`);
        
        // 목록 갱신
        teamMembers = await prisma.teamMember.findMany({
          where: { projectId: targetProject.id },
          include: {
            user: { select: { id: true, name: true, email: true } },
          },
        });
      }
    } else {
      console.log(`   ⚠️ 경고: 이름이 일치하는 사용자를 시스템에서 찾을 수 없습니다: ${missingNames.join(", ")}`);
    }
  }

  // 최종적으로 지정된 이름의 멤버만 필터링
  teamMembers = teamMembers.filter(m => m.user.name && targetNames.includes(m.user.name));

  if (teamMembers.length === 0) {
    console.log("❌ 배정 가능한 멤버가 없습니다. 사용자 이름을 확인해주세요.");
    return;
  }

  console.log(`   -> 최종 배정 가능 멤버 (${teamMembers.length}명):`);
  teamMembers.forEach(m => console.log(`      - ${m.user.name}`));
  console.log();

  // 4. WBS 항목 조회 (Leaf 노드 판별)
  const allWbsItems = await prisma.wbsItem.findMany({
    where: { projectId: targetProject.id },
    include: {
      children: { select: { id: true } }, // 자식 존재 여부 확인용
    },
  });

  // 모든 말단 작업(Leaf Node) 필터링
  const targetItems = allWbsItems.filter((item) => item.children.length === 0);

  console.log(`📋 전체 WBS 항목: ${allWbsItems.length}개`);
  console.log(`🎯 배정 대상 (모든 말단 작업): ${targetItems.length}개`);

  if (targetItems.length === 0) {
    console.log("⚠️ WBS 말단 작업이 하나도 없습니다. scripts/fill-wbs-tasks.ts를 먼저 실행해주세요.");
    return;
  }

  // 기존 담당자 초기화
  console.log(`\n🧹 기존 담당자 배정 내역 초기화 중...`);
  const targetItemIds = targetItems.map(item => item.id);
  const deleteResult = await prisma.wbsAssignee.deleteMany({
    where: { wbsItemId: { in: targetItemIds } },
  });
  console.log(`   - ${deleteResult.count}건의 기존 배정 내역 삭제 완료`);

  // 5. 무작위 배정 실행
  let assignedCount = 0;
  console.log("\n⚡ 담당자 배정 시작...");

  for (const item of targetItems) {
    const randomMember = randomPick(teamMembers);
    
    await prisma.wbsAssignee.create({
      data: {
        wbsItemId: item.id,
        userId: randomMember.userId,
      },
    });

    // 로그가 너무 길어지지 않게 일부만 출력하거나 간략히 출력
    if (assignedCount < 5 || assignedCount % 10 === 0) {
        console.log(`   [${item.code}] ${item.name} -> ${randomMember.user.name || randomMember.user.email}`);
    }
    assignedCount++;
  }

  console.log(`\n✅ 배정 완료! 총 ${assignedCount}개의 항목에 담당자가 배정되었습니다.`);
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
