/**
 * @file scripts/seed-wbs.ts
 * @description
 * WBS 샘플 데이터를 DB에 등록하는 시드 스크립트입니다.
 * 방법론 기반의 4단계 계층 구조 샘플 데이터를 생성합니다.
 *
 * 실행 방법:
 * npx tsx scripts/seed-wbs.ts
 */

import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("🚀 WBS 샘플 데이터 생성 시작...\n");

  // 첫 번째 프로젝트 찾기
  const project = await prisma.project.findFirst();
  if (!project) {
    console.log("❌ 프로젝트가 없습니다. 먼저 프로젝트를 생성해주세요.");
    return;
  }

  console.log(`📁 프로젝트: ${project.name} (${project.id})\n`);

  // 기존 WBS 데이터 삭제
  await prisma.wbsItem.deleteMany({ where: { projectId: project.id } });
  console.log("🗑️  기존 WBS 데이터 삭제 완료\n");

  // ========================================
  // 1. 대분류 (LEVEL1) - 방법론 단계
  // ========================================
  console.log("📌 대분류 생성 중...");

  const level1Items = [
    { code: "1", name: "분석", order: 0 },
    { code: "2", name: "설계", order: 1 },
    { code: "3", name: "개발", order: 2 },
    { code: "4", name: "테스트", order: 3 },
    { code: "5", name: "이행", order: 4 },
  ];

  const createdLevel1: Record<string, string> = {};

  for (const item of level1Items) {
    const created = await prisma.wbsItem.create({
      data: {
        code: item.code,
        name: item.name,
        level: "LEVEL1",
        order: item.order,
        projectId: project.id,
        status: "PENDING",
        progress: 0,
      },
    });
    createdLevel1[item.code] = created.id;
    console.log(`   ✅ ${item.code}. ${item.name}`);
  }

  // ========================================
  // 2. 중분류 (LEVEL2)
  // ========================================
  console.log("\n📌 중분류 생성 중...");

  const level2Items = [
    // 분석
    { code: "1.1", name: "요구사항 분석", parentCode: "1", order: 0 },
    { code: "1.2", name: "현행 시스템 분석", parentCode: "1", order: 1 },
    { code: "1.3", name: "데이터 분석", parentCode: "1", order: 2 },
    // 설계
    { code: "2.1", name: "아키텍처 설계", parentCode: "2", order: 0 },
    { code: "2.2", name: "화면 설계", parentCode: "2", order: 1 },
    { code: "2.3", name: "DB 설계", parentCode: "2", order: 2 },
    { code: "2.4", name: "인터페이스 설계", parentCode: "2", order: 3 },
    // 개발
    { code: "3.1", name: "공통 모듈 개발", parentCode: "3", order: 0 },
    { code: "3.2", name: "화면 개발", parentCode: "3", order: 1 },
    { code: "3.3", name: "배치 개발", parentCode: "3", order: 2 },
    { code: "3.4", name: "인터페이스 개발", parentCode: "3", order: 3 },
    // 테스트
    { code: "4.1", name: "단위 테스트", parentCode: "4", order: 0 },
    { code: "4.2", name: "통합 테스트", parentCode: "4", order: 1 },
    { code: "4.3", name: "사용자 테스트", parentCode: "4", order: 2 },
    // 이행
    { code: "5.1", name: "이행 계획", parentCode: "5", order: 0 },
    { code: "5.2", name: "데이터 이행", parentCode: "5", order: 1 },
    { code: "5.3", name: "시스템 이행", parentCode: "5", order: 2 },
  ];

  const createdLevel2: Record<string, string> = {};

  for (const item of level2Items) {
    const created = await prisma.wbsItem.create({
      data: {
        code: item.code,
        name: item.name,
        level: "LEVEL2",
        order: item.order,
        projectId: project.id,
        parentId: createdLevel1[item.parentCode],
        status: "PENDING",
        progress: 0,
      },
    });
    createdLevel2[item.code] = created.id;
    console.log(`   ✅ ${item.code}. ${item.name}`);
  }

  // ========================================
  // 3. 소분류 (LEVEL3)
  // ========================================
  console.log("\n📌 소분류 생성 중...");

  const level3Items = [
    // 요구사항 분석
    { code: "1.1.1", name: "기능 요구사항 정의", parentCode: "1.1", order: 0 },
    { code: "1.1.2", name: "비기능 요구사항 정의", parentCode: "1.1", order: 1 },
    { code: "1.1.3", name: "요구사항 추적표 작성", parentCode: "1.1", order: 2 },
    // 현행 시스템 분석
    { code: "1.2.1", name: "AS-IS 프로세스 분석", parentCode: "1.2", order: 0 },
    { code: "1.2.2", name: "TO-BE 프로세스 설계", parentCode: "1.2", order: 1 },
    // 아키텍처 설계
    { code: "2.1.1", name: "시스템 구성도 작성", parentCode: "2.1", order: 0 },
    { code: "2.1.2", name: "기술 스택 선정", parentCode: "2.1", order: 1 },
    // 화면 설계
    { code: "2.2.1", name: "화면 목록 작성", parentCode: "2.2", order: 0 },
    { code: "2.2.2", name: "화면 정의서 작성", parentCode: "2.2", order: 1 },
    { code: "2.2.3", name: "프로토타입 작성", parentCode: "2.2", order: 2 },
    // DB 설계
    { code: "2.3.1", name: "ERD 작성", parentCode: "2.3", order: 0 },
    { code: "2.3.2", name: "테이블 정의서 작성", parentCode: "2.3", order: 1 },
    // 공통 모듈 개발
    { code: "3.1.1", name: "인증/인가 모듈", parentCode: "3.1", order: 0 },
    { code: "3.1.2", name: "로깅 모듈", parentCode: "3.1", order: 1 },
    { code: "3.1.3", name: "공통 유틸리티", parentCode: "3.1", order: 2 },
    // 화면 개발
    { code: "3.2.1", name: "메인 대시보드", parentCode: "3.2", order: 0 },
    { code: "3.2.2", name: "사용자 관리", parentCode: "3.2", order: 1 },
    { code: "3.2.3", name: "프로젝트 관리", parentCode: "3.2", order: 2 },
    // 단위 테스트
    { code: "4.1.1", name: "API 테스트", parentCode: "4.1", order: 0 },
    { code: "4.1.2", name: "UI 테스트", parentCode: "4.1", order: 1 },
    // 통합 테스트
    { code: "4.2.1", name: "시나리오 테스트", parentCode: "4.2", order: 0 },
    { code: "4.2.2", name: "성능 테스트", parentCode: "4.2", order: 1 },
  ];

  const createdLevel3: Record<string, string> = {};

  for (const item of level3Items) {
    const created = await prisma.wbsItem.create({
      data: {
        code: item.code,
        name: item.name,
        level: "LEVEL3",
        order: item.order,
        projectId: project.id,
        parentId: createdLevel2[item.parentCode],
        status: "PENDING",
        progress: 0,
      },
    });
    createdLevel3[item.code] = created.id;
    console.log(`   ✅ ${item.code}. ${item.name}`);
  }

  // ========================================
  // 4. 단위업무 (LEVEL4)
  // ========================================
  console.log("\n📌 단위업무 생성 중...");

  const level4Items = [
    // 기능 요구사항 정의
    { code: "1.1.1.1", name: "이해관계자 인터뷰", parentCode: "1.1.1", order: 0, progress: 100, status: "COMPLETED" },
    { code: "1.1.1.2", name: "요구사항 문서 초안 작성", parentCode: "1.1.1", order: 1, progress: 100, status: "COMPLETED" },
    { code: "1.1.1.3", name: "요구사항 검토 회의", parentCode: "1.1.1", order: 2, progress: 50, status: "IN_PROGRESS" },
    // 비기능 요구사항 정의
    { code: "1.1.2.1", name: "성능 요구사항 정의", parentCode: "1.1.2", order: 0, progress: 80, status: "IN_PROGRESS" },
    { code: "1.1.2.2", name: "보안 요구사항 정의", parentCode: "1.1.2", order: 1, progress: 30, status: "IN_PROGRESS" },
    // 화면 정의서 작성
    { code: "2.2.2.1", name: "로그인 화면 정의", parentCode: "2.2.2", order: 0, progress: 100, status: "COMPLETED" },
    { code: "2.2.2.2", name: "대시보드 화면 정의", parentCode: "2.2.2", order: 1, progress: 100, status: "COMPLETED" },
    { code: "2.2.2.3", name: "설정 화면 정의", parentCode: "2.2.2", order: 2, progress: 0, status: "PENDING" },
    // ERD 작성
    { code: "2.3.1.1", name: "개념적 ERD 작성", parentCode: "2.3.1", order: 0, progress: 100, status: "COMPLETED" },
    { code: "2.3.1.2", name: "논리적 ERD 작성", parentCode: "2.3.1", order: 1, progress: 60, status: "IN_PROGRESS" },
    { code: "2.3.1.3", name: "물리적 ERD 작성", parentCode: "2.3.1", order: 2, progress: 0, status: "PENDING" },
    // 인증/인가 모듈
    { code: "3.1.1.1", name: "JWT 토큰 발급 구현", parentCode: "3.1.1", order: 0, progress: 100, status: "COMPLETED" },
    { code: "3.1.1.2", name: "권한 체크 미들웨어", parentCode: "3.1.1", order: 1, progress: 100, status: "COMPLETED" },
    { code: "3.1.1.3", name: "소셜 로그인 연동", parentCode: "3.1.1", order: 2, progress: 20, status: "IN_PROGRESS" },
    // 메인 대시보드
    { code: "3.2.1.1", name: "대시보드 레이아웃", parentCode: "3.2.1", order: 0, progress: 100, status: "COMPLETED" },
    { code: "3.2.1.2", name: "위젯 컴포넌트", parentCode: "3.2.1", order: 1, progress: 70, status: "IN_PROGRESS" },
    { code: "3.2.1.3", name: "차트 컴포넌트", parentCode: "3.2.1", order: 2, progress: 40, status: "IN_PROGRESS" },
  ];

  for (const item of level4Items) {
    await prisma.wbsItem.create({
      data: {
        code: item.code,
        name: item.name,
        level: "LEVEL4",
        order: item.order,
        projectId: project.id,
        parentId: createdLevel3[item.parentCode],
        status: item.status as any,
        progress: item.progress,
      },
    });
    console.log(`   ✅ ${item.code}. ${item.name} (${item.progress}%)`);
  }

  // ========================================
  // 진행률 자동 계산 (하위 → 상위)
  // ========================================
  console.log("\n📊 진행률 계산 중...");

  // LEVEL3 진행률 계산
  for (const code of Object.keys(createdLevel3)) {
    const children = await prisma.wbsItem.findMany({
      where: { parentId: createdLevel3[code] },
    });
    if (children.length > 0) {
      const avgProgress = Math.round(
        children.reduce((sum, c) => sum + c.progress, 0) / children.length
      );
      await prisma.wbsItem.update({
        where: { id: createdLevel3[code] },
        data: {
          progress: avgProgress,
          status: avgProgress === 100 ? "COMPLETED" : avgProgress > 0 ? "IN_PROGRESS" : "PENDING"
        },
      });
    }
  }

  // LEVEL2 진행률 계산
  for (const code of Object.keys(createdLevel2)) {
    const children = await prisma.wbsItem.findMany({
      where: { parentId: createdLevel2[code] },
    });
    if (children.length > 0) {
      const avgProgress = Math.round(
        children.reduce((sum, c) => sum + c.progress, 0) / children.length
      );
      await prisma.wbsItem.update({
        where: { id: createdLevel2[code] },
        data: {
          progress: avgProgress,
          status: avgProgress === 100 ? "COMPLETED" : avgProgress > 0 ? "IN_PROGRESS" : "PENDING"
        },
      });
    }
  }

  // LEVEL1 진행률 계산
  for (const code of Object.keys(createdLevel1)) {
    const children = await prisma.wbsItem.findMany({
      where: { parentId: createdLevel1[code] },
    });
    if (children.length > 0) {
      const avgProgress = Math.round(
        children.reduce((sum, c) => sum + c.progress, 0) / children.length
      );
      await prisma.wbsItem.update({
        where: { id: createdLevel1[code] },
        data: {
          progress: avgProgress,
          status: avgProgress === 100 ? "COMPLETED" : avgProgress > 0 ? "IN_PROGRESS" : "PENDING"
        },
      });
    }
  }

  // 통계
  const totalItems = await prisma.wbsItem.count({ where: { projectId: project.id } });
  console.log(`\n✅ WBS 샘플 데이터 생성 완료!`);
  console.log(`   - 총 ${totalItems}개 항목 생성`);
  console.log(`   - 대분류: ${level1Items.length}개`);
  console.log(`   - 중분류: ${level2Items.length}개`);
  console.log(`   - 소분류: ${level3Items.length}개`);
  console.log(`   - 단위업무: ${level4Items.length}개`);
}

main()
  .catch(console.error)
  .finally(() => {
    pool.end();
    process.exit(0);
  });
