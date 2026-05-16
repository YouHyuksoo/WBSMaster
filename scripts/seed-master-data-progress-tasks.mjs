/**
 * @file scripts/seed-master-data-progress-tasks.mjs
 * @description
 * Desktop의 MES_V2_단위테스트_계획서.xlsx 파일에서 기준정보 시트의
 * "#번호 기능명 [시스템] (유형)" 섹션을 추출해 행성 MES V2 프로젝트의
 * MASTER_DATA 진도 task로 등록합니다.
 *
 * 실행: node scripts/seed-master-data-progress-tasks.mjs
 */

import path from "node:path";
import os from "node:os";
import { config } from "dotenv";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import XLSX from "xlsx";

config({ path: ".env.local" });

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

const PROJECT_ID = "38f0613b-3048-48c2-9354-b1dc6c9f1a7d";
const SHEET_NAME = "기준정보";
const STAGE_CATEGORY = "MASTER_DATA";
const INITIAL_STAGE_NAME = "대상데이터정의";
const SEED_MARKER = "MES_V2_단위테스트_계획서 기준정보 seed";
const BUSINESS_UNITS = ["V_IVI", "V_DISP", "V_PCBA", "V_HNS"];
const DEFAULT_START_DATE = new Date("2026-05-15T00:00:00+09:00");
const DEFAULT_DURATION_DAYS = 60;

function addDays(date, days) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function cleanCell(value) {
  if (value === undefined || value === null) return "";
  return String(value).replace(/\r\n/g, "\n").trim();
}

function parseHeader(value) {
  const text = cleanCell(value);
  const match = text.match(/^#(\d+)\s+(.+?)\s+\[([^\]]*)\]\s+\(([^)]*)\)/);
  if (!match) return null;
  return {
    sourceNo: match[1],
    name: match[2].trim(),
    system: match[3].trim(),
    type: match[4].trim(),
    raw: text,
  };
}

function extractMasterDataItems(filePath) {
  const workbook = XLSX.readFile(filePath, { cellDates: false });
  const sheet = workbook.Sheets[SHEET_NAME];
  if (!sheet) {
    throw new Error(`${SHEET_NAME} 시트를 찾을 수 없습니다.`);
  }

  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, blankrows: false, defval: "" });
  const items = [];

  for (let rowIndex = 0; rowIndex < rows.length; rowIndex++) {
    const header = parseHeader(rows[rowIndex]?.[0]);
    if (!header) continue;

    const meta = rows[rowIndex + 1] ?? [];
    items.push({
      ...header,
      excelRow: rowIndex + 1,
      screenId: cleanCell(meta[1]),
      refTable: cleanCell(meta[4]),
      developer: cleanCell(meta[7]),
      designYn: cleanCell(meta[10]),
    });
  }

  return items;
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
  const filePath = path.join(os.homedir(), "Desktop", "MES_V2_단위테스트_계획서.xlsx");
  const items = extractMasterDataItems(filePath);

  if (items.length === 0) {
    throw new Error("기준정보 시트에서 #으로 시작하는 항목을 찾지 못했습니다.");
  }

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
    throw new Error("MASTER_DATA 단계 정의가 없습니다.");
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
    for (const item of items) {
      for (const businessUnit of BUSINESS_UNITS) {
        rows.push({
          projectId: project.id,
          code: `T-${String(codeNo++).padStart(3, "0")}`,
          name: item.name,
          category: item.type || "기준정보",
          businessUnit,
          description: [
            `${SEED_MARKER} #${item.sourceNo}`,
            `시스템: ${item.system || "-"}`,
            `화면ID: ${item.screenId || "-"}`,
            `참조테이블: ${item.refTable || "-"}`,
            `개발자: ${item.developer || "-"}`,
            `설계여부: ${item.designYn || "-"}`,
            `원본행: ${item.excelRow}`,
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
      sourceSheet: SHEET_NAME,
      deleted: deleted.count,
      extracted: items.length,
      businessUnits: BUSINESS_UNITS,
      created: rows.length,
      stageCategory: STAGE_CATEGORY,
      initialStage: initialStage.name,
      progress,
      firstCode: rows[0]?.code,
      lastCode: rows.at(-1)?.code,
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
