/**
 * @file scripts/import-excel.mjs
 * @description
 * Excel 파일에서 공정검증 데이터를 DB에 직접 임포트하는 스크립트입니다.
 * 실행: node scripts/import-excel.mjs
 *
 * 필요 패키지: xlsx, @prisma/client, pg, dotenv
 */

import { createRequire } from "module";
const require = createRequire(import.meta.url);

const XLSX = require("xlsx");
const { PrismaClient } = require("@prisma/client");
const { PrismaPg } = require("@prisma/adapter-pg");
const { Pool } = require("pg");
const dotenv = require("dotenv");

// .env.local 파일 로드
dotenv.config({ path: ".env.local" });

// Prisma Client 생성
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

/**
 * 시트 이름을 영문 코드로 변환
 */
function getSheetCode(sheetName) {
  const codeMap = {
    재료관리: "MATERIAL",
    SMD공정관리: "SMD_PROCESS",
    후공정관리: "POST_PROCESS",
    펌웨어SW관리: "FIRMWARE",
    OTP롬라이팅관리: "OTP_ROM",
    검사관리: "INSPECTION",
    추적성관리: "TRACEABILITY",
    풀프루프관리: "FOOLPROOF",
    품질관리: "QUALITY",
    수리관리: "REPAIR",
    재작업관리: "REWORK",
    WMS물류관리: "WMS_LOGISTICS",
    작업지시관리: "WORK_ORDER",
    설비관리: "EQUIPMENT",
    소모품관리: "CONSUMABLE",
    피더관리: "FEEDER",
    라벨관리: "LABEL",
    분석및모니터링: "MONITORING",
    에폭시관리: "EPOXY",
    플럭스관리: "FLUX",
    캐리어지그관리: "CARRIER_JIG",
    이송용매거진관리: "MAGAZINE",
  };
  return codeMap[sheetName] || sheetName.toUpperCase().replace(/\s/g, "_");
}

/**
 * Y/N 값을 boolean으로 변환
 */
function parseYesNo(value) {
  if (!value) return false;
  const normalized = String(value).toUpperCase().trim();
  return normalized === "Y" || normalized === "YES" || normalized === "TRUE";
}

/**
 * 메인 함수
 */
async function main() {
  console.log("=== Excel 데이터 임포트 시작 ===\n");

  // 1. 프로젝트 조회
  const projects = await prisma.project.findMany();
  console.log("프로젝트 목록:");
  projects.forEach((p) => console.log(`  - ${p.id}: ${p.name}`));

  if (projects.length === 0) {
    console.log("프로젝트가 없습니다. 먼저 프로젝트를 생성해주세요.");
    return;
  }

  const projectId = projects[0].id;
  console.log(`\n사용할 프로젝트: ${projects[0].name}`);

  // 2. Excel 파일 읽기
  const excelPath = "./scripts/excel_data.xlsx";
  console.log(`\nExcel 파일 로드: ${excelPath}`);

  const workbook = XLSX.readFile(excelPath);

  // 3. 대상 시트 목록
  const targetSheets = [
    "재료관리",
    "SMD공정관리",
    "후공정관리",
    "펌웨어SW관리",
    "OTP롬라이팅관리",
    "검사관리",
    "추적성관리",
    "풀프루프관리",
    "품질관리",
    "수리관리",
    "재작업관리",
    "WMS물류관리",
    "작업지시관리",
    "설비관리",
    "소모품관리",
    "피더관리",
    "라벨관리",
    "분석및모니터링",
    "에폭시관리",
    "플럭스관리",
    "캐리어지그관리",
    "이송용매거진관리",
  ];

  // 4. 기존 데이터 삭제 여부 확인
  const existingCategories =
    await prisma.processVerificationCategory.findMany({
      where: { projectId },
    });

  if (existingCategories.length > 0) {
    console.log(`\n기존 카테고리 ${existingCategories.length}개가 있습니다.`);
    console.log("기존 데이터를 삭제하고 새로 가져옵니다...");

    await prisma.processVerificationCategory.deleteMany({
      where: { projectId },
    });
    console.log("기존 데이터 삭제 완료.");
  }

  // 5. 각 시트 처리
  const stats = {
    categoriesCreated: 0,
    itemsCreated: 0,
    skippedSheets: [],
    errors: [],
  };

  for (let idx = 0; idx < targetSheets.length; idx++) {
    const sheetName = targetSheets[idx];
    process.stdout.write(`처리 중: ${sheetName}... `);

    if (!workbook.SheetNames.includes(sheetName)) {
      stats.skippedSheets.push(sheetName);
      console.log("시트 없음, 스킵");
      continue;
    }

    const sheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });

    if (data.length < 2) {
      stats.skippedSheets.push(sheetName);
      console.log("데이터 없음, 스킵");
      continue;
    }

    try {
      // 카테고리 생성
      const code = getSheetCode(sheetName);
      const category = await prisma.processVerificationCategory.create({
        data: {
          projectId,
          name: sheetName,
          code,
          order: idx,
          description: `${sheetName} 관련 공정검증 항목`,
        },
      });
      stats.categoriesCreated++;

      // 항목 처리
      let itemCount = 0;
      for (let rowIdx = 1; rowIdx < data.length; rowIdx++) {
        const row = data[rowIdx];
        if (!row || row.length < 7) continue;

        // 빈 행 스킵
        const hasData = row.some((cell) => cell != null && cell !== "");
        if (!hasData) continue;

        // 관리코드가 없으면 스킵
        const managementCode = String(row[6] || "").trim();
        if (!managementCode) continue;

        // 항목 생성
        await prisma.processVerificationItem.create({
          data: {
            categoryId: category.id,
            category: String(row[0] || "").trim(),
            isApplied: parseYesNo(String(row[1] || "")),
            managementArea: String(row[2] || "").trim(),
            detailItem: String(row[3] || "").trim(),
            mesMapping: row[4] ? String(row[4]).trim() : null,
            verificationDetail: row[5] ? String(row[5]).trim() : null,
            managementCode,
            acceptanceStatus: row[7] ? String(row[7]).trim() : null,
            existingMes: parseYesNo(String(row[8] || "")),
            customerRequest: row[9] ? String(row[9]).trim() : null,
            order: rowIdx,
            status: "PENDING",
          },
        });
        itemCount++;
      }
      stats.itemsCreated += itemCount;
      console.log(`${itemCount}개 항목 생성`);
    } catch (err) {
      stats.errors.push(`${sheetName}: ${err.message}`);
      console.log(`오류: ${err.message}`);
    }
  }

  // 6. 결과 출력
  console.log("\n=== 임포트 완료 ===");
  console.log(`카테고리 생성: ${stats.categoriesCreated}개`);
  console.log(`항목 생성: ${stats.itemsCreated}개`);

  if (stats.skippedSheets.length > 0) {
    console.log(`건너뛴 시트: ${stats.skippedSheets.join(", ")}`);
  }

  if (stats.errors.length > 0) {
    console.log("\n오류:");
    stats.errors.forEach((e) => console.log(`  - ${e}`));
  }
}

main()
  .catch((e) => {
    console.error("임포트 실패:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
