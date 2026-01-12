/**
 * @file scripts/import-vietnam-ivi-equipment-v3.ts
 * @description
 * 베트남 IVI 설비정보 엑셀 파일을 읽어서 Equipment 테이블에 임포트합니다.
 *
 * 엑셀 구조:
 * - 1행: "공정" 컬럼 = 라인 시작점, 다음 컬럼에 라인코드
 * - 2행: 컬럼 타이틀 (SMT, 순서, 장비모델, 명칭, Maker)
 * - 3행부터: 실제 설비 데이터
 *
 * 실행 방법:
 * npx tsx -r dotenv/config scripts/import-vietnam-ivi-equipment-v3.ts <projectId> <excelFilePath> dotenv_config_path=.env.local
 */

import { config } from "dotenv";
config({ path: ".env.local" });

import * as XLSX from "xlsx";
import { EquipmentType, EquipmentStatus } from "@prisma/client";
import fs from "fs";
import { prisma } from "../src/lib/prisma";

/** 설비 타입 유추 함수 */
function inferEquipmentType(name: string): EquipmentType {
  const nameLower = name.toLowerCase();

  if (
    nameLower.includes("mounter") ||
    nameLower.includes("printer") ||
    nameLower.includes("screen") ||
    nameLower.includes("chip") ||
    nameLower.includes("bonding") ||
    nameLower.includes("loader") ||
    nameLower.includes("marking")
  ) {
    return "MACHINE";
  }
  if (nameLower.includes("conveyor") || nameLower.includes("buffer")) {
    return "CONVEYOR";
  }
  if (
    nameLower.includes("aoi") ||
    nameLower.includes("spi") ||
    nameLower.includes("검사") ||
    nameLower.includes("측정")
  ) {
    return "INSPECTION";
  }
  if (nameLower.includes("pc") || nameLower.includes("컴퓨터")) {
    return "PC";
  }

  return "MACHINE";
}

/** 설비 코드 생성 함수 */
function generateEquipmentCode(lineCode: string, index: number): string {
  const sanitizedLine = lineCode.replace(/[^0-9]/g, ""); // 숫자만 추출
  return `EQ-IVI-L${sanitizedLine}-${String(index).padStart(3, "0")}`;
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
  const range = XLSX.utils.decode_range(worksheet["!ref"] || "A1");

  console.log(`시트 범위: ${XLSX.utils.encode_range(range)}`);

  let successCount = 0;
  let errorCount = 0;

  // 1행에서 "공정" 컬럼 찾기 (각 라인의 시작점)
  const lineStartColumns: number[] = [];
  for (let col = range.s.c; col <= range.e.c; col++) {
    const cell = worksheet[XLSX.utils.encode_cell({ r: 0, c: col })];
    if (cell && String(cell.v).trim() === "공정") {
      lineStartColumns.push(col);
    }
  }

  console.log(`\n${lineStartColumns.length}개 라인 발견`);

  // 각 라인별로 설비 데이터 읽기
  for (let i = 0; i < lineStartColumns.length; i++) {
    const lineStartCol = lineStartColumns[i];

    // 라인 코드 읽기 (1행, 다음 컬럼)
    const lineCodeCell = worksheet[XLSX.utils.encode_cell({ r: 0, c: lineStartCol + 1 })];
    const lineCode = lineCodeCell ? String(lineCodeCell.v).trim() : `LINE-${i + 1}`;

    // 공정 타입 읽기 (2행, 같은 컬럼)
    const processTypeCell = worksheet[XLSX.utils.encode_cell({ r: 1, c: lineStartCol })];
    const processType = processTypeCell ? String(processTypeCell.v).trim() : "";

    console.log(`\n=== 라인: ${lineCode} (공정: ${processType}) ===`);

    // 컬럼 인덱스
    const colIndex = {
      order: lineStartCol + 1, // 순서
      model: lineStartCol + 2, // 장비모델
      name: lineStartCol + 3, // 명칭
      maker: lineStartCol + 4, // Maker
    };

    // 3행(index 2)부터 데이터 읽기
    let lineEquipmentIndex = 0;

    for (let row = 2; row <= range.e.r; row++) {
      const nameCell = worksheet[XLSX.utils.encode_cell({ r: row, c: colIndex.name })];

      if (!nameCell || !nameCell.v || String(nameCell.v).trim() === "") {
        continue;
      }

      const name = String(nameCell.v).trim();

      // 순서
      const orderCell = worksheet[XLSX.utils.encode_cell({ r: row, c: colIndex.order })];
      const order = orderCell ? String(orderCell.v).trim() : "";

      // 장비모델
      const modelCell = worksheet[XLSX.utils.encode_cell({ r: row, c: colIndex.model })];
      const model = modelCell ? String(modelCell.v).trim() : "";

      // 제조사
      const makerCell = worksheet[XLSX.utils.encode_cell({ r: row, c: colIndex.maker })];
      const maker = makerCell ? String(makerCell.v).trim() : "";

      try {
        lineEquipmentIndex++;

        // 설비 타입 유추
        const type = inferEquipmentType(name);

        // 설비 코드 생성
        const code = generateEquipmentCode(lineCode, lineEquipmentIndex);

        // DB 삽입
        await prisma.equipment.create({
          data: {
            code,
            name,
            type,
            status: "ACTIVE" as EquipmentStatus,
            modelNumber: model || null,
            manufacturer: maker || null,
            location: processType || null,
            lineCode: lineCode,
            divisionCode: "V_IVI",
            projectId,
            positionX: i * 300, // 라인별로 가로 배치
            positionY: lineEquipmentIndex * 100, // 설비별로 세로 배치
          },
        });

        successCount++;
        console.log(`  ✅ [${lineEquipmentIndex}] ${name} (${code}) - ${model} / ${maker}`);
      } catch (error) {
        errorCount++;
        console.error(`  ❌ 행 ${row + 1} 처리 실패:`, error);
      }
    }

    console.log(`  → 총 ${lineEquipmentIndex}개 설비 등록`);
  }

  console.log("\n=== 임포트 완료 ===");
  console.log(`성공: ${successCount}개`);
  console.log(`실패: ${errorCount}개`);
}

/** 메인 실행 */
async function main() {
  const args = process.argv.slice(2);

  if (args.length < 2) {
    console.error(
      "사용법: npx tsx -r dotenv/config scripts/import-vietnam-ivi-equipment-v3.ts <projectId> <excelFilePath> dotenv_config_path=.env.local"
    );
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
