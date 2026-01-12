/**
 * @file scripts/import-vietnam-ivi-equipment.ts
 * @description
 * 베트남 IVI 설비정보 엑셀 파일을 읽어서 Equipment 테이블에 임포트합니다.
 *
 * 초보자 가이드:
 * 1. **엑셀 파일 읽기**: xlsx 라이브러리 사용
 * 2. **데이터 매핑**:
 *    - 명칭 → name (설비명)
 *    - 모델 → modelNumber
 *    - 제조사 → manufacturer
 *    - V_IVI → divisionCode (사업부)
 *    - 공정 → location (위치정보)
 *    - 1-1, 1-2 등 → lineCode (라인정보)
 * 3. **설비 타입 유추**: 명칭에서 키워드 추출
 * 4. **상태**: 모두 ACTIVE (가동)
 *
 * 실행 방법:
 * npx tsx scripts/import-vietnam-ivi-equipment.ts <projectId> <excelFilePath>
 *
 * @example
 * npx tsx scripts/import-vietnam-ivi-equipment.ts "프로젝트ID" "D:\Download\베트남_IVI_설비정보.xlsx"
 */

import { config } from "dotenv";
config({ path: ".env.local" });

import * as XLSX from "xlsx";
import { EquipmentType, EquipmentStatus } from "@prisma/client";
import path from "path";
import fs from "fs";
import { prisma } from "../src/lib/prisma";

/** 설비 타입 유추 함수 */
function inferEquipmentType(name: string): EquipmentType {
  const nameLower = name.toLowerCase();

  // 키워드 매칭
  if (nameLower.includes("사출") || nameLower.includes("cnc") || nameLower.includes("기계")) {
    return "MACHINE";
  }
  if (nameLower.includes("센서") || nameLower.includes("컨트롤러") || nameLower.includes("장치")) {
    return "DEVICE";
  }
  if (nameLower.includes("컨베이어") || nameLower.includes("운반")) {
    return "CONVEYOR";
  }
  if (nameLower.includes("검사") || nameLower.includes("측정")) {
    return "INSPECTION";
  }
  if (nameLower.includes("pc") || nameLower.includes("컴퓨터")) {
    return "PC";
  }
  if (nameLower.includes("프린터") || nameLower.includes("printer")) {
    return "PRINTER";
  }
  if (nameLower.includes("스캐너") || nameLower.includes("scanner")) {
    return "SCANNER";
  }

  // 기본값
  return "MACHINE";
}

/** 설비 코드 생성 함수 */
function generateEquipmentCode(index: number): string {
  return `EQ-IVI-${String(index).padStart(4, "0")}`;
}

/** 메인 임포트 함수 */
async function importEquipment(projectId: string, filePath: string) {
  console.log("=== 베트남 IVI 설비정보 임포트 시작 ===");
  console.log("프로젝트 ID:", projectId);
  console.log("파일 경로:", filePath);

  // 파일 존재 확인
  if (!fs.existsSync(filePath)) {
    throw new Error(`파일을 찾을 수 없습니다: ${filePath}`);
  }

  // 프로젝트 존재 확인
  const project = await prisma.project.findUnique({
    where: { id: projectId },
  });

  if (!project) {
    throw new Error(`프로젝트를 찾을 수 없습니다: ${projectId}`);
  }

  console.log("프로젝트:", project.name);

  // 엑셀 파일 읽기
  console.log("\n엑셀 파일 읽는 중...");
  const workbook = XLSX.readFile(filePath);
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  const data = XLSX.utils.sheet_to_json(worksheet);

  console.log(`총 ${data.length}개 행 발견`);

  // 데이터 매핑 및 삽입
  let successCount = 0;
  let errorCount = 0;

  for (let i = 0; i < data.length; i++) {
    const row: any = data[i];

    try {
      // 필드 매핑 (엑셀 컬럼명에 맞게 조정)
      const name = row["명칭"] || row["설비명"] || "";
      const model = row["모델"] || "";
      const manufacturer = row["제조사"] || "";
      const process = row["공정"] || "";
      const lineCode = row["1-1"] || row["1-2"] || row["라인"] || "";

      // 필수 필드 검증
      if (!name) {
        console.warn(`⚠️  행 ${i + 1}: 명칭이 없어서 건너뜁니다.`);
        errorCount++;
        continue;
      }

      // 설비 타입 유추
      const type = inferEquipmentType(name);

      // 설비 코드 생성
      const code = generateEquipmentCode(i + 1);

      // DB 삽입
      await prisma.equipment.create({
        data: {
          code,
          name,
          type,
          status: "ACTIVE" as EquipmentStatus,
          modelNumber: model || null,
          manufacturer: manufacturer || null,
          location: process || null,
          lineCode: lineCode || null,
          divisionCode: "V_IVI",
          projectId,
          positionX: (i % 10) * 200, // 자동 배치 (10개씩 가로 배열)
          positionY: Math.floor(i / 10) * 150, // 세로 간격
        },
      });

      successCount++;
      console.log(`✅ [${i + 1}/${data.length}] ${name} (${code})`);
    } catch (error) {
      errorCount++;
      console.error(`❌ 행 ${i + 1} 처리 실패:`, error);
    }
  }

  console.log("\n=== 임포트 완료 ===");
  console.log(`성공: ${successCount}개`);
  console.log(`실패: ${errorCount}개`);
}

/** 메인 실행 */
async function main() {
  const args = process.argv.slice(2);

  if (args.length < 2) {
    console.error("사용법: npx tsx scripts/import-vietnam-ivi-equipment.ts <projectId> <excelFilePath>");
    process.exit(1);
  }

  const [projectId, filePath] = args;

  try {
    await importEquipment(projectId, filePath);
  } catch (error) {
    console.error("임포트 실패:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
