/**
 * @file scripts/seed-issues.ts
 * @description
 * 이슈 샘플 데이터를 DB에 등록하는 시드 스크립트입니다.
 * 다양한 상태와 카테고리의 이슈 샘플 데이터를 생성합니다.
 *
 * 실행 방법:
 * npx tsx scripts/seed-issues.ts
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
  console.log("🚀 이슈 샘플 데이터 생성 시작...\n");

  // 첫 번째 프로젝트 찾기
  const project = await prisma.project.findFirst();
  if (!project) {
    console.log("❌ 프로젝트가 없습니다. 먼저 프로젝트를 생성해주세요.");
    return;
  }

  console.log(`📁 프로젝트: ${project.name} (${project.id})\n`);

  // 팀 멤버 조회 (보고자/담당자 할당용)
  const teamMembers = await prisma.teamMember.findMany({
    where: { projectId: project.id },
    include: { user: true },
  });

  const memberIds = teamMembers.map((m) => m.userId);
  console.log(`👥 팀 멤버: ${teamMembers.length}명\n`);

  // 기존 이슈 데이터 삭제
  const deleted = await prisma.issue.deleteMany({ where: { projectId: project.id } });
  console.log(`🗑️  기존 이슈 데이터 ${deleted.count}개 삭제 완료\n`);

  // 오늘 날짜 기준으로 날짜 계산
  const today = new Date();
  const daysAgo = (days: number) => {
    const date = new Date(today);
    date.setDate(date.getDate() - days);
    return date;
  };
  const daysLater = (days: number) => {
    const date = new Date(today);
    date.setDate(date.getDate() + days);
    return date;
  };

  // 랜덤 멤버 선택
  const randomMember = () => memberIds.length > 0 ? memberIds[Math.floor(Math.random() * memberIds.length)] : null;

  // ========================================
  // 이슈 샘플 데이터
  // ========================================
  const issueData = [
    // 버그 - 긴급
    {
      code: "ISS-001",
      title: "로그인 시 간헐적으로 세션 만료 오류 발생",
      description: "사용자가 로그인 후 일정 시간이 지나면 세션이 만료되지 않았음에도 세션 만료 오류가 발생합니다. 재현율 약 30%",
      status: "IN_PROGRESS",
      priority: "CRITICAL",
      category: "BUG",
      reportDate: daysAgo(5),
      dueDate: daysLater(2),
      isDelayed: false,
    },
    // 버그 - 높음
    {
      code: "ISS-002",
      title: "대시보드 차트가 모바일에서 깨짐",
      description: "모바일 기기에서 대시보드 접속 시 차트가 화면 밖으로 넘어가거나 레이아웃이 깨지는 현상",
      status: "OPEN",
      priority: "HIGH",
      category: "BUG",
      reportDate: daysAgo(3),
      dueDate: daysLater(5),
      isDelayed: false,
    },
    // 버그 - 보통
    {
      code: "ISS-003",
      title: "Excel 다운로드 시 한글 깨짐",
      description: "프로젝트 목록을 Excel로 다운로드하면 한글이 깨져서 출력됩니다. UTF-8 인코딩 문제로 추정",
      status: "RESOLVED",
      priority: "MEDIUM",
      category: "BUG",
      reportDate: daysAgo(10),
      dueDate: daysAgo(3),
      resolvedDate: daysAgo(2),
      isDelayed: false,
    },
    // 개선 - 높음
    {
      code: "ISS-004",
      title: "페이지 로딩 속도 개선 필요",
      description: "WBS 페이지 로딩이 3초 이상 걸립니다. 데이터가 많아질수록 느려지는 현상. 페이지네이션 또는 가상 스크롤 적용 필요",
      status: "OPEN",
      priority: "HIGH",
      category: "IMPROVEMENT",
      reportDate: daysAgo(7),
      dueDate: daysLater(10),
      isDelayed: false,
    },
    // 개선 - 보통
    {
      code: "ISS-005",
      title: "다크모드 색상 대비 개선",
      description: "다크모드에서 일부 텍스트의 색상 대비가 낮아 가독성이 떨어집니다. WCAG 2.1 기준 충족 필요",
      status: "IN_PROGRESS",
      priority: "MEDIUM",
      category: "IMPROVEMENT",
      reportDate: daysAgo(14),
      dueDate: daysAgo(1),
      isDelayed: true,
    },
    // 신규기능
    {
      code: "ISS-006",
      title: "이메일 알림 기능 추가 요청",
      description: "태스크 마감일 D-1, D-day에 이메일로 알림을 받고 싶습니다. 설정에서 ON/OFF 가능하도록",
      status: "OPEN",
      priority: "MEDIUM",
      category: "FEATURE",
      reportDate: daysAgo(20),
      dueDate: daysLater(30),
      isDelayed: false,
    },
    // 문의
    {
      code: "ISS-007",
      title: "API 문서에 누락된 엔드포인트 있음",
      description: "/api/wbs/bulk-update 엔드포인트가 API 문서에 없습니다. 문서 업데이트 요청드립니다.",
      status: "RESOLVED",
      priority: "LOW",
      category: "DOCUMENTATION",
      reportDate: daysAgo(8),
      dueDate: daysAgo(5),
      resolvedDate: daysAgo(6),
      isDelayed: false,
    },
    // 문의
    {
      code: "ISS-008",
      title: "권한별 접근 가능 페이지가 어떻게 되나요?",
      description: "MEMBER 권한으로 접근 가능한 페이지 목록이 궁금합니다. 현재 설정 페이지 접근이 안 되는데 의도된 건지 확인 필요",
      status: "CLOSED",
      priority: "LOW",
      category: "QUESTION",
      reportDate: daysAgo(12),
      resolvedDate: daysAgo(11),
      isDelayed: false,
    },
    // 버그 - 지연
    {
      code: "ISS-009",
      title: "파일 업로드 시 용량 제한 오류 메시지 미표시",
      description: "10MB 이상 파일 업로드 시 아무 반응 없이 실패합니다. 적절한 오류 메시지 표시 필요",
      status: "IN_PROGRESS",
      priority: "HIGH",
      category: "BUG",
      reportDate: daysAgo(15),
      dueDate: daysAgo(5),
      isDelayed: true,
    },
    // 기타
    {
      code: "ISS-010",
      title: "테스트 서버 SSL 인증서 만료 예정",
      description: "테스트 서버의 SSL 인증서가 2주 후 만료 예정입니다. 갱신 절차 진행 필요",
      status: "OPEN",
      priority: "MEDIUM",
      category: "OTHER",
      reportDate: daysAgo(2),
      dueDate: daysLater(10),
      isDelayed: false,
    },
    // 버그 - 완료
    {
      code: "ISS-011",
      title: "회원가입 시 이메일 인증 메일 발송 안됨",
      description: "신규 회원가입 시 이메일 인증 메일이 발송되지 않는 문제. SMTP 설정 확인 필요",
      status: "CLOSED",
      priority: "CRITICAL",
      category: "BUG",
      reportDate: daysAgo(30),
      dueDate: daysAgo(28),
      resolvedDate: daysAgo(29),
      isDelayed: false,
    },
    // 개선
    {
      code: "ISS-012",
      title: "칸반보드에 드래그앤드롭 기능 추가",
      description: "현재 칸반보드에서 태스크 이동 시 버튼 클릭 방식인데, 드래그앤드롭으로 변경 요청",
      status: "OPEN",
      priority: "LOW",
      category: "IMPROVEMENT",
      reportDate: daysAgo(25),
      dueDate: daysLater(20),
      isDelayed: false,
    },
  ];

  // ========================================
  // 이슈 생성
  // ========================================
  console.log("📌 이슈 생성 중...\n");

  for (const issue of issueData) {
    const created = await prisma.issue.create({
      data: {
        code: issue.code,
        title: issue.title,
        description: issue.description,
        status: issue.status as any,
        priority: issue.priority as any,
        category: issue.category as any,
        reportDate: issue.reportDate,
        dueDate: issue.dueDate || null,
        resolvedDate: issue.resolvedDate || null,
        isDelayed: issue.isDelayed,
        projectId: project.id,
        reporterId: randomMember(),
        assigneeId: randomMember(),
      },
    });

    const priorityEmoji = {
      CRITICAL: "🔴",
      HIGH: "🟠",
      MEDIUM: "🟡",
      LOW: "🟢",
    }[issue.priority] || "⚪";

    const statusEmoji = {
      OPEN: "📭",
      IN_PROGRESS: "🔄",
      RESOLVED: "✅",
      CLOSED: "🔒",
      WONT_FIX: "⏭️",
    }[issue.status] || "❓";

    console.log(`   ${statusEmoji} ${priorityEmoji} ${issue.code}: ${issue.title}`);
  }

  // ========================================
  // 통계
  // ========================================
  const totalIssues = await prisma.issue.count({ where: { projectId: project.id } });
  const openCount = await prisma.issue.count({ where: { projectId: project.id, status: "OPEN" } });
  const inProgressCount = await prisma.issue.count({ where: { projectId: project.id, status: "IN_PROGRESS" } });
  const resolvedCount = await prisma.issue.count({ where: { projectId: project.id, status: { in: ["RESOLVED", "CLOSED"] } } });
  const delayedCount = await prisma.issue.count({ where: { projectId: project.id, isDelayed: true } });

  console.log(`\n✅ 이슈 샘플 데이터 생성 완료!`);
  console.log(`   - 총 ${totalIssues}개 이슈 생성`);
  console.log(`   - 열림: ${openCount}개`);
  console.log(`   - 진행중: ${inProgressCount}개`);
  console.log(`   - 해결됨/종료: ${resolvedCount}개`);
  console.log(`   - 지연: ${delayedCount}개`);
}

main()
  .catch(console.error)
  .finally(() => {
    pool.end();
    process.exit(0);
  });
