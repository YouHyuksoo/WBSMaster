/**
 * @file src/app/api/process-verification/import/route.ts
 * @description
 * Excel 파일을 업로드하여 공정검증 데이터를 가져오는 API 라우트입니다.
 * SMD 공정검증항목_관리기준서 형식의 엑셀 파일에서 여러 시트의 데이터를 파싱하여 DB에 저장합니다.
 *
 * 초보자 가이드:
 * POST /api/process-verification/import (multipart/form-data)
 * - file: 엑셀 파일 (.xlsx, .xls) - SMD_[DISP]_(Process Verification_ST_Doc) 형식
 * - projectId: 프로젝트 ID (필수)
 * - businessUnit: 사업부 (선택, 기본값 "V_IVI")
 * - clearExisting: 기존 데이터 삭제 여부 (선택, 기본값 "false")
 *
 * 다중 시트 방식:
 * - "재료관리"부터 "이송용매거진관리"까지 22개 시트를 자동으로 처리합니다
 * - 각 시트의 "구분" 컬럼 값으로 카테고리를 자동 생성합니다
 * - 개요, 용어집 등 메타데이터 시트는 자동으로 스킵합니다
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
    const businessUnit = (formData.get("businessUnit") as string | null) || "V_IVI";

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

    // 데이터 시트 목록 ("재료관리"부터 "이송용매거진관리"까지)
    const dataSheets = [
      "재료관리",
      "SMD공정관리",
      "후공정관리",
      "펌웨어SW관리",
      "OTP롬라이팅관리",
      "검사관리",
      "추적성관리",
      "풀프루프관리",
      "품질관리",
      "수리관리",
      "재작업관리",
      "WMS물류관리",
      "작업지시관리",
      "설비관리",
      "소모품관리",
      "피더관리",
      "라벨관리",
      "분석및모니터링",
      "에폭시관리",
      "플럭스관리",
      "캐리어지그관리",
      "이송용매거진관리",
    ];

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

    // 각 시트 처리
    for (const sheetName of dataSheets) {
      if (!workbook.Sheets[sheetName]) {
        console.log(`[임포트] 시트 "${sheetName}" 없음, 스킵`);
        continue;
      }

      const sheet = workbook.Sheets[sheetName];
      const data = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as string[][];

      console.log(`[임포트] 시트명: ${sheetName}, 전체 행 수: ${data.length}`);
      console.log(`[임포트] 헤더: ${JSON.stringify(data[0])}`);
      if (data.length > 1) {
        console.log(`[임포트] 첫 데이터 행: ${JSON.stringify(data[1])}`);
      }

      if (data.length < 2) {
        console.log(`[임포트] 시트 "${sheetName}": 데이터가 없음`);
        continue;
      }

      // 헤더 행 건너뛰고 데이터 행 처리 (rowIdx = 1부터)
      for (let rowIdx = 1; rowIdx < data.length; rowIdx++) {
        const row = data[rowIdx];

        if (!row || row.length < 7) {
          console.log(`[임포트] ${sheetName} - ${rowIdx + 1}행: 컬럼이 부족함 (${row?.length || 0}개)`);
          continue;
        }

        // 빈 행 스킵
        const hasData = row.some((cell) => cell != null && cell !== "");
        if (!hasData) {
          console.log(`[임포트] ${sheetName} - ${rowIdx + 1}행: 모두 빈 셀`);
          continue;
        }

        stats.total++;

        // 구분(카테고리) 컬럼
        const categoryName = String(row[0] || "").trim();
        if (!categoryName) {
          stats.skipped++;
          stats.errors.push(`${sheetName} - ${rowIdx + 1}행: 구분(카테고리)이 비어있습니다.`);
          console.log(`[임포트] ${sheetName} - ${rowIdx + 1}행: 카테고리 없음`);
          continue;
        }

        // 관리코드가 없으면 스킵
        const managementCode = String(row[6] || "").trim();
        if (!managementCode) {
          stats.skipped++;
          stats.errors.push(`${sheetName} - ${rowIdx + 1}행: 관리코드가 비어있습니다.`);
          console.log(`[임포트] ${sheetName} - ${rowIdx + 1}행: 관리코드 없음`);
          continue;
        }

        console.log(`[임포트] ${sheetName} - ${rowIdx + 1}행: 카테고리=${categoryName}, 관리코드=${managementCode}`);

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
              businessUnit, // 선택된 사업부로 저장
            },
          });
          stats.created++;
        } catch (err) {
          stats.skipped++;
          stats.errors.push(`${sheetName} - ${rowIdx + 1}행: ${err instanceof Error ? err.message : String(err)}`);
        }
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
