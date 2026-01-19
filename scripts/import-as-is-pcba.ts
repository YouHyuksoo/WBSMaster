/**
 * @file scripts/import-as-is-pcba.ts
 * @description
 * V_PCBA 사업부 AS-IS 분석 데이터 가져오기 스크립트
 * 엑셀 파일에서 데이터를 읽어 DB에 입력합니다.
 *
 * 실행 방법:
 * npx tsx scripts/import-as-is-pcba.ts
 */

import { config } from "dotenv";
config({ path: ".env.local" }); // 환경변수 로드

import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import * as XLSX from "xlsx";

// Prisma Client 생성 (adapter 사용)
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

// 프로젝트 ID (행성 MES V2)
const PROJECT_ID = "38f0613b-3048-48c2-9354-b1dc6c9f1a7d";
const BUSINESS_UNIT = "V_PCBA";

// 대분류 매핑 (엑셀 -> Enum)
const MAJOR_CATEGORY_MAP: Record<string, string> = {
  "기준관리": "MASTER",
  "생산관리": "PRODUCTION",
  "품질관리": "QUALITY",
  "자재관리": "MATERIAL",
  "설비관리": "EQUIPMENT",
  "재고관리": "INVENTORY",
  "출하관리": "SHIPMENT",
};

// 현행방식 매핑 (엑셀 시스템 -> Enum)
const CURRENT_METHOD_MAP: Record<string, string> = {
  "GMES": "SYSTEM",
  "GERP": "SYSTEM",
  "ERP": "SYSTEM",
  "MES": "SYSTEM",
  "수기": "MANUAL",
  "엑셀": "EXCEL",
  "Excel": "EXCEL",
};

async function main() {
  console.log("🚀 V_PCBA AS-IS 데이터 가져오기 시작...\n");

  // 1. 엑셀 파일 읽기
  const filePath = "D:/Download/2_1_2_1.프로세스 맵핑_251217_jylee_V2 (1).xlsx";
  console.log(`📂 파일 경로: ${filePath}`);

  let workbook;
  try {
    workbook = XLSX.readFile(filePath);
    console.log(`✅ 엑셀 파일 읽기 성공`);
    console.log(`📋 시트 목록: ${Object.keys(workbook.Sheets).join(", ")}`);
  } catch (error) {
    console.error(`❌ 엑셀 파일 읽기 실패:`, error);
    throw error;
  }

  const sheet = workbook.Sheets["V_PCBA"];
  if (!sheet) {
    console.error(`❌ V_PCBA 시트를 찾을 수 없습니다.`);
    console.log(`📋 사용 가능한 시트: ${Object.keys(workbook.Sheets).join(", ")}`);
    throw new Error("V_PCBA 시트를 찾을 수 없습니다.");
  }
  const rawData = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as (string | null | undefined)[][];

  // 2. 헤더 제외하고 데이터 파싱
  const items: {
    asIsManagementNo: string;
    majorCategory: string;
    middleCategory: string;
    taskName: string;
    currentMethod: string;
    details: string;
    issueSummary: string;
    remarks: string;
  }[] = [];

  let currentMajor = "";
  let currentMiddle = "";

  for (let i = 2; i < rawData.length; i++) {
    const row = rawData[i];
    if (!row || row.length === 0) continue;

    const [major, middle, managementNo, taskName, department, details, system, issue, remarks] = row;

    // 대분류 업데이트
    if (major) currentMajor = String(major).trim();
    // 중분류 업데이트
    if (middle) currentMiddle = String(middle).trim();

    // 업무명이 없으면 스킵
    if (!taskName) continue;

    // 현행방식 결정
    let currentMethod = "MANUAL";
    if (system) {
      const systemStr = String(system).trim().toUpperCase();
      if (systemStr.includes("GMES") || systemStr.includes("MES")) {
        currentMethod = "SYSTEM";
      } else if (systemStr.includes("GERP") || systemStr.includes("ERP")) {
        currentMethod = "SYSTEM";
      } else if (systemStr.includes("엑셀") || systemStr.includes("EXCEL")) {
        currentMethod = "EXCEL";
      } else if (systemStr.includes("수기")) {
        currentMethod = "MANUAL";
      } else if (systemStr.length > 0) {
        currentMethod = "SYSTEM";
      }
    }

    items.push({
      asIsManagementNo: managementNo ? String(managementNo).trim() : "",
      majorCategory: MAJOR_CATEGORY_MAP[currentMajor] || "MASTER",
      middleCategory: currentMiddle || "기타",
      taskName: String(taskName).trim(),
      currentMethod,
      details: details ? String(details).trim() : "",
      issueSummary: issue ? String(issue).trim() : "",
      remarks: remarks ? String(remarks).trim() : "",
    });
  }

  console.log(`📊 파싱된 항목 수: ${items.length}개\n`);

  // 3. Overview 확인 또는 생성
  let overview = await prisma.asIsOverview.findFirst({
    where: { projectId: PROJECT_ID, businessUnit: BUSINESS_UNIT },
  });

  if (!overview) {
    console.log("📁 V_PCBA Overview 생성 중...");
    overview = await prisma.asIsOverview.create({
      data: {
        projectId: PROJECT_ID,
        businessUnit: BUSINESS_UNIT,
        customerName: "행성전자",
        author: "시스템 가져오기",
        createdDate: new Date(),
      },
    });
    console.log(`✅ Overview 생성 완료: ${overview.id}\n`);
  } else {
    console.log(`📁 기존 Overview 사용: ${overview.id}`);
    // 기존 항목 삭제
    const deleted = await prisma.asIsOverviewItem.deleteMany({
      where: { overviewId: overview.id },
    });
    console.log(`🗑️ 기존 항목 ${deleted.count}개 삭제\n`);
  }

  // 4. 항목 생성
  console.log("📝 항목 생성 중...");
  let order = 0;
  for (const item of items) {
    await prisma.asIsOverviewItem.create({
      data: {
        overviewId: overview.id,
        asIsManagementNo: item.asIsManagementNo || null,
        majorCategory: item.majorCategory as never,
        middleCategory: item.middleCategory,
        taskName: item.taskName,
        currentMethod: item.currentMethod as never,
        details: item.details || null,
        issueSummary: item.issueSummary || null,
        remarks: item.remarks || null,
        order: order++,
      },
    });
    process.stdout.write(".");
  }

  console.log(`\n\n✅ 완료! ${items.length}개 항목이 입력되었습니다.`);
  console.log(`\n🔗 확인: http://localhost:3000/dashboard/as-is-analysis`);
  console.log(`   프로젝트: 행성 MES V2`);
  console.log(`   사업부: V_PCBA`);
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
