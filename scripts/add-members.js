/**
 * @file scripts/add-members.js
 * @description
 * 프로젝트 멤버 일괄 등록 스크립트
 * 실행: node scripts/add-members.js
 */

const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function main() {
  // 1. 프로젝트 확인
  const projects = await prisma.project.findMany();
  console.log("프로젝트 목록:");
  projects.forEach((p) => console.log(`  - ${p.id}: ${p.name}`));

  if (projects.length === 0) {
    console.log("프로젝트가 없습니다.");
    return;
  }

  const projectId = projects[0].id;
  console.log(`\n사용할 프로젝트: ${projects[0].name}`);

  // 2. 멤버 정보
  const members = [
    { name: "김형기", role: "PM" },
    { name: "유성만", role: "PL" },
    { name: "이두한", role: "PL" },
    { name: "최종무", role: "PL" },
    { name: "이재영", role: "PM" },
    { name: "김형진", role: "PL" },
  ];

  // 3. 사용자 생성 및 팀 멤버 등록
  for (const member of members) {
    // 이름을 영문으로 변환하여 이메일 생성
    const emailName = member.name.replace(/\s/g, "").toLowerCase();
    const email = `${emailName}@example.com`;

    // 사용자 생성 또는 조회
    let user = await prisma.user.findFirst({
      where: { name: member.name },
    });

    if (!user) {
      user = await prisma.user.create({
        data: {
          email,
          name: member.name,
          role: member.role === "PM" ? "PM" : "PL",
        },
      });
      console.log(`사용자 생성: ${member.name} (${email})`);
    } else {
      console.log(`사용자 존재: ${member.name}`);
    }

    // 팀 멤버 등록 확인
    const existingMember = await prisma.teamMember.findUnique({
      where: {
        projectId_userId: {
          projectId,
          userId: user.id,
        },
      },
    });

    if (!existingMember) {
      await prisma.teamMember.create({
        data: {
          projectId,
          userId: user.id,
          role: "MEMBER",
          customRole: member.role,
        },
      });
      console.log(`팀 멤버 등록: ${member.name} (${member.role})`);
    } else {
      console.log(`팀 멤버 이미 등록됨: ${member.name}`);
    }
  }

  console.log("\n완료!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
