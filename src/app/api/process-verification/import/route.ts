/**
 * @file src/app/api/process-verification/import/route.ts
 * @description
 * Excel 파일을 업로드하여 공정검증 데이터를 가져오는 API 라우트입니다.
 * FormData로 업로드된 엑셀 파일을 파싱하여 DB에 저장합니다.
 *
 * 초보자 가이드:
 * POST /api/process-verification/import (multipart/form-data)
 * - file: 엑셀 파일 (.xlsx, .xls)
 * - projectId: 프로젝트 ID (필수)
 * - clearExisting: 기존 데이터 삭제 여부 (선택, 기본값 "false")
 *
 * 단일 시트 방식:
 * - 첫 번째 시트의 데이터를 가져옵니다
 * - "구분" 컬럼의 값으로 카테고리를 자동 생성합니다
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import * as XLSX from "xlsx";

/**
 * 카테고리 이름을 영문 코드로 변환
 */
function getCategoryCode(categoryName: string): string {
  const codeMap: Record<string, string> = {
    "재료관리": "MATERIAL",
    "SMD공정관리": "SMD_PROCESS",
    "후공정관리": "POST_PROCESS",
    "펌웨어SW관리": "FIRMWARE",
    "OTP롬라이팅관리": "OTP_ROM",
    "검사관리": "INSPECTION",
    "추적성관리": "TRACEABILITY",
    "풀프루프관리": "FOOLPROOF",
    "품질관리": "QUALITY",
    "수리관리": "REPAIR",
    "재작업관리": "REWORK",
    "WMS물류관리": "WMS_LOGISTICS",
    "작업지시관리": "WORK_ORDER",
    "설비관리": "EQUIPMENT",
    "소모품관리": "CONSUMABLE",
    "피더관리": "FEEDER",
    "라벨관리": "LABEL",
    "분석및모니터링": "MONITORING",
    "에폭시관리": "EPOXY",
    "플럭스관리": "FLUX",
    "캐리어지그관리": "CARRIER_JIG",
    "이송용매거진관리": "MAGAZINE",
  };
  return codeMap[categoryName] || categoryName.toUpperCase().replace(/\s/g, "_");
}

/**
 * Y/N 값을 boolean으로 변환
 */
function parseYesNo(value: string | undefined | null): boolean {
  if (!value) return false;
  const normalized = String(value).toUpperCase().trim();
  return normalized === "Y" || normalized === "YES" || normalized === "TRUE";
}

/**
 * Excel 데이터 임포트
 * POST /api/process-verification/import
 */
export async function POST(request: NextRequest) {
  try {
    // FormData 파싱
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const projectId = formData.get("projectId") as string | null;
    const clearExisting = formData.get("clearExisting") === "true";

    // 필수 값 검증
    if (!file) {
      return NextResponse.json(
        { success: false, error: "엑셀 파일이 필요합니다." },
        { status: 400 }
      );
    }

    if (!projectId) {
      return NextResponse.json(
        { success: false, error: "프로젝트 ID는 필수입니다." },
        { status: 400 }
      );
    }

    // 파일 확장자 검증
    const fileName = file.name.toLowerCase();
    if (!fileName.endsWith(".xlsx") && !fileName.endsWith(".xls")) {
      return NextResponse.json(
        { success: false, error: "엑셀 파일(.xlsx, .xls)만 업로드할 수 있습니다." },
        { status: 400 }
      );
    }

    // 프로젝트 존재 확인
    const project = await prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      return NextResponse.json(
        { success: false, error: "프로젝트를 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    // 파일을 ArrayBuffer로 변환 후 XLSX 파싱
    const arrayBuffer = await file.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer, { type: "array" });

    // 첫 번째 시트 가져오기
    const firstSheetName = workbook.SheetNames[0];
    if (!firstSheetName) {
      return NextResponse.json(
        { success: false, error: "엑셀 파일에 시트가 없습니다." },
        { status: 400 }
      );
    }

    const sheet = workbook.Sheets[firstSheetName];
    const data = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as string[][];

    if (data.length < 2) {
      return NextResponse.json(
        { success: false, error: "데이터가 없거나 헤더만 있습니다." },
        { status: 400 }
      );
    }

    // 기존 데이터 삭제 (옵션)
    if (clearExisting) {
      await prisma.processVerificationCategory.deleteMany({
        where: { projectId },
      });
    }

    const stats = {
      total: 0,
      created: 0,
      skipped: 0,
      errors: [] as string[],
    };

    // 카테고리 캐시 (중복 생성 방지)
    const categoryCache = new Map<string, string>(); // categoryName -> categoryId
    let categoryOrder = 0;

    // 헤더 행 건너뛰고 데이터 행 처리 (rowIdx = 1부터)
    for (let rowIdx = 1; rowIdx < data.length; rowIdx++) {
      const row = data[rowIdx];
      if (!row || row.length < 7) continue;

      // 빈 행 스킵
      const hasData = row.some((cell) => cell != null && cell !== "");
      if (!hasData) continue;

      stats.total++;

      // 구분(카테고리) 컬럼
      const categoryName = String(row[0] || "").trim();
      if (!categoryName) {
        stats.skipped++;
        stats.errors.push(`${rowIdx + 1}행: 구분(카테고리)이 비어있습니다.`);
        continue;
      }

      // 관리코드가 없으면 스킵
      const managementCode = String(row[6] || "").trim();
      if (!managementCode) {
        stats.skipped++;
        stats.errors.push(`${rowIdx + 1}행: 관리코드가 비어있습니다.`);
        continue;
      }

      try {
        // 카테고리 조회 또는 생성
        let categoryId = categoryCache.get(categoryName);

        if (!categoryId) {
          const code = getCategoryCode(categoryName);
          let category = await prisma.processVerificationCategory.findUnique({
            where: { projectId_code: { projectId, code } },
          });

          if (!category) {
            category = await prisma.processVerificationCategory.create({
              data: {
                projectId,
                name: categoryName,
                code,
                order: categoryOrder++,
                description: `${categoryName} 관련 공정검증 항목`,
              },
            });
          }
          categoryId = category.id;
          categoryCache.set(categoryName, categoryId);
        }

        // 항목 생성
        await prisma.processVerificationItem.create({
          data: {
            categoryId,
            category: categoryName,
            isApplied: parseYesNo(String(row[1] || "")),
            managementArea: String(row[2] || "").trim(),
            detailItem: String(row[3] || "").trim(),
            mesMapping: row[4] ? String(row[4]).trim() : null,
            verificationDetail: row[5] ? String(row[5]).trim() : null,
            managementCode,
            acceptanceStatus: row[7] ? String(row[7]).trim() : null,
            existingMes: parseYesNo(String(row[8] || "")),
            customerRequest: row[9] ? String(row[9]).trim() : null,
            order: rowIdx,
            status: "PENDING",
          },
        });
        stats.created++;
      } catch (err) {
        stats.skipped++;
        stats.errors.push(`${rowIdx + 1}행: ${err instanceof Error ? err.message : String(err)}`);
      }
    }

    return NextResponse.json({
      success: true,
      message: `${stats.created}건의 공정검증 항목을 가져왔습니다.`,
      stats,
    });
  } catch (error) {
    console.error("Excel 임포트 실패:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Excel 데이터를 가져올 수 없습니다.",
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}
