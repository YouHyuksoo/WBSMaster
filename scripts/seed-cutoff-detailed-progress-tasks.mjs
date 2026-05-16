/**
 * @file scripts/seed-cutoff-detailed-progress-tasks.mjs
 * @description CUT OFF 상세 전환 작업을 대분류/기능 task로 등록합니다.
 *
 * 실행: node scripts/seed-cutoff-detailed-progress-tasks.mjs
 */

import { config } from "dotenv";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

config({ path: ".env.local" });

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

const PROJECT_ID = "38f0613b-3048-48c2-9354-b1dc6c9f1a7d";
const STAGE_CATEGORY = "CUT_OFF";
const INITIAL_STAGE_NAME = "Cut-off 계획수립";
const SEED_MARKER = "CUT OFF 상세 전환 작업 seed";
const BUSINESS_UNITS = ["V_IVI", "V_DISP", "V_PCBA", "V_HNS"];
const DEFAULT_START_DATE = new Date("2026-05-15T00:00:00+09:00");
const DEFAULT_DURATION_DAYS = 30;

const ITEMS = [
  ["DB Clean", "가동계 DB Clear(트랜잭션만 삭제)"],
  ["DB Clean", "MES V1 >> ERP 인터페이스 스케줄러 정지"],
  ["ERPIF( 기준정보 )", "ERP 연계 DB 변경(테스트[TFT] -> 운영계[PROD])"],
  [
    "ERPIF( 기준정보 )",
    "가동계 ERP 기준정보 다운로드 확인(ERP 가동계[PROD] -> MES V2)\n(Issue) ERP품번 기준 MES품목2개가 등록된 현상 존재",
  ],
  ["ERPIF( 생산계획 )", "운영 ERP 오픈 구매 PO, 생산작지, 영업 주문 CLOSING"],
  ["ERPIF( 생산계획 )", "MES V1 -> ERP IF 펜딩 리스트 확인 및 통보(수신 : 이기웅B, 차대성C)"],
  ["ERPIF( 생산계획 )", "운영 ERP 신규 PO, 생산작지, 영업 주문 등록"],
  ["재고실사", "MES V1 재고실사 및 반영\nㅇ 창고별(사내[양품, 불량], 외주) 재고실사"],
  ["재고실사", "MES V1 재고실사 및 반영 내역 TFT 송부\n(수신 : 이기웅B, 차대성C, 김산K)"],
  [
    "DB Migration",
    "MES V1 vs MES V2 재고 데이터 비교\n(양식 : 월말 MES와 ERP 재고비교 양식동일)\nㅇ MES V1 : 재고실사 PG 확인\nㅇ MES V2 : 수불장 PG 확인",
  ],
  ["DB Migration", "MES V1 vs MES V2 재고 비교 검증 후 데이터 송부(수신 : 이기웅B, 차대성C, 김산K)"],
  ["MES V1", "MES V1 사용자 접속 Block 처리"],
  ["가동테스트", "생산라인 전체 자재 투입\n2개라인 가동 및 실적처리 확인"],
  ["가동테스트", "이상유무 전체 메일 발송"],
];

function addDays(date, days) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

async function nextCodeNumber(projectId) {
  const tasks = await prisma.progressTask.findMany({
    where: { projectId, code: { startsWith: "T-" } },
    select: { code: true },
  });

  let max = 0;
  for (const task of tasks) {
    const match = task.code?.match(/^T-(\d+)$/);
    if (!match) continue;
    max = Math.max(max, Number(match[1]));
  }
  return max + 1;
}

async function main() {
  const project = await prisma.project.findUnique({
    where: { id: PROJECT_ID },
    select: { id: true, name: true },
  });
  if (!project) {
    throw new Error(`프로젝트를 찾을 수 없습니다: ${PROJECT_ID}`);
  }

  const stages = await prisma.progressStageDef.findMany({
    where: { projectId: project.id, category: STAGE_CATEGORY },
    select: { id: true, name: true, order: true },
    orderBy: { order: "asc" },
  });
  const initialStage = stages.find((stage) => stage.name === INITIAL_STAGE_NAME) ?? stages[0];
  if (!initialStage || stages.length === 0) {
    throw new Error("CUT_OFF 단계 정의가 없습니다.");
  }

  const progress = Math.round(((initialStage.order + 1) / stages.length) * 100);
  const endDate = addDays(DEFAULT_START_DATE, DEFAULT_DURATION_DAYS);

  await prisma.$transaction(async (tx) => {
    const deleted = await tx.progressTask.deleteMany({
      where: {
        projectId: project.id,
        stageCategory: STAGE_CATEGORY,
        description: { startsWith: SEED_MARKER },
      },
    });

    const currentMaxOrder = await tx.progressTask.aggregate({
      where: { projectId: project.id },
      _max: { order: true },
    });
    let order = (currentMaxOrder._max.order ?? -1) + 1;
    let codeNo = await nextCodeNumber(project.id);

    const rows = [];
    for (const [category, name] of ITEMS) {
      for (const businessUnit of BUSINESS_UNITS) {
        rows.push({
          projectId: project.id,
          code: `T-${String(codeNo++).padStart(3, "0")}`,
          name,
          category,
          businessUnit,
          description: `${SEED_MARKER} | 대분류: ${category} | 사업부: ${businessUnit}`,
          startDate: DEFAULT_START_DATE,
          endDate,
          actualStartDate: null,
          actualEndDate: null,
          stageCategory: STAGE_CATEGORY,
          currentStageId: initialStage.id,
          status: "PENDING",
          progress,
          isParallel: true,
          order: order++,
        });
      }
    }

    await tx.progressTask.createMany({ data: rows });

    const byCategory = ITEMS.reduce((acc, [category]) => {
      acc[category] = (acc[category] ?? 0) + 1;
      return acc;
    }, {});

    console.log(JSON.stringify({
      project: project.name,
      deleted: deleted.count,
      businessUnits: BUSINESS_UNITS,
      created: rows.length,
      byCategory,
      stageCategory: STAGE_CATEGORY,
      initialStage: initialStage.name,
      progress,
      firstCode: rows[0]?.code,
      lastCode: rows.at(-1)?.code,
    }, null, 2));
  }, { timeout: 60000 });
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
