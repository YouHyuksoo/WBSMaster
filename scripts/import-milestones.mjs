/**
 * @file scripts/import-milestones.mjs
 * @description
 * 이미지에서 분석한 마일스톤/핀포인트 데이터를 DB에 삽입하는 스크립트
 *
 * 실행: node scripts/import-milestones.mjs
 */

import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import dotenv from 'dotenv';

// .env.local 로드
dotenv.config({ path: '.env.local' });

const { Pool } = pg;

// DB 연결
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

// 날짜 형식 변환 헬퍼 (YYYY-MM-DD -> ISO DateTime)
const toDateTime = (dateStr) => `${dateStr}T00:00:00.000Z`;

async function main() {
  // 프로젝트 찾기 (행성 MES V2)
  const project = await prisma.project.findFirst({
    where: { name: { contains: 'MES' } }
  });

  if (!project) {
    console.log('❌ MES 프로젝트를 찾을 수 없습니다.');
    return;
  }

  console.log(`✅ 프로젝트 발견: ${project.name} (${project.id})`);

  // 기존 데이터 삭제 (선택적)
  const deleteExisting = true;
  if (deleteExisting) {
    await prisma.pinpoint.deleteMany({ where: { projectId: project.id } });
    await prisma.milestone.deleteMany({ where: { projectId: project.id } });
    await prisma.timelineRow.deleteMany({ where: { projectId: project.id } });
    console.log('🗑️ 기존 데이터 삭제 완료');
  }

  // ========================================
  // 1. 그룹 행 생성
  // ========================================
  const groupRows = [
    { name: '주요 일정', color: '#EF4444', order: 0 },  // 빨강 (핀포인트용)
    { name: 'MES 구축', color: '#F97316', order: 1 },   // 주황
    { name: 'INFRA', color: '#3B82F6', order: 2 },      // 파랑
  ];

  const createdGroups = {};
  for (const group of groupRows) {
    const row = await prisma.timelineRow.create({
      data: {
        name: group.name,
        color: group.color,
        order: group.order,
        projectId: project.id,
        parentId: null,
      }
    });
    createdGroups[group.name] = row;
    console.log(`📁 그룹 생성: ${group.name}`);
  }

  // ========================================
  // 2. MES 구축 하위 행 생성
  // ========================================
  const mesSubRows = [
    { name: '업무 분석', color: '#F97316', order: 0 },
    { name: '시스템 분석', color: '#F97316', order: 1 },
    { name: '요구사항', color: '#F97316', order: 2 },
    { name: '개발', color: '#F97316', order: 3 },
    { name: '테스트/운영', color: '#F97316', order: 4 },
  ];

  const mesGroup = createdGroups['MES 구축'];
  const mesSubRowsCreated = {};
  for (const subRow of mesSubRows) {
    const row = await prisma.timelineRow.create({
      data: {
        name: subRow.name,
        color: subRow.color,
        order: subRow.order,
        projectId: project.id,
        parentId: mesGroup.id,
      }
    });
    mesSubRowsCreated[subRow.name] = row;
  }
  console.log(`  └─ MES 구축 하위 행 ${mesSubRows.length}개 생성`);

  // ========================================
  // 3. INFRA 하위 행 생성
  // ========================================
  const infraSubRows = [
    { name: '서버/환경', color: '#3B82F6', order: 0 },
    { name: '단말기/설비', color: '#3B82F6', order: 1 },
  ];

  const infraGroup = createdGroups['INFRA'];
  const infraSubRowsCreated = {};
  for (const subRow of infraSubRows) {
    const row = await prisma.timelineRow.create({
      data: {
        name: subRow.name,
        color: subRow.color,
        order: subRow.order,
        projectId: project.id,
        parentId: infraGroup.id,
      }
    });
    infraSubRowsCreated[subRow.name] = row;
  }
  console.log(`  └─ INFRA 하위 행 ${infraSubRows.length}개 생성`);

  // ========================================
  // 4. 핀포인트 생성 (주요 일정)
  // ========================================
  const pinpoints = [
    { name: '착수보고', date: '2025-12-18T00:00:00.000Z', color: '#3B82F6' },  // 파란색
    { name: '설계보고', date: '2026-03-04T00:00:00.000Z', color: '#EF4444' },  // 빨간색
    { name: 'Pre Open', date: '2026-06-15T00:00:00.000Z', color: '#EF4444' },
    { name: '시스템 오픈', date: '2026-07-01T00:00:00.000Z', color: '#EF4444' },
    { name: '완료보고', date: '2026-07-28T00:00:00.000Z', color: '#EF4444' },
  ];

  const mainScheduleRow = createdGroups['주요 일정'];
  for (const pp of pinpoints) {
    await prisma.pinpoint.create({
      data: {
        name: pp.name,
        date: pp.date,
        color: pp.color,
        projectId: project.id,
        rowId: mainScheduleRow.id,
      }
    });
  }
  console.log(`📍 핀포인트 ${pinpoints.length}개 생성`);

  // ========================================
  // 5. MES 구축 마일스톤 생성
  // ========================================
  const mesMilestones = [
    // 메인 마일스톤 (부모 행에)
    { name: 'AS-IS 분석', startDate: '2025-12-01', endDate: '2025-12-20', color: '#FDBA74', rowId: mesGroup.id },
    { name: 'TO-BE 설계', startDate: '2025-12-15', endDate: '2026-01-31', color: '#FDBA74', rowId: mesGroup.id },
    { name: '시스템 설계', startDate: '2026-01-15', endDate: '2026-02-28', color: '#FDBA74', rowId: mesGroup.id },
    { name: '설계 확정', startDate: '2026-02-20', endDate: '2026-03-10', color: '#FDBA74', rowId: mesGroup.id },
    { name: 'MES V2 시스템 개발', startDate: '2026-03-01', endDate: '2026-05-31', color: '#FB923C', rowId: mesGroup.id },
    { name: '통합 테스트', startDate: '2026-05-15', endDate: '2026-06-15', color: '#FB923C', rowId: mesGroup.id },
    { name: '라인 테스트', startDate: '2026-06-01', endDate: '2026-06-15', color: '#FDBA74', rowId: mesGroup.id },
    { name: '시스템 시험 운영', startDate: '2026-06-15', endDate: '2026-07-15', color: '#FDBA74', rowId: mesGroup.id },
    { name: '시스템 운영', startDate: '2026-07-01', endDate: '2026-08-31', color: '#86EFAC', rowId: mesGroup.id },

    // 업무 분석 하위
    { name: 'TOBE 업무 설계', startDate: '2025-12-15', endDate: '2026-01-31', color: '#E2E8F0', rowId: mesSubRowsCreated['업무 분석'].id },
    { name: 'DB 설계', startDate: '2026-02-01', endDate: '2026-03-15', color: '#E2E8F0', rowId: mesSubRowsCreated['업무 분석'].id },
    { name: '화면 설계', startDate: '2026-02-01', endDate: '2026-03-15', color: '#E2E8F0', rowId: mesSubRowsCreated['업무 분석'].id },

    // 시스템 분석 하위
    { name: '요구 기능 정의', startDate: '2026-01-01', endDate: '2026-02-15', color: '#E2E8F0', rowId: mesSubRowsCreated['시스템 분석'].id },
    { name: '평선 설계', startDate: '2026-02-01', endDate: '2026-03-15', color: '#E2E8F0', rowId: mesSubRowsCreated['시스템 분석'].id },
    { name: '단위 테스트 및 보완', startDate: '2026-04-01', endDate: '2026-06-15', color: '#E2E8F0', rowId: mesSubRowsCreated['시스템 분석'].id },

    // 요구사항 하위
    { name: '오픈 이후 운영 방안 정의', startDate: '2026-04-01', endDate: '2026-04-30', color: '#E2E8F0', rowId: mesSubRowsCreated['요구사항'].id },
    { name: '교육', startDate: '2026-05-15', endDate: '2026-06-15', color: '#E2E8F0', rowId: mesSubRowsCreated['요구사항'].id },
    { name: '시범 운영 지원', startDate: '2026-06-15', endDate: '2026-07-15', color: '#E2E8F0', rowId: mesSubRowsCreated['요구사항'].id },

    // 개발 하위
    { name: '웹: 기준 정보, 모니터링 개발', startDate: '2026-03-01', endDate: '2026-05-31', color: '#E2E8F0', rowId: mesSubRowsCreated['개발'].id },
    { name: '자재/품질 모듈 개발', startDate: '2026-03-15', endDate: '2026-05-31', color: '#E2E8F0', rowId: mesSubRowsCreated['개발'].id },
    { name: '생산(공장) 모듈 개발', startDate: '2026-03-15', endDate: '2026-05-31', color: '#E2E8F0', rowId: mesSubRowsCreated['개발'].id },
    { name: 'IF: 설비, ERP, SLMS, GMES IF 모듈 개발', startDate: '2026-03-15', endDate: '2026-05-31', color: '#E2E8F0', rowId: mesSubRowsCreated['개발'].id },

    // 테스트/운영 하위
    { name: '통합 테스트 보완', startDate: '2026-05-15', endDate: '2026-06-15', color: '#E2E8F0', rowId: mesSubRowsCreated['테스트/운영'].id },
    { name: '리포트, 모니터링 개발', startDate: '2026-05-15', endDate: '2026-06-30', color: '#E2E8F0', rowId: mesSubRowsCreated['테스트/운영'].id },
    { name: '시범 운영 보완', startDate: '2026-06-15', endDate: '2026-07-15', color: '#E2E8F0', rowId: mesSubRowsCreated['테스트/운영'].id },
    { name: '운영 보완', startDate: '2026-07-01', endDate: '2026-08-31', color: '#86EFAC', rowId: mesSubRowsCreated['테스트/운영'].id },
    { name: '시범 운영 DB Mig', startDate: '2026-06-01', endDate: '2026-06-15', color: '#E2E8F0', rowId: mesSubRowsCreated['테스트/운영'].id },
    { name: '운영 DB Mig', startDate: '2026-06-20', endDate: '2026-07-05', color: '#E2E8F0', rowId: mesSubRowsCreated['테스트/운영'].id },
    { name: '행성 PI 운영', startDate: '2026-07-01', endDate: '2026-08-31', color: '#86EFAC', rowId: mesSubRowsCreated['테스트/운영'].id },
    { name: '리스너 시스템 운영', startDate: '2026-07-01', endDate: '2026-08-31', color: '#E2E8F0', rowId: mesSubRowsCreated['테스트/운영'].id },
    { name: '안정화 지원', startDate: '2026-07-15', endDate: '2026-08-31', color: '#E2E8F0', rowId: mesSubRowsCreated['테스트/운영'].id },
  ];

  for (const ms of mesMilestones) {
    await prisma.milestone.create({
      data: {
        name: ms.name,
        startDate: toDateTime(ms.startDate),
        endDate: toDateTime(ms.endDate),
        color: ms.color,
        status: 'PENDING',
        projectId: project.id,
        rowId: ms.rowId,
      }
    });
  }
  console.log(`📊 MES 구축 마일스톤 ${mesMilestones.length}개 생성`);

  // ========================================
  // 6. INFRA 마일스톤 생성
  // ========================================
  const infraMilestones = [
    // 서버/환경 하위
    { name: '현장 설비 분석', startDate: '2025-12-01', endDate: '2025-12-31', color: '#93C5FD', rowId: infraSubRowsCreated['서버/환경'].id },
    { name: '개발 서버 설치', startDate: '2026-01-01', endDate: '2026-01-31', color: '#93C5FD', rowId: infraSubRowsCreated['서버/환경'].id },
    { name: '설비 환경 설계', startDate: '2026-01-15', endDate: '2026-02-28', color: '#93C5FD', rowId: infraSubRowsCreated['서버/환경'].id },
    { name: '통테 서버 설치', startDate: '2026-05-01', endDate: '2026-05-31', color: '#93C5FD', rowId: infraSubRowsCreated['서버/환경'].id },
    { name: '운영 서버 설치', startDate: '2026-06-01', endDate: '2026-06-20', color: '#93C5FD', rowId: infraSubRowsCreated['서버/환경'].id },
    { name: '운영 전환', startDate: '2026-06-20', endDate: '2026-07-10', color: '#93C5FD', rowId: infraSubRowsCreated['서버/환경'].id },

    // 단말기/설비 하위
    { name: '단말기 구매/확보', startDate: '2026-02-01', endDate: '2026-03-31', color: '#93C5FD', rowId: infraSubRowsCreated['단말기/설비'].id },
    { name: '단말기 설치', startDate: '2026-03-15', endDate: '2026-04-30', color: '#93C5FD', rowId: infraSubRowsCreated['단말기/설비'].id },
    { name: '단말기, 설비 IF 테스트', startDate: '2026-04-15', endDate: '2026-05-31', color: '#93C5FD', rowId: infraSubRowsCreated['단말기/설비'].id },
    { name: '설비 IF, 설비쪽 SW 개발', startDate: '2026-02-15', endDate: '2026-05-31', color: '#86EFAC', rowId: infraSubRowsCreated['단말기/설비'].id },
  ];

  for (const ms of infraMilestones) {
    await prisma.milestone.create({
      data: {
        name: ms.name,
        startDate: toDateTime(ms.startDate),
        endDate: toDateTime(ms.endDate),
        color: ms.color,
        status: 'PENDING',
        projectId: project.id,
        rowId: ms.rowId,
      }
    });
  }
  console.log(`🏗️ INFRA 마일스톤 ${infraMilestones.length}개 생성`);

  console.log('\n✨ 데이터 임포트 완료!');
  console.log(`   - 그룹: 3개`);
  console.log(`   - 하위 행: ${mesSubRows.length + infraSubRows.length}개`);
  console.log(`   - 핀포인트: ${pinpoints.length}개`);
  console.log(`   - 마일스톤: ${mesMilestones.length + infraMilestones.length}개`);
}

main()
  .catch(console.error)
  .finally(() => {
    prisma.$disconnect();
    pool.end();
  });
