/**
 * @file scripts/seed-cutoff-progress-tasks.mjs
 * @description
 * 기준정보 task를 참조해 CUT_OFF 기준정보 대분류로 복제하고,
 * 재고조사 대분류에 원자재/반제품/완제품 task를 사업부별로 등록합니다.
 *
 * 실행: node scripts/seed-cutoff-progress-tasks.mjs
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
const INITIAL_STAGE_NAME = "전환범위정의";
const SEED_MARKER = "CUT OFF 기준정보 재고조사 seed";
const BUSINESS_UNITS = ["V_IVI", "V_DISP", "V_PCBA", "V_HNS"];
const INVENTORY_ITEMS = ["원자재", "반제품", "완제품"];
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

  const stages = await prisma.progressStageDef.findMany({
    where: { projectId: project.id, category: STAGE_CATEGORY },
    select: { id: true, name: true, order: true },
    orderBy: { order: "asc" },
  });
  const initialStage = stages.find((stage) => stage.name === INITIAL_STAGE_NAME) ?? stages[0];
  if (!initialStage || stages.length === 0) {
    throw new Error("CUT_OFF 단계 정의가 없습니다.");
  }

  const masterDataTasks = await prisma.progressTask.findMany({
    where: {
      projectId: project.id,
      stageCategory: "MASTER_DATA",
      businessUnit: { in: BUSINESS_UNITS },
    },
    select: {
      code: true,
      name: true,
      category: true,
      businessUnit: true,
      description: true,
    },
    orderBy: [{ name: "asc" }, { businessUnit: "asc" }],
  });
  if (masterDataTasks.length === 0) {
    throw new Error("참조할 기준정보 task가 없습니다.");
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
    for (const source of masterDataTasks) {
      rows.push({
        projectId: project.id,
        code: `T-${String(codeNo++).padStart(3, "0")}`,
        name: source.name,
        category: "기준정보",
        businessUnit: source.businessUnit,
        description: [
          `${SEED_MARKER}`,
          `대분류: 기준정보`,
          `참조: ${source.code ?? "-"} / ${source.category ?? "-"}`,
          source.description ? `참조설명: ${source.description}` : null,
        ].filter(Boolean).join(" | "),
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

    for (const inventoryName of INVENTORY_ITEMS) {
      for (const businessUnit of BUSINESS_UNITS) {
        rows.push({
          projectId: project.id,
          code: `T-${String(codeNo++).padStart(3, "0")}`,
          name: inventoryName,
          category: "재고조사",
          businessUnit,
          description: [
            `${SEED_MARKER}`,
            `대분류: 재고조사`,
            `재고구분: ${inventoryName}`,
          ].join(" | "),
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
      deleted: deleted.count,
      referencedMasterData: masterDataTasks.length,
      inventoryItems: INVENTORY_ITEMS.length * BUSINESS_UNITS.length,
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
