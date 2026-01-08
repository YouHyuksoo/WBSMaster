/**
 * @file scripts/fill-wbs-tasks.ts
 * @description
 * 단위업무(LEVEL4)가 없는 소부류(LEVEL3)에 단위업무를 자동 생성하는 스크립트입니다.
 * - 각 소부류에 2~4개의 단위업무를 무작위로 생성
 * - 날짜는 프로젝트 기간 내에서 무작위 배정
 * - 담당자는 팀 멤버 중에서 무작위 배정
 *
 * 실행 방법:
 * npx tsx scripts/fill-wbs-tasks.ts
 */

import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import * as dotenv from "dotenv";

// .env 로드
dotenv.config({ path: ".env" });

// PostgreSQL 연결 풀 생성
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Prisma adapter 방식으로 연결
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

/**
 * 소부류별 단위업무 템플릿
 * 각 소부류 코드에 맞는 단위업무 이름들
 */
const taskTemplates: Record<string, string[]> = {
  // 분석 > 요구사항 분석
  "1.1.1": ["이해관계자 인터뷰", "요구사항 문서 초안 작성", "요구사항 검토 회의", "요구사항 확정"],
  "1.1.2": ["성능 요구사항 정의", "보안 요구사항 정의", "확장성 요구사항 정의"],
  "1.1.3": ["요구사항 추적표 초안", "요구사항 ID 체계 수립", "추적표 검증"],

  // 분석 > 현행 시스템 분석
  "1.2.1": ["현행 시스템 인터뷰", "AS-IS 프로세스 맵 작성", "문제점 도출"],
  "1.2.2": ["TO-BE 프로세스 초안", "GAP 분석", "TO-BE 프로세스 확정"],

  // 설계 > 아키텍처 설계
  "2.1.1": ["인프라 구성도 작성", "논리 아키텍처 설계", "물리 아키텍처 설계"],
  "2.1.2": ["프레임워크 조사", "기술 스택 비교 분석", "기술 스택 확정"],

  // 설계 > 화면 설계
  "2.2.1": ["화면 목록 초안 작성", "화면 분류 체계 수립", "화면 목록 검토"],
  "2.2.2": ["로그인 화면 정의", "대시보드 화면 정의", "설정 화면 정의", "목록 화면 정의"],
  "2.2.3": ["와이어프레임 작성", "인터랙션 정의", "프로토타입 검토"],

  // 설계 > DB 설계
  "2.3.1": ["개념적 ERD 작성", "논리적 ERD 작성", "물리적 ERD 작성"],
  "2.3.2": ["테이블 정의서 초안", "컬럼 명세 작성", "인덱스 설계", "테이블 정의서 검토"],

  // 개발 > 공통 모듈 개발
  "3.1.1": ["JWT 토큰 발급 구현", "권한 체크 미들웨어", "세션 관리", "소셜 로그인 연동"],
  "3.1.2": ["로그 포맷 정의", "로그 수집 구현", "로그 뷰어 연동"],
  "3.1.3": ["날짜 유틸리티", "문자열 유틸리티", "검증 유틸리티"],

  // 개발 > 화면 개발
  "3.2.1": ["레이아웃 컴포넌트", "위젯 컴포넌트", "차트 컴포넌트", "대시보드 통합"],
  "3.2.2": ["사용자 목록 화면", "사용자 등록 화면", "사용자 상세 화면", "권한 관리 화면"],
  "3.2.3": ["프로젝트 목록", "프로젝트 생성", "프로젝트 상세", "프로젝트 설정"],

  // 개발 > 배치 개발
  "3.3.1": ["배치 스케줄러 설정", "배치 로그 관리", "배치 모니터링"],
  "3.3.2": ["일일 집계 배치", "월간 리포트 배치", "데이터 정리 배치"],

  // 개발 > 인터페이스 개발
  "3.4.1": ["외부 API 연동 모듈", "API 응답 파싱", "에러 핸들링"],
  "3.4.2": ["내부 시스템 연동", "데이터 변환 로직", "연동 테스트"],

  // 테스트 > 단위 테스트
  "4.1.1": ["API 엔드포인트 테스트", "서비스 레이어 테스트", "유틸리티 테스트"],
  "4.1.2": ["컴포넌트 렌더링 테스트", "사용자 인터랙션 테스트", "스냅샷 테스트"],

  // 테스트 > 통합 테스트
  "4.2.1": ["로그인 시나리오", "CRUD 시나리오", "결제 시나리오", "알림 시나리오"],
  "4.2.2": ["부하 테스트", "스트레스 테스트", "성능 병목 분석"],

  // 테스트 > 사용자 테스트
  "4.3.1": ["UAT 시나리오 작성", "UAT 환경 구성", "UAT 실행"],
  "4.3.2": ["사용자 피드백 수집", "피드백 분석", "개선사항 도출"],

  // 이행 > 이행 계획
  "5.1.1": ["이행 일정 수립", "역할 분담", "비상 연락망 구성"],
  "5.1.2": ["이행 체크리스트", "롤백 계획", "이행 리허설"],

  // 이행 > 데이터 이행
  "5.2.1": ["데이터 매핑 정의", "이행 스크립트 작성", "데이터 검증 로직"],
  "5.2.2": ["테스트 이행", "데이터 정합성 검증", "이행 결과 리포트"],

  // 이행 > 시스템 이행
  "5.3.1": ["운영 환경 구성", "배포 스크립트", "환경 변수 설정"],
  "5.3.2": ["시스템 전환", "서비스 오픈", "안정화 모니터링"],
};

/**
 * 기본 단위업무 이름 (템플릿이 없는 경우)
 */
const defaultTasks = [
  "요건 정의",
  "설계 검토",
  "개발 작업",
  "테스트 수행",
  "문서화",
];

/**
 * 무작위로 배열 요소 선택
 */
function randomPick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

/**
 * 날짜 범위 내 무작위 날짜 생성
 */
function randomDate(start: Date, end: Date): Date {
  const startTime = start.getTime();
  const endTime = end.getTime();
  const randomTime = startTime + Math.random() * (endTime - startTime);
  return new Date(randomTime);
}

/**
 * 무작위 진행률 생성 (0, 20, 40, 60, 80, 100)
 */
function randomProgress(): number {
  const options = [0, 20, 40, 60, 80, 100];
  return randomPick(options);
}

/**
 * 진행률에 따른 상태 결정
 */
function getStatusFromProgress(progress: number): "PENDING" | "IN_PROGRESS" | "COMPLETED" {
  if (progress === 0) return "PENDING";
  if (progress === 100) return "COMPLETED";
  return "IN_PROGRESS";
}

async function main() {
  console.log("🚀 단위업무 자동 생성 시작...\n");

  // 1. 프로젝트 찾기
  const project = await prisma.project.findFirst({
    orderBy: { createdAt: "desc" },
  });

  if (!project) {
    console.log("❌ 프로젝트가 없습니다. 먼저 프로젝트를 생성해주세요.");
    return;
  }

  console.log(`📁 프로젝트: ${project.name} (${project.id})\n`);

  // 2. 팀 멤버 목록 조회
  const teamMembers = await prisma.teamMember.findMany({
    where: { projectId: project.id },
    include: {
      user: { select: { id: true, name: true } },
    },
  });

  if (teamMembers.length === 0) {
    console.log("❌ 팀 멤버가 없습니다. 먼저 팀 멤버를 등록해주세요.");
    return;
  }

  console.log("👥 팀 멤버:");
  teamMembers.forEach((m) => {
    console.log(`   - ${m.user.name} (${m.customRole || m.role})`);
  });
  console.log();

  // 3. 단위업무가 없는 소부류 찾기
  const level3Items = await prisma.wbsItem.findMany({
    where: {
      projectId: project.id,
      level: "LEVEL3",
    },
    include: {
      _count: { select: { children: true } },
    },
    orderBy: { code: "asc" },
  });

  const noTaskItems = level3Items.filter((item) => item._count.children === 0);

  console.log(`📋 소부류 총 ${level3Items.length}개 중 단위업무 없는 항목: ${noTaskItems.length}개\n`);

  if (noTaskItems.length === 0) {
    console.log("✅ 모든 소부류에 단위업무가 있습니다.");
    return;
  }

  // 4. 프로젝트 기간 설정 (없으면 기본값 사용)
  const projectStart = project.startDate || new Date("2025-01-01");
  const projectEnd = project.endDate || new Date("2025-12-31");

  console.log(`📅 프로젝트 기간: ${projectStart.toISOString().split("T")[0]} ~ ${projectEnd.toISOString().split("T")[0]}\n`);

  // 5. 각 소부류에 단위업무 생성
  let totalCreated = 0;

  for (const parent of noTaskItems) {
    console.log(`\n📌 ${parent.code} ${parent.name}에 단위업무 추가 중...`);

    // 해당 소부류에 맞는 작업 템플릿 가져오기
    const tasks = taskTemplates[parent.code] || defaultTasks;

    // 기존 자식 수 확인 (코드 생성용)
    let siblingCount = await prisma.wbsItem.count({
      where: { parentId: parent.id },
    });

    for (let i = 0; i < tasks.length; i++) {
      const taskName = tasks[i];
      const taskCode = `${parent.code}.${siblingCount + 1}`;

      // 무작위 날짜 생성 (시작일 ~ 종료일)
      const startDate = randomDate(projectStart, projectEnd);
      const endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + Math.floor(Math.random() * 14) + 3); // 3~16일 후

      // 무작위 진행률 및 상태
      const progress = randomProgress();
      const status = getStatusFromProgress(progress);

      // 무작위 담당자 선택
      const assignee = randomPick(teamMembers);

      // 단위업무 생성
      const newTask = await prisma.wbsItem.create({
        data: {
          code: taskCode,
          name: taskName,
          level: "LEVEL4",
          order: siblingCount,
          projectId: project.id,
          parentId: parent.id,
          status,
          progress,
          startDate,
          endDate,
          weight: 1,
          assignees: {
            create: { userId: assignee.user.id },
          },
        },
      });

      console.log(`   ✅ ${taskCode} ${taskName} (${progress}%) - ${assignee.user.name}`);
      siblingCount++;
      totalCreated++;
    }

    // 부모(소부류) 진행률 업데이트
    const childTasks = await prisma.wbsItem.findMany({
      where: { parentId: parent.id },
    });

    if (childTasks.length > 0) {
      const avgProgress = Math.round(
        childTasks.reduce((sum, c) => sum + c.progress, 0) / childTasks.length
      );
      await prisma.wbsItem.update({
        where: { id: parent.id },
        data: {
          progress: avgProgress,
          status: avgProgress === 100 ? "COMPLETED" : avgProgress > 0 ? "IN_PROGRESS" : "PENDING",
        },
      });
    }
  }

  // 6. 상위 레벨(LEVEL2, LEVEL1) 진행률 업데이트
  console.log("\n📊 상위 레벨 진행률 업데이트 중...");

  // LEVEL2 업데이트
  const level2Items = await prisma.wbsItem.findMany({
    where: { projectId: project.id, level: "LEVEL2" },
  });

  for (const item of level2Items) {
    const children = await prisma.wbsItem.findMany({
      where: { parentId: item.id },
    });
    if (children.length > 0) {
      const avgProgress = Math.round(
        children.reduce((sum, c) => sum + c.progress, 0) / children.length
      );
      await prisma.wbsItem.update({
        where: { id: item.id },
        data: {
          progress: avgProgress,
          status: avgProgress === 100 ? "COMPLETED" : avgProgress > 0 ? "IN_PROGRESS" : "PENDING",
        },
      });
    }
  }

  // LEVEL1 업데이트
  const level1Items = await prisma.wbsItem.findMany({
    where: { projectId: project.id, level: "LEVEL1" },
  });

  for (const item of level1Items) {
    const children = await prisma.wbsItem.findMany({
      where: { parentId: item.id },
    });
    if (children.length > 0) {
      const avgProgress = Math.round(
        children.reduce((sum, c) => sum + c.progress, 0) / children.length
      );
      await prisma.wbsItem.update({
        where: { id: item.id },
        data: {
          progress: avgProgress,
          status: avgProgress === 100 ? "COMPLETED" : avgProgress > 0 ? "IN_PROGRESS" : "PENDING",
        },
      });
    }
  }

  // 7. 완료 메시지
  console.log(`\n✅ 단위업무 자동 생성 완료!`);
  console.log(`   - 총 ${totalCreated}개 단위업무 생성`);
  console.log(`   - ${noTaskItems.length}개 소부류에 단위업무 추가됨`);
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
