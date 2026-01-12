/**
 * @file scripts/analyze-excel-raw.ts
 * @description 엑셀 파일의 raw 셀 데이터를 출력합니다.
 */

import { config } from "dotenv";
config({ path: ".env.local" });

import * as XLSX from "xlsx";
import fs from "fs";

async function main() {
  const filePath = process.argv[2];

  if (!filePath || !fs.existsSync(filePath)) {
    console.error("파일을 찾을 수 없습니다.");
    process.exit(1);
  }

  const workbook = XLSX.readFile(filePath);
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  const range = XLSX.utils.decode_range(worksheet["!ref"] || "A1");

  console.log("=== 엑셀 Raw 데이터 분석 ===");
  console.log(`시트: ${sheetName}`);
  console.log(`범위: ${XLSX.utils.encode_range(range)}`);
  console.log(`행: ${range.s.r} ~ ${range.e.r} (${range.e.r - range.s.r + 1}개)`);
  console.log(`열: ${range.s.c} ~ ${range.e.c} (${range.e.c - range.s.c + 1}개)`);
  console.log("");

  // 첫 10개 컬럼의 처음 20개 행 출력
  console.log("=== 첫 10개 컬럼, 처음 20개 행 ===\n");

  const maxCol = Math.min(range.s.c + 10, range.e.c);
  const maxRow = Math.min(range.s.r + 20, range.e.r);

  for (let row = range.s.r; row <= maxRow; row++) {
    const rowData: string[] = [];
    for (let col = range.s.c; col <= maxCol; col++) {
      const cellAddress = XLSX.utils.encode_cell({ r: row, c: col });
      const cell = worksheet[cellAddress];
      const value = cell ? String(cell.v) : "";
      rowData.push(value.substring(0, 15).padEnd(15, " "));
    }
    console.log(`행 ${row + 1}: ${rowData.join(" | ")}`);
  }
}

main().catch(console.error);
