/**
 * @file src/app/api/equipment/import/route.ts
 * @description
 * 설비 정보 엑셀 임포트 API 라우트입니다.
 * FormData로 파일을 받아서 Equipment 테이블에 대량 삽입합니다.
 *
 * 초보자 가이드:
 * 1. **POST /api/equipment/import**: 엑셀 파일 업로드 및 임포트
 *    - FormData: file (엑셀 파일), projectId
 * 2. **설비 코드**: 자동 생성 (EQ-POLE-{순번}), 순번은 프로젝트의 기존 설비 수 다음부터 (중복 방지)
 *    - 사업부(구분코드)는 받지 않는다. divisionCode 는 null 로 저장
 * 3. **설비 타입**: 명칭으로 자동 유추
 * 4. **상태**: 기본값 ACTIVE (가동)
 * - 인증: requireAuth + assertProjectAccess (프로젝트 멤버 · ADMIN 만)
 *
 * 수정 방법:
 * - 컬럼 매핑: inferEquipmentFromRow 함수 수정
 * - 타입 유추: src/lib/equipment-type.ts 의 inferEquipmentType 규칙 수정
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import * as XLSX from "xlsx";
import { EquipmentStatus } from "@prisma/client";
import { requireAuth, assertProjectAccess } from "@/lib/auth";
import { DEFAULT_BUSINESS_UNIT } from "@/constants/business-units";
import { inferEquipmentType } from "@/lib/equipment-type";


/** 엑셀 행에서 설비 정보 추출 */
function inferEquipmentFromRow(row: any, index: number) {
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
  const codePrefix = DEFAULT_BUSINESS_UNIT;
  const code = `EQ-${codePrefix}-${String(index).padStart(4, "0")}`;

  return {
    code,
    name: name.trim(),
    type,
    status: "ACTIVE" as EquipmentStatus,
    modelNumber: model?.trim() || null,
    manufacturer: manufacturer?.trim() || null,
    location: process?.trim() || null,
    lineCode: lineCode?.trim() || null,
    divisionCode: null,
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
    const { user, error: authError } = await requireAuth();
    if (authError) return authError;

    const formData = await request.formData();
    const file = formData.get("file") as File;
    const projectId = formData.get("projectId") as string;


    // 필수 필드 검증
    if (!file) {
      return NextResponse.json({ error: "파일이 필요합니다." }, { status: 400 });
    }
    if (!projectId) {
      return NextResponse.json({ error: "프로젝트 ID가 필요합니다." }, { status: 400 });
    }

    // 프로젝트 존재 확인
    const project = await prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      return NextResponse.json({ error: "프로젝트를 찾을 수 없습니다." }, { status: 404 });
    }

    const accessError = await assertProjectAccess(projectId, user!);
    if (accessError) return accessError;

    // 엑셀 파일 읽기
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const workbook = XLSX.read(buffer, { type: "buffer" });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet);

    console.log(`총 ${data.length}개 행 발견`);

    // 설비코드 순번 시작점: 프로젝트의 기존 설비 수 (반복 가져오기 시 코드 중복 방지)
    const codeStart = await prisma.equipment.count({ where: { projectId } });

    // 데이터 매핑 및 삽입
    const successItems: string[] = [];
    const errorItems: string[] = [];

    for (let i = 0; i < data.length; i++) {
      const row: any = data[i];

      try {
        const equipmentData = inferEquipmentFromRow(row, codeStart + i + 1);

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
