/**
 * @file scripts/import-customer-requirements.mjs
 * @description
 * 고객요구사항 엑셀 파일을 DB에 임포트하는 스크립트
 * - 중복 관리번호는 "중복1", "중복2" 접미사 추가
 * - 요구사항 빈 곳은 "요구사항 없음" 처리
 * - 기존 데이터 삭제 후 임포트
 *
 * 실행: node scripts/import-customer-requirements.mjs
 */

import { createRequire } from "module";
const require = createRequire(import.meta.url);

const XLSX = require("xlsx");
const { Pool } = require("pg");
const dotenv = require("dotenv");

dotenv.config({ path: ".env.local" });

// 설정
const PROJECT_ID = "38f0613b-3048-48c2-9354-b1dc6c9f1a7d"; // 행성 MES V2
const FILE_PATH = "D:\\Download\\2_1_3.요청사항정의(사업부 통합).xlsx";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

/**
 * 적용여부 문자열을 ApplyStatus로 변환
 */
function parseApplyStatus(value) {
  if (!value) return "REVIEWING";
  const normalized = String(value).toUpperCase().trim();

  if (normalized === "Y" || normalized === "YES" || normalized === "적용" || normalized === "APPLIED") {
    return "APPLIED";
  }
  if (normalized === "N" || normalized === "NO" || normalized === "미적용" || normalized === "REJECTED") {
    return "REJECTED";
  }
  if (normalized === "보류" || normalized === "HOLD") {
    return "HOLD";
  }
  return "REVIEWING";
}

/**
 * Excel 날짜 시리얼 번호를 Date로 변환
 */
function parseExcelDate(value) {
  if (!value) return null;

  // 이미 날짜 문자열인 경우
  if (typeof value === "string") {
    const date = new Date(value);
    if (!isNaN(date.getTime())) return date.toISOString();
    return null;
  }

  // Excel 날짜 시리얼 번호인 경우
  if (typeof value === "number") {
    const excelEpoch = new Date(1899, 11, 30);
    const date = new Date(excelEpoch.getTime() + value * 24 * 60 * 60 * 1000);
    return date.toISOString();
  }

  return null;
}

async function main() {
  console.log("=".repeat(60));
  console.log("고객요구사항 엑셀 임포트 시작");
  console.log("파일:", FILE_PATH);
  console.log("프로젝트 ID:", PROJECT_ID);
  console.log("=".repeat(60));

  const client = await pool.connect();

  try {
    // 1. 기존 데이터 삭제
    console.log("\n🗑️  기존 고객요구사항 삭제 중...");
    const deleteResult = await client.query(
      `DELETE FROM customer_requirements WHERE "projectId" = $1`,
      [PROJECT_ID]
    );
    console.log(`   삭제된 항목: ${deleteResult.rowCount}건`);

    // 2. 엑셀 파일 읽기
    console.log("\n📂 엑셀 파일 읽는 중...");
    const workbook = XLSX.readFile(FILE_PATH);
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });

    console.log(`   시트: ${sheetName}`);
    console.log(`   전체 행: ${data.length}`);

    // 3. 중복 관리번호 추적을 위한 Map
    const codeCount = new Map();
    const processedRows = [];

    // 4. 데이터 전처리
    console.log("\n🔄 데이터 전처리 중...");
    let sequence = 1;

    for (let rowIdx = 1; rowIdx < data.length; rowIdx++) {
      const row = data[rowIdx];
      if (!row) continue;

      // 빈 행 스킵
      const hasData = row.some((cell) => cell != null && cell !== "");
      if (!hasData) continue;

      // 컬럼 매핑
      const excelCode = String(row[1] || "").trim();
      const businessUnit = String(row[2] || "").trim();
      const category = row[3] ? String(row[3]).trim() : null;
      const functionName = String(row[4] || "").trim();
      let content = String(row[5] || "").trim();
      const requestDate = parseExcelDate(row[6]);
      const requester = row[7] ? String(row[7]).trim() : null;
      const solution = row[8] ? String(row[8]).trim() : null;
      const applyStatus = parseApplyStatus(row[9] ? String(row[9]) : null);
      const remarks = row[10] ? String(row[10]).trim() : null;

      // 필수 값 체크 (사업부, 기능명은 필수)
      if (!businessUnit || !functionName) {
        console.log(`   ⚠️  행 ${rowIdx + 1} 스킵: 사업부 또는 기능명 누락`);
        continue;
      }

      // 요구사항 비어있으면 "요구사항 없음" 처리
      if (!content) {
        content = "요구사항 없음";
        console.log(`   📝 행 ${rowIdx + 1}: 요구사항 빈값 → "요구사항 없음" 처리`);
      }

      // 관리번호 처리 (중복 시 접미사 추가)
      let code = excelCode;
      if (!code) {
        code = `RQIT_${String(sequence).padStart(5, "0")}`;
      }

      // 중복 체크
      if (codeCount.has(code)) {
        const count = codeCount.get(code);
        codeCount.set(code, count + 1);
        code = `${code}_중복${count}`;
        console.log(`   🔁 행 ${rowIdx + 1}: 중복 관리번호 → "${code}"`);
      } else {
        codeCount.set(code, 1);
      }

      processedRows.push({
        sequence,
        code,
        businessUnit,
        category,
        functionName,
        content,
        requestDate,
        requester,
        solution,
        applyStatus,
        remarks,
      });

      sequence++;
    }

    console.log(`\n   전처리 완료: ${processedRows.length}건`);

    // 5. DB 삽입
    console.log("\n💾 DB 삽입 중...");
    let insertedCount = 0;

    for (const row of processedRows) {
      await client.query(
        `INSERT INTO customer_requirements
         ("id", "projectId", "sequence", "code", "businessUnit", "category",
          "functionName", "content", "requestDate", "requester",
          "solution", "applyStatus", "remarks", "createdAt", "updatedAt")
         VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW(), NOW())`,
        [
          PROJECT_ID,
          row.sequence,
          row.code,
          row.businessUnit,
          row.category,
          row.functionName,
          row.content,
          row.requestDate,
          row.requester,
          row.solution,
          row.applyStatus,
          row.remarks,
        ]
      );
      insertedCount++;
    }

    console.log(`\n${"=".repeat(60)}`);
    console.log(`✅ 임포트 완료!`);
    console.log(`   총 삽입: ${insertedCount}건`);
    console.log(`${"=".repeat(60)}`);

  } catch (error) {
    console.error("\n❌ 오류 발생:", error.message);
    console.error(error.stack);
  } finally {
    client.release();
    await pool.end();
  }
}

main();
