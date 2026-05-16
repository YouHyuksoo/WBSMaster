/**
 * @file scripts/seed-terminal-progress-tasks.mjs
 * @description
 * 단말기 카테고리 단계와 기본 task를 등록합니다.
 *
 * 실행: node scripts/seed-terminal-progress-tasks.mjs
 */

import { config } from "dotenv";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

config({ path: ".env.local" });

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

const PROJECT_ID = "38f0613b-3048-48c2-9354-b1dc6c9f1a7d";
const STAGE_CATEGORY = "TERMINAL";
const INITIAL_STAGE_NAME = "현황조사";
const SEED_MARKER = "단말기 기본 항목 seed";
const BUSINESS_UNITS = ["V_IVI", "V_DISP", "V_PCBA", "V_HNS"];
const STAGES = ["현황조사", "의사결정", "견적", "품의", "구매발주", "현장설치", "기능테스트", "오픈"];
const ITEMS = ["PC+모니터", "프린터", "PDA", "스캐너"];
const DEFAULT_START_DATE = new Date("2026-05-15T00:00:00+09:00");
const DEFAULT_DURATION_DAYS = 90;

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

  await prisma.$transaction(async (tx) => {
    await tx.progressStageDef.deleteMany({
      where: { projectId: project.id, category: STAGE_CATEGORY },
    });
    await tx.progressStageDef.createMany({
      data: STAGES.map((name, order) => ({
        projectId: project.id,
        category: STAGE_CATEGORY,
        name,
        order,
      })),
    });

    const stageDefs = await tx.progressStageDef.findMany({
      where: { projectId: project.id, category: STAGE_CATEGORY },
      select: { id: true, name: true, order: true },
      orderBy: { order: "asc" },
    });
    const initialStage = stageDefs.find((stage) => stage.name === INITIAL_STAGE_NAME);
    if (!initialStage) {
      throw new Error("TERMINAL 초기 단계를 찾을 수 없습니다.");
    }

    const deleted = await tx.progressTask.deleteMany({
      where: {
        projectId: project.id,
        stageCategory: STAGE_CATEGORY,
        description: { startsWith: SEED_MARKER },
      },
    });

    const progress = Math.round(((initialStage.order + 1) / stageDefs.length) * 100);
    const endDate = addDays(DEFAULT_START_DATE, DEFAULT_DURATION_DAYS);
    const currentMaxOrder = await tx.progressTask.aggregate({
      where: { projectId: project.id },
      _max: { order: true },
    });
    let order = (currentMaxOrder._max.order ?? -1) + 1;
    let codeNo = await nextCodeNumber(project.id);

    const rows = [];
    for (const item of ITEMS) {
      for (const businessUnit of BUSINESS_UNITS) {
        rows.push({
          projectId: project.id,
          code: `T-${String(codeNo++).padStart(3, "0")}`,
          name: `${item} 도입`,
          category: item,
          businessUnit,
          description: `${SEED_MARKER} | 대분류: ${item} | 사업장: ${businessUnit}`,
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

    console.log(JSON.stringify({
      project: project.name,
      stages: STAGES,
      businessUnits: BUSINESS_UNITS,
      deleted: deleted.count,
      created: rows.length,
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
