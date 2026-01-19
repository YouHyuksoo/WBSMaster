/**
 * 엑셀 파일 읽기 테스트
 */

import * as XLSX from "xlsx";

console.log("🚀 엑셀 파일 테스트 시작...\n");

try {
  const filePath = "D:/Download/2_1_2_1.프로세스 맵핑_251217_jylee_V2 (1).xlsx";
  console.log(`📂 파일 경로: ${filePath}\n`);

  const workbook = XLSX.readFile(filePath);
  console.log("✅ 엑셀 파일 읽기 성공!\n");

  console.log("📋 시트 목록:");
  Object.keys(workbook.Sheets).forEach((sheetName) => {
    console.log(`   - ${sheetName}`);
  });

  // V_PCBA 시트 읽기
  if (workbook.Sheets["V_PCBA"]) {
    console.log("\n📊 V_PCBA 시트 데이터:");
    const sheet = workbook.Sheets["V_PCBA"];
    const data = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][];
    console.log(`   총 행 수: ${data.length}`);
    console.log(`   헤더 (1행): ${JSON.stringify(data[0])}`);
    console.log(`   헤더 (2행): ${JSON.stringify(data[1])}`);
    console.log(`   데이터 샘플 (3행): ${JSON.stringify(data[2])}`);
  } else {
    console.log("\n❌ V_PCBA 시트를 찾을 수 없습니다.");
  }

} catch (error) {
  console.error("❌ 오류 발생:", error);
}
