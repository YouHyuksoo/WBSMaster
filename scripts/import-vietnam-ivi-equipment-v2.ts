/**
 * @file scripts/import-vietnam-ivi-equipment-v2.ts
 * @description
 * 베트남 IVI 설비정보 엑셀 파일을 읽어서 Equipment 테이블에 임포트합니다.
 * 컬럼 기반 구조 (각 열이 하나의 라인, 세로로 설비 나열)
 *
 * 실행 방법:
 * npx tsx -r dotenv/config scripts/import-vietnam-ivi-equipment-v2.ts <projectId> <excelFilePath> dotenv_config_path=.env.local
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
  if (
    nameLower.includes("사출") ||
    nameLower.includes("cnc") ||
    nameLower.includes("기계") ||
    nameLower.includes("printer") ||
    nameLower.includes("screen") ||
    nameLower.includes("mounter") ||
    nameLower.includes("chip")
  ) {
    return "MACHINE";
  }
  if (nameLower.includes("센서") || nameLower.includes("컨트롤러") || nameLower.includes("장치")) {
    return "DEVICE";
  }
  if (nameLower.includes("컨베이어") || nameLower.includes("운반") || nameLower.includes("loader")) {
    return "CONVEYOR";
  }
  if (
    nameLower.includes("검사") ||
    nameLower.includes("측정") ||
    nameLower.includes("aoi") ||
    nameLower.includes("spi")
  ) {
    return "INSPECTION";
  }
  if (nameLower.includes("pc") || nameLower.includes("컴퓨터")) {
    return "PC";
  }

  // 기본값
  return "MACHINE";
}

/** 설비 코드 생성 함수 */
function generateEquipmentCode(lineCode: string, index: number): string {
  return `EQ-IVI-${lineCode.replace("-", "")}-${String(index).padStart(3, "0")}`;
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

  // 엑셀 파일 읽기 (raw 배열로)
  console.log("\n엑셀 파일 읽는 중...");
  const workbook = XLSX.readFile(filePath);
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];

  // sheet_to_json 대신 range로 직접 읽기
  const range = XLSX.utils.decode_range(worksheet["!ref"] || "A1");
  console.log(`시트 범위: ${XLSX.utils.encode_range(range)}`);

  let successCount = 0;
  let errorCount = 0;
  let globalIndex = 0;

  // 각 컬럼(라인) 순회
  for (let col = range.s.c; col <= range.e.c; col++) {
    // 시트가 B2부터 시작하므로 실제 행 번호는 range.s.r부터
    const startRow = range.s.r;

    // 1행: 라인 코드 (실제 2행인 경우)
    const lineCodeCell = worksheet[XLSX.utils.encode_cell({ r: startRow, c: col })];
    const lineCode = lineCodeCell ? String(lineCodeCell.v).trim() : null;

    if (!lineCode || lineCode === "" || lineCode === "OFF") {
      continue;
    }

    // 2행: "공정" (헤더) - startRow + 1
    // 3행: 공정 타입 (SMT, PCBA 등) - startRow + 2
    const processTypeCell = worksheet[XLSX.utils.encode_cell({ r: startRow + 1, c: col })];
    const processType = processTypeCell ? String(processTypeCell.v).trim() : "";

    console.log(`\n=== 라인: ${lineCode} (공정: ${processType}) ===`);

    // 4행부터 설비 데이터 읽기 - startRow + 2부터
    let lineEquipmentIndex = 0;
    for (let row = startRow + 2; row <= range.e.r; row++) {
      const cell = worksheet[XLSX.utils.encode_cell({ r: row, c: col })];

      if (!cell || !cell.v || String(cell.v).trim() === "") {
        continue;
      }

      const cellValue = String(cell.v).trim();

      // "공정", "SMT", "PCBA" 등 헤더 제외
      if (cellValue === "공정" || cellValue === lineCode) {
        continue;
      }

      try {
        // 설비명
        const name = cellValue;

        // 설비 타입 유추
        const type = inferEquipmentType(name);

        // 설비 코드 생성
        globalIndex++;
        lineEquipmentIndex++;
        const code = generateEquipmentCode(lineCode, lineEquipmentIndex);

        // DB 삽입
        await prisma.equipment.create({
          data: {
            code,
            name,
            type,
            status: "ACTIVE" as EquipmentStatus,
            location: processType || null,
            lineCode: lineCode,
            divisionCode: "V_IVI",
            projectId,
            positionX: col * 250,
            positionY: lineEquipmentIndex * 120,
          },
        });

        successCount++;
        console.log(`  ✅ [${successCount}] ${name} (${code})`);
      } catch (error) {
        errorCount++;
        console.error(`  ❌ 행 ${row + 1}, 열 ${col + 1} 처리 실패:`, error);
      }
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
    console.error(
      "사용법: npx tsx -r dotenv/config scripts/import-vietnam-ivi-equipment-v2.ts <projectId> <excelFilePath> dotenv_config_path=.env.local"
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
