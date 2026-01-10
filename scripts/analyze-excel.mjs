/**
 * @file scripts/analyze-excel.mjs
 * @description
 * Excel 파일의 시트 구조와 컬럼을 분석하는 스크립트
 * 실행: node scripts/analyze-excel.mjs
 */

import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const XLSX = require('xlsx');

const filePath = './scripts/excel_data.xlsx';

try {
  const workbook = XLSX.readFile(filePath);

  console.log('=== Excel 파일 분석 ===\n');
  console.log('시트 목록:');
  workbook.SheetNames.forEach((name, idx) => {
    console.log(`  ${idx + 1}. ${name}`);
  });

  console.log('\n=== 각 시트 상세 분석 ===\n');

  // 재료관리부터 이송용 매거진 관리까지 시트 찾기
  const targetSheets = [];
  let startFound = false;
  let endFound = false;

  for (const sheetName of workbook.SheetNames) {
    if (sheetName.includes('재료관리') || sheetName === '재료관리') {
      startFound = true;
    }

    if (startFound && !endFound) {
      targetSheets.push(sheetName);
    }

    if (sheetName.includes('이송용') && sheetName.includes('매거진')) {
      endFound = true;
    }
  }

  console.log('대상 시트:');
  targetSheets.forEach((name, idx) => {
    console.log(`  ${idx + 1}. ${name}`);
  });

  console.log('\n=== 대상 시트 컬럼 분석 ===\n');

  for (const sheetName of targetSheets) {
    const sheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });

    console.log(`\n--- 시트: ${sheetName} ---`);
    console.log(`  총 행 수: ${data.length}`);

    if (data.length > 0) {
      // 첫 5행 출력 (헤더 구조 파악)
      console.log('  처음 5행:');
      for (let i = 0; i < Math.min(5, data.length); i++) {
        const row = data[i];
        if (row && row.length > 0) {
          console.log(`    행${i + 1}: ${JSON.stringify(row.slice(0, 10))}${row.length > 10 ? '...' : ''}`);
        }
      }

      // 실제 데이터가 있는 첫 행 찾기 (헤더)
      let headerRow = null;
      for (let i = 0; i < Math.min(10, data.length); i++) {
        const row = data[i];
        if (row && row.filter(cell => cell != null && cell !== '').length >= 3) {
          headerRow = row;
          console.log(`  헤더 후보 (행${i + 1}): ${JSON.stringify(headerRow)}`);
          break;
        }
      }
    }
  }

} catch (error) {
  console.error('오류 발생:', error.message);
}
