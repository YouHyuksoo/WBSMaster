/**
 * @file scripts/analyze-excel.mjs
 * @description
 * 고객요구사항 엑셀 파일을 분석하여 임포트 누락 원인을 찾는 스크립트
 * 실행: node scripts/analyze-excel.mjs [파일경로]
 */

import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const XLSX = require('xlsx');

// 명령줄 인자 또는 기본 파일 경로
const filePath = process.argv[2] || 'D:\\Download\\2_1_3.요청사항정의(사업부 통합).xlsx';

console.log('='.repeat(60));
console.log('엑셀 파일 분석 시작');
console.log('파일:', filePath);
console.log('='.repeat(60));

try {
  const workbook = XLSX.readFile(filePath);

  // 시트 정보
  console.log('\n📋 시트 목록:', workbook.SheetNames);

  // 첫 번째 시트 분석
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });

  console.log(`\n📊 시트 "${sheetName}" 분석`);
  console.log(`- 전체 행 수: ${data.length}`);
  console.log(`- 데이터 행 수 (헤더 제외): ${data.length - 1}`);

  // 헤더 분석
  const headers = data[0];
  console.log(`\n📑 헤더 (${headers?.length || 0}개 컬럼):`);
  headers?.forEach((h, idx) => {
    console.log(`  [${idx}] ${h || '(빈 값)'}`);
  });

  // 각 행 분석
  console.log('\n🔍 행별 상세 분석:');
  console.log('-'.repeat(60));

  const stats = {
    total: 0,
    valid: 0,
    emptyRows: 0,
    shortRows: [],      // 컬럼 부족
    missingFields: [],  // 필수 값 누락
    duplicateCodes: [], // 중복 관리번호
  };

  const seenCodes = new Set();

  for (let rowIdx = 1; rowIdx < data.length; rowIdx++) {
    const row = data[rowIdx];
    const rowNum = rowIdx + 1; // 엑셀 행 번호 (1-based)

    // 행이 없는 경우
    if (!row) {
      stats.emptyRows++;
      continue;
    }

    // 빈 행 체크
    const hasData = row.some((cell) => cell != null && cell !== '');
    if (!hasData) {
      stats.emptyRows++;
      continue;
    }

    stats.total++;

    // 컬럼 수 체크 (6개 미만)
    if (row.length < 6) {
      stats.shortRows.push({
        row: rowNum,
        colCount: row.length,
        data: row.slice(0, 5).map(c => String(c || '').substring(0, 20)),
      });
      continue;
    }

    // 컬럼 매핑 (API와 동일한 인덱스)
    // 순번(0), 요구번호(1), 사업부(2), 업무구분(3), 기능명(4), 요구사항(5)
    const sequence = row[0];
    const excelCode = String(row[1] || '').trim();
    const businessUnit = String(row[2] || '').trim();
    const category = row[3] ? String(row[3]).trim() : null;
    const functionName = String(row[4] || '').trim();
    const content = String(row[5] || '').trim();

    // 필수 값 체크: 사업부, 기능명, 요구사항
    if (!businessUnit || !functionName || !content) {
      const missing = [];
      if (!businessUnit) missing.push('사업부');
      if (!functionName) missing.push('기능명');
      if (!content) missing.push('요구사항');

      stats.missingFields.push({
        row: rowNum,
        missing: missing.join(', '),
        values: {
          순번: sequence,
          요구번호: excelCode,
          사업부: businessUnit || '(없음)',
          기능명: functionName || '(없음)',
          요구사항: content ? content.substring(0, 30) + '...' : '(없음)',
        },
      });
      continue;
    }

    // 중복 관리번호 체크
    if (excelCode && seenCodes.has(excelCode)) {
      stats.duplicateCodes.push({
        row: rowNum,
        code: excelCode,
      });
      continue;
    }
    if (excelCode) seenCodes.add(excelCode);

    stats.valid++;
  }

  // 결과 출력
  console.log('\n' + '='.repeat(60));
  console.log('📈 분석 결과');
  console.log('='.repeat(60));

  console.log(`\n✅ 유효한 데이터: ${stats.valid}건`);
  console.log(`📊 전체 데이터 행: ${stats.total}건 (빈 행 제외)`);
  console.log(`⚪ 빈 행: ${stats.emptyRows}건`);

  if (stats.shortRows.length > 0) {
    console.log(`\n❌ 컬럼 수 부족: ${stats.shortRows.length}건`);
    stats.shortRows.forEach(item => {
      console.log(`   - 행 ${item.row}: ${item.colCount}개 컬럼 (데이터: ${item.data.join(' | ')})`);
    });
  }

  if (stats.missingFields.length > 0) {
    console.log(`\n❌ 필수 값 누락: ${stats.missingFields.length}건`);
    stats.missingFields.forEach(item => {
      console.log(`   - 행 ${item.row}: ${item.missing} 누락`);
      console.log(`     순번: ${item.values.순번}, 요구번호: ${item.values.요구번호}`);
      console.log(`     사업부: ${item.values.사업부}, 기능명: ${item.values.기능명}`);
      console.log(`     요구사항: ${item.values.요구사항}`);
    });
  }

  if (stats.duplicateCodes.length > 0) {
    console.log(`\n❌ 중복 관리번호: ${stats.duplicateCodes.length}건`);
    stats.duplicateCodes.forEach(item => {
      console.log(`   - 행 ${item.row}: "${item.code}"`);
    });
  }

  // 총 누락 건수
  const totalSkipped = stats.shortRows.length + stats.missingFields.length + stats.duplicateCodes.length;
  console.log(`\n${'='.repeat(60)}`);
  console.log(`🔴 총 누락 예상: ${totalSkipped}건`);
  console.log(`🟢 임포트 예상: ${stats.valid}건`);
  console.log(`${'='.repeat(60)}`);

} catch (error) {
  console.error('오류 발생:', error.message);
  console.error(error.stack);
}
