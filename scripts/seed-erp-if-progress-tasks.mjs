/**
 * @file scripts/seed-erp-if-progress-tasks.mjs
 * @description
 * MES_V2_단위테스트_계획서.pdf의 ERP I/F 단위테스트 타이틀 39건을
 * 사업부(V_IVI, V_DISP, V_PCBA, V_HNS)별로 동일하게 생성합니다.
 *
 * 실행: node scripts/seed-erp-if-progress-tasks.mjs
 */

import { config } from "dotenv";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

config({ path: ".env.local" });

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

const PROJECT_NAME = "행성 MES V2";
const BUSINESS_UNITS = ["V_IVI", "V_DISP", "V_PCBA", "V_HNS"];
const SEED_MARKER = "MES_V2_단위테스트_계획서 ERP I/F seed";

const ERP_IF_ITEMS = [
  ["375", "영업주문/반품주문", "Interface"],
  ["376", "출하정보", "Interface"],
  ["377", "구매발주/외주발주", "Interface"],
  ["378", "작업지시", "Interface"],
  ["379", "MBOM", "Interface"],
  ["380", "외주 BOM / 사급BOM(대체자재)", "Interface"],
  ["381", "수불유형(기타입출고포함)", "Interface"],
  ["382", "타계정 타입", "Interface"],
  ["383", "창고", "Interface"],
  ["384", "공정", "Interface"],
  ["385", "라인", "Interface"],
  ["386", "사원마스터", "Interface"],
  ["387", "품목 마스터", "Interface"],
  ["388", "단위정보", "Interface"],
  ["389", "BOM마스터/BOM마스터(대체자재)", "Interface"],
  ["390", "공장 마스터", "Interface"],
  ["391", "협력사 마스터", "Interface"],
  ["392", "부서정보", "Interface"],
  ["393", "ERP 현재고", "Interface"],
  ["394", "ERP 마감 확인", "Interface"],
  ["395", "인터페이스 전송 LASTEVENTSEQ 관리", "Interface"],
  ["396", "자재입고", "Interface"],
  ["397", "외주입고", "Interface"],
  ["398", "자재반품", "Interface"],
  ["399", "외주 자재 입고", "Interface"],
  ["400", "무상사급 자재 입고", "Interface"],
  ["401", "외주 자재 반품", "Interface"],
  ["402", "자재/제품 기타입고", "Interface"],
  ["403", "자재/제품 기타출고", "Interface"],
  ["404", "양품실적(WIP Completion)", "Interface"],
  ["405", "불량실적", "Interface"],
  ["406", "자재투입(WIP Issue)", "Interface"],
  ["407", "리턴(WIP Completion Return)", "Interface"],
  ["408", "자원", "Interface"],
  ["409", "자재리턴(WIP Return)", "Interface"],
  ["410", "자재/제품 이동", "Interface"],
  ["411", "제품출하", "Interface"],
  ["412", "제품출하반납", "Interface"],
  ["413", "파일 WATCHER", "Loader"],
];

function addDays(date, days) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

async function main() {
  const project = await prisma.project.findFirst({
    where: { name: PROJECT_NAME },
    select: { id: true, name: true },
  });

  if (!project) {
    throw new Error(`${PROJECT_NAME} 프로젝트를 찾을 수 없습니다.`);
  }

  const unitTestStage = await prisma.progressStageDef.findFirst({
    where: { projectId: project.id, category: "ERP_IF", name: "단위테스트" },
    select: { id: true, order: true },
  });

  const erpIfStages = await prisma.progressStageDef.findMany({
    where: { projectId: project.id, category: "ERP_IF" },
    select: { id: true, order: true },
    orderBy: { order: "asc" },
  });

  if (!unitTestStage || erpIfStages.length === 0) {
    throw new Error("ERP I/F 카테고리의 단위테스트 단계가 없습니다.");
  }

  const progress = Math.round(((unitTestStage.order + 1) / erpIfStages.length) * 100);
  const startDate = new Date("2026-05-15T00:00:00+09:00");
  const endDate = addDays(startDate, 30);

  await prisma.$transaction(async (tx) => {
    const deleted = await tx.progressTask.deleteMany({
      where: {
        projectId: project.id,
        stageCategory: "ERP_IF",
        description: { startsWith: SEED_MARKER },
      },
    });

    const existingCount = await tx.progressTask.count({ where: { projectId: project.id } });
    let order = existingCount;
    let codeNo = existingCount + 1;

    const rows = [];
    for (const businessUnit of BUSINESS_UNITS) {
      for (const [sourceNo, name, type] of ERP_IF_ITEMS) {
        rows.push({
          projectId: project.id,
          code: `T-${String(codeNo).padStart(3, "0")}`,
          name,
          category: "ERP I/F",
          businessUnit,
          description: `${SEED_MARKER} #${sourceNo} [${type}]`,
          startDate,
          endDate,
          actualStartDate: startDate,
          actualEndDate: null,
          stageCategory: "ERP_IF",
          currentStageId: unitTestStage.id,
          status: "IN_PROGRESS",
          progress,
          isParallel: true,
          order,
        });
        order++;
        codeNo++;
      }
    }

    await tx.progressTask.createMany({ data: rows });

    console.log(JSON.stringify({
      project: project.name,
      deleted: deleted.count,
      sourceItems: ERP_IF_ITEMS.length,
      businessUnits: BUSINESS_UNITS.length,
      created: ERP_IF_ITEMS.length * BUSINESS_UNITS.length,
      progress,
    }, null, 2));
  }, { timeout: 30000 });
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
