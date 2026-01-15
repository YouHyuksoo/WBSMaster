/**
 * @file scripts/import-field-issues.ts
 * @description
 * 현업이슈 Excel 데이터를 DB에 직접 삽입하는 스크립트
 *
 * 사용법:
 * npx tsx scripts/import-field-issues.ts
 */

import { PrismaClient, FieldIssueStatus } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import * as XLSX from "xlsx";
import * as dotenv from "dotenv";

// 환경 변수 로드
dotenv.config({ path: ".env.local" });

// Prisma Client 생성 (adapter 사용)
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

/**
 * 상태 문자열을 FieldIssueStatus로 변환
 */
function parseStatus(value: string | undefined | null): FieldIssueStatus {
  if (!value) return FieldIssueStatus.OPEN;
  const normalized = String(value).toUpperCase().trim();

  if (normalized === "완료" || normalized === "COMPLETED" || normalized === "DONE") {
    return FieldIssueStatus.COMPLETED;
  }
  if (normalized === "PENDING" || normalized === "대기" || normalized === "보류") {
    return FieldIssueStatus.PENDING;
  }
  return FieldIssueStatus.OPEN;
}

/**
 * Excel 날짜 시리얼 번호를 Date로 변환
 */
function parseExcelDate(value: number | string | undefined | null): Date | null {
  if (!value) return null;

  if (typeof value === "string") {
    const date = new Date(value);
    if (!isNaN(date.getTime())) return date;
    return null;
  }

  if (typeof value === "number") {
    const excelEpoch = new Date(1899, 11, 30);
    const date = new Date(excelEpoch.getTime() + value * 24 * 60 * 60 * 1000);
    return date;
  }

  return null;
}

async function main() {
  const excelPath = "D:/Download/2_1_4.이슈리스트_20260108_V1_hkkim.xlsx";
  const projectId = "38f0613b-3048-48c2-9354-b1dc6c9f1a7d"; // 행성 MES V2

  console.log("📂 Excel 파일 읽기:", excelPath);

  // Excel 파일 읽기
  const workbook = XLSX.readFile(excelPath);
  const sheetName = workbook.SheetNames.includes("리스트")
    ? "리스트"
    : workbook.SheetNames[0];

  console.log("📋 시트:", sheetName);

  const sheet = workbook.Sheets[sheetName];
  const data = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as (string | number | undefined)[][];

  console.log("📊 총 행 수:", data.length);

  // 기존 데이터 삭제
  const deleted = await prisma.fieldIssue.deleteMany({
    where: { projectId },
  });
  console.log("🗑️ 기존 데이터 삭제:", deleted.count, "건");

  let sequence = 1;
  let created = 0;
  let skipped = 0;

  // 헤더 행(첫 번째 행) 건너뛰고 처리
  for (let rowIdx = 1; rowIdx < data.length; rowIdx++) {
    const row = data[rowIdx];

    if (!row || row.length < 4) continue;

    const hasData = row.some((cell) => cell != null && cell !== "");
    if (!hasData) continue;

    try {
      const excelCode = String(row[0] || "").trim();
      const businessUnit = String(row[1] || "").trim();
      const category = row[2] ? String(row[2]).trim() : null;
      const title = String(row[3] || "").trim();
      const description = row[4] ? String(row[4]).trim() : null;
      const registeredDate = parseExcelDate(row[5]);
      const issuer = row[6] ? String(row[6]).trim() : null;
      const requirementCode = row[7] ? String(row[7]).trim() : null;
      const assignee = row[8] ? String(row[8]).trim() : null;
      const status = parseStatus(row[9] ? String(row[9]) : null);
      const targetDate = parseExcelDate(row[10]);
      const completedDate = parseExcelDate(row[11]);
      const proposedSolution = row[12] ? String(row[12]).trim() : null;
      const finalSolution = row[13] ? String(row[13]).trim() : null;
      const remarks = row[14] ? String(row[14]).trim() : null;

      if (!businessUnit || !title) {
        console.log(`⚠️ 행 ${rowIdx + 1}: 필수 값 누락`);
        skipped++;
        continue;
      }

      const code = excelCode || `IS${String(sequence).padStart(4, "0")}`;

      await prisma.fieldIssue.create({
        data: {
          projectId,
          sequence,
          code,
          businessUnit,
          category,
          title,
          description,
          registeredDate,
          issuer,
          requirementCode,
          assignee,
          status,
          targetDate,
          completedDate,
          proposedSolution,
          finalSolution,
          remarks,
        },
      });

      sequence++;
      created++;
      console.log(`✅ [${code}] ${title.substring(0, 30)}...`);
    } catch (err) {
      console.error(`❌ 행 ${rowIdx + 1}:`, err);
      skipped++;
    }
  }

  console.log("\n📈 결과:");
  console.log(`   - 생성: ${created}건`);
  console.log(`   - 스킵: ${skipped}건`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
