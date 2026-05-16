/**
 * @file scripts/seed-equipment-interface-progress-tasks.mjs
 * @description
 * 베트남 설비인터페이스 PCBA/DISPLAY 엑셀의 집계 시트에서 공정/설비 항목을 추출해
 * 행성 MES V2 프로젝트의 EQUIPMENT 진도 task로 등록합니다.
 *
 * 실행: node scripts/seed-equipment-interface-progress-tasks.mjs
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
const STAGE_CATEGORY = "EQUIPMENT";
const INITIAL_STAGE_NAME = "설비현황분석";
const SEED_MARKER = "베트남 설비인터페이스 집계 공정설비 seed";
const DEFAULT_START_DATE = new Date("2026-05-15T00:00:00+09:00");
const DEFAULT_DURATION_DAYS = 90;

const SOURCE_FILES = [
  {
    fileName: "2.2.8.2.베트남_설비인터페이스_PCBA_V2.0.xlsx",
    businessUnit: "V_PCBA",
  },
  {
    fileName: "2.2.8.2.베트남_설비인터페이스_DISPLAY_V2.0.xlsx",
    businessUnit: "V_DISP",
  },
];

function addDays(date, days) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function cleanCell(value) {
  if (value === undefined || value === null) return "";
  return String(value).replace(/\r\n/g, "\n").trim();
}

function numberOrNull(value) {
  if (value === undefined || value === null || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function extractRows(source) {
  const filePath = path.join(os.homedir(), "Desktop", source.fileName);
  const workbook = XLSX.readFile(filePath, { cellDates: false });
  const sheet = workbook.Sheets["집계"] ?? workbook.Sheets[workbook.SheetNames[1]];
  if (!sheet) {
    throw new Error(`${source.fileName}에서 집계 시트를 찾을 수 없습니다.`);
  }

  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, blankrows: false, defval: "" });
  const items = [];
  let currentStatus = "";
  let currentManufacturer = "";

  for (let rowIndex = 0; rowIndex < rows.length; rowIndex++) {
    const row = rows[rowIndex] ?? [];
    const status = cleanCell(row[0]);
    const manufacturer = cleanCell(row[1]);
    const equipmentName = cleanCell(row[2]);

    if (status) currentStatus = status;
    if (manufacturer) currentManufacturer = manufacturer;

    if (!equipmentName || equipmentName === "공정/설비") continue;
    if (cleanCell(row[1]) === "확인사항") break;

    const quantity = numberOrNull(row[3]);
    const quoteReceived = cleanCell(row[4]);
    const estimatedCost = numberOrNull(row[5]);
    const quotedCost = source.fileName.includes("DISPLAY") ? numberOrNull(row[6]) : null;
    const currentIfMethod = cleanCell(source.fileName.includes("DISPLAY") ? row[7] : row[6]);
    const remarks = cleanCell(source.fileName.includes("DISPLAY") ? row[8] : row[7]);

    items.push({
      sourceFile: source.fileName,
      businessUnit: source.businessUnit,
      excelRow: rowIndex + 1,
      status: currentStatus,
      manufacturer: currentManufacturer,
      equipmentName,
      quantity,
      quoteReceived,
      estimatedCost,
      quotedCost,
      currentIfMethod,
      remarks,
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
  const items = SOURCE_FILES.flatMap(extractRows);
  if (items.length === 0) {
    throw new Error("공정/설비 항목을 찾지 못했습니다.");
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
    throw new Error("EQUIPMENT 단계 정의가 없습니다.");
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

    const rows = items.map((item) => ({
      projectId: project.id,
      code: `T-${String(codeNo++).padStart(3, "0")}`,
      name: item.equipmentName,
      category: item.manufacturer || "공정설비",
      businessUnit: item.businessUnit,
      description: [
        `${SEED_MARKER}`,
        `파일: ${item.sourceFile}`,
        `가능여부: ${item.status || "-"}`,
        `제조사: ${item.manufacturer || "-"}`,
        `수량: ${item.quantity ?? "-"}`,
        `견적서수취: ${item.quoteReceived || "-"}`,
        `예상비용(만원): ${item.estimatedCost ?? "-"}`,
        `견적비용(만원): ${item.quotedCost ?? "-"}`,
        `현재 MES V1 I/F 방법: ${item.currentIfMethod || "-"}`,
        `비고: ${item.remarks || "-"}`,
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
    }));

    await tx.progressTask.createMany({ data: rows });

    const byBusinessUnit = items.reduce((acc, item) => {
      acc[item.businessUnit] = (acc[item.businessUnit] ?? 0) + 1;
      return acc;
    }, {});

    console.log(JSON.stringify({
      project: project.name,
      deleted: deleted.count,
      extracted: items.length,
      created: rows.length,
      byBusinessUnit,
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
