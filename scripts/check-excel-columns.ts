/**
 * @file scripts/check-excel-columns.ts
 * @description 엑셀 파일의 컬럼명과 첫 5개 행 데이터를 출력합니다.
 */

import { config } from "dotenv";
config({ path: ".env.local" });

import * as XLSX from "xlsx";
import fs from "fs";

async function main() {
  const filePath = process.argv[2];

  if (!filePath) {
    console.error("사용법: npx tsx scripts/check-excel-columns.ts <excelFilePath>");
    process.exit(1);
  }

  if (!fs.existsSync(filePath)) {
    console.error(`파일을 찾을 수 없습니다: ${filePath}`);
    process.exit(1);
  }

  console.log("=== 엑셀 파일 분석 ===");
  console.log("파일:", filePath);
  console.log("");

  // 엑셀 파일 읽기
  const workbook = XLSX.readFile(filePath);
  console.log("시트 목록:", workbook.SheetNames.join(", "));
  console.log("");

  const sheetName = workbook.SheetNames[0];
  console.log("분석 시트:", sheetName);
  console.log("");

  const worksheet = workbook.Sheets[sheetName];
  const data = XLSX.utils.sheet_to_json(worksheet);

  if (data.length === 0) {
    console.log("데이터가 없습니다.");
    return;
  }

  // 첫 번째 행에서 컬럼명 추출
  const firstRow: any = data[0];
  const columns = Object.keys(firstRow);

  console.log("=== 컬럼 목록 ===");
  columns.forEach((col, idx) => {
    console.log(`${idx + 1}. "${col}"`);
  });
  console.log("");

  // 데이터가 있는 행만 출력
  console.log("=== 데이터가 있는 행들 ===");
  data.forEach((row: any, idx) => {
    const hasData = columns.some((col) => {
      const value = row[col];
      return value !== undefined && value !== null && value !== "";
    });

    if (hasData) {
      console.log(`\n--- 행 ${idx + 1} ---`);
      columns.forEach((col) => {
        const value = row[col];
        if (value !== undefined && value !== null && value !== "") {
          console.log(`  ${col}: ${value}`);
        }
      });
    }
  });

  console.log(`\n\n총 ${data.length}개 행`);
}

main().catch(console.error);
