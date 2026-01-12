/**
 * @file src/app/api/equipment/import/route.ts
 * @description
 * 설비 정보 엑셀 임포트 API 라우트입니다.
 * FormData로 파일을 받아서 Equipment 테이블에 대량 삽입합니다.
 *
 * 초보자 가이드:
 * 1. **POST /api/equipment/import**: 엑셀 파일 업로드 및 임포트
 *    - FormData: file (엑셀 파일), projectId, divisionCode
 * 2. **설비 코드**: 자동 생성 (EQ-{사업부}-{순번})
 * 3. **설비 타입**: 명칭으로 자동 유추
 * 4. **상태**: 기본값 ACTIVE (가동)
 *
 * 수정 방법:
 * - 컬럼 매핑: inferEquipmentFromRow 함수 수정
 * - 타입 유추: inferEquipmentType 함수 수정
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import * as XLSX from "xlsx";
import { EquipmentType, EquipmentStatus } from "@prisma/client";
import { getAuthenticatedUser } from "@/lib/auth";

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

/** 엑셀 행에서 설비 정보 추출 */
function inferEquipmentFromRow(row: any, divisionCode: string, index: number) {
  // 컬럼명 매핑 (다양한 경우 지원)
  const name = row["명칭"] || row["설비명"] || row["설비명칭"] || "";
  const model = row["모델"] || row["모델명"] || "";
  const manufacturer = row["제조사"] || row["제작사"] || "";
  const process = row["공정"] || row["위치"] || "";

  // 라인 코드 (1-1, 1-2, 2-1 등)
  const lineCode =
    row["라인"] ||
    row["1-1"] ||
    row["1-2"] ||
    row["2-1"] ||
    row["2-2"] ||
    row["LINE"] ||
    "";

  // 필수 필드 검증
  if (!name || name.trim() === "") {
    return null;
  }

  // 설비 타입 유추
  const type = inferEquipmentType(name);

  // 설비 코드 생성
  const code = `EQ-${divisionCode}-${String(index).padStart(4, "0")}`;

  return {
    code,
    name: name.trim(),
    type,
    status: "ACTIVE" as EquipmentStatus,
    modelNumber: model?.trim() || null,
    manufacturer: manufacturer?.trim() || null,
    location: process?.trim() || null,
    lineCode: lineCode?.trim() || null,
    divisionCode,
    positionX: (index % 10) * 200, // 자동 배치 (10개씩 가로 배열)
    positionY: Math.floor(index / 10) * 150, // 세로 간격
  };
}

/**
 * 설비 정보 엑셀 임포트
 * POST /api/equipment/import
 */
export async function POST(request: NextRequest) {
  try {
    // 인증 확인
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File;
    const projectId = formData.get("projectId") as string;
    const divisionCode = formData.get("divisionCode") as string;

    // 필수 필드 검증
    if (!file) {
      return NextResponse.json({ error: "파일이 필요합니다." }, { status: 400 });
    }
    if (!projectId) {
      return NextResponse.json({ error: "프로젝트 ID가 필요합니다." }, { status: 400 });
    }
    if (!divisionCode) {
      return NextResponse.json({ error: "사업부 코드가 필요합니다." }, { status: 400 });
    }

    // 프로젝트 존재 확인
    const project = await prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      return NextResponse.json({ error: "프로젝트를 찾을 수 없습니다." }, { status: 404 });
    }

    // 엑셀 파일 읽기
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const workbook = XLSX.read(buffer, { type: "buffer" });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet);

    console.log(`총 ${data.length}개 행 발견`);

    // 데이터 매핑 및 삽입
    const successItems: string[] = [];
    const errorItems: string[] = [];

    for (let i = 0; i < data.length; i++) {
      const row: any = data[i];

      try {
        const equipmentData = inferEquipmentFromRow(row, divisionCode, i + 1);

        if (!equipmentData) {
          console.warn(`⚠️  행 ${i + 1}: 명칭이 없어서 건너뜁니다.`);
          errorItems.push(`행 ${i + 1}: 명칭 없음`);
          continue;
        }

        // DB 삽입
        await prisma.equipment.create({
          data: {
            ...equipmentData,
            projectId,
          },
        });

        successItems.push(equipmentData.name);
        console.log(`✅ [${i + 1}/${data.length}] ${equipmentData.name} (${equipmentData.code})`);
      } catch (error) {
        console.error(`❌ 행 ${i + 1} 처리 실패:`, error);
        errorItems.push(`행 ${i + 1}: ${error instanceof Error ? error.message : "알 수 없는 오류"}`);
      }
    }

    return NextResponse.json(
      {
        success: true,
        message: `총 ${data.length}개 중 ${successItems.length}개 성공, ${errorItems.length}개 실패`,
        successCount: successItems.length,
        errorCount: errorItems.length,
        successItems,
        errorItems,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("설비 임포트 실패:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "설비를 임포트할 수 없습니다." },
      { status: 500 }
    );
  }
}
