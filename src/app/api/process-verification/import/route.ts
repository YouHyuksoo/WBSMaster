/**
 * @file src/app/api/process-verification/import/route.ts
 * @description
 * Excel 파일에서 공정검증 데이터를 가져오는 API 라우트입니다.
 * 서버 사이드에서 xlsx 패키지를 사용하여 Excel 데이터를 파싱합니다.
 *
 * 초보자 가이드:
 * POST /api/process-verification/import
 * - projectId: 프로젝트 ID (필수)
 * - clearExisting: 기존 데이터 삭제 여부 (선택, 기본값 false)
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import * as XLSX from "xlsx";
import * as fs from "fs";
import * as path from "path";

/**
 * 시트 이름을 영문 코드로 변환
 */
function getSheetCode(sheetName: string): string {
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
  return codeMap[sheetName] || sheetName.toUpperCase().replace(/\s/g, "_");
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
    const body = await request.json();
    const { projectId, clearExisting = false } = body;

    if (!projectId) {
      return NextResponse.json(
        { error: "프로젝트 ID는 필수입니다." },
        { status: 400 }
      );
    }

    // 프로젝트 존재 확인
    const project = await prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      return NextResponse.json(
        { error: "프로젝트를 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    // Excel 파일 경로 (scripts 폴더의 excel_data.xlsx)
    const excelPath = path.join(process.cwd(), "scripts", "excel_data.xlsx");

    if (!fs.existsSync(excelPath)) {
      return NextResponse.json(
        { error: "Excel 파일을 찾을 수 없습니다. scripts/excel_data.xlsx 파일이 필요합니다." },
        { status: 404 }
      );
    }

    // Excel 파일 읽기
    const workbook = XLSX.readFile(excelPath);

    // 대상 시트 목록 (재료관리 ~ 이송용매거진관리)
    const targetSheets = [
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
      categoriesCreated: 0,
      itemsCreated: 0,
      skippedSheets: [] as string[],
      errors: [] as string[],
    };

    // 각 시트 처리
    for (let idx = 0; idx < targetSheets.length; idx++) {
      const sheetName = targetSheets[idx];

      if (!workbook.SheetNames.includes(sheetName)) {
        stats.skippedSheets.push(sheetName);
        continue;
      }

      const sheet = workbook.Sheets[sheetName];
      const data = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as string[][];

      if (data.length < 2) {
        stats.skippedSheets.push(sheetName);
        continue;
      }

      try {
        // 카테고리 생성 또는 조회
        const code = getSheetCode(sheetName);
        let category = await prisma.processVerificationCategory.findUnique({
          where: { projectId_code: { projectId, code } },
        });

        if (!category) {
          category = await prisma.processVerificationCategory.create({
            data: {
              projectId,
              name: sheetName,
              code,
              order: idx,
              description: `${sheetName} 관련 공정검증 항목`,
            },
          });
          stats.categoriesCreated++;
        }

        // 헤더 행 건너뛰고 데이터 행 처리
        for (let rowIdx = 1; rowIdx < data.length; rowIdx++) {
          const row = data[rowIdx];
          if (!row || row.length < 7) continue;

          // 빈 행 스킵
          const hasData = row.some((cell) => cell != null && cell !== "");
          if (!hasData) continue;

          // 관리코드가 없으면 스킵
          const managementCode = String(row[6] || "").trim();
          if (!managementCode) continue;

          // 항목 생성
          await prisma.processVerificationItem.create({
            data: {
              categoryId: category.id,
              category: String(row[0] || "").trim(),
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
          stats.itemsCreated++;
        }
      } catch (err) {
        stats.errors.push(`${sheetName}: ${err instanceof Error ? err.message : String(err)}`);
      }
    }

    return NextResponse.json({
      success: true,
      message: "Excel 데이터를 성공적으로 가져왔습니다.",
      stats,
    });
  } catch (error) {
    console.error("Excel 임포트 실패:", error);
    return NextResponse.json(
      { error: "Excel 데이터를 가져올 수 없습니다.", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
