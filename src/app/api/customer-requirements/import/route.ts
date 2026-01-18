/**
 * @file src/app/api/customer-requirements/import/route.ts
 * @description
 * Excel 파일을 업로드하여 고객요구사항 데이터를 가져오는 API입니다.
 *
 * 초보자 가이드:
 * POST /api/customer-requirements/import (multipart/form-data)
 * - file: 엑셀 파일 (.xlsx, .xls)
 * - projectId: 프로젝트 ID (필수)
 * - clearExisting: 기존 데이터 삭제 여부 (선택, 기본값 "false")
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ApplyStatus } from "@prisma/client";
import * as XLSX from "xlsx";

/**
 * 적용여부 문자열을 ApplyStatus로 변환 (필독 가이드 기준)
 * 상태 흐름: 검토 → 승인/거절 → 개발 → 적용/보류
 */
function parseApplyStatus(value: string | undefined | null): ApplyStatus {
  if (!value) return ApplyStatus.REVIEWING;
  const normalized = String(value).toUpperCase().trim();

  // 검토
  if (normalized === "검토" || normalized === "검토중" || normalized === "REVIEWING") {
    return ApplyStatus.REVIEWING;
  }
  // 승인
  if (normalized === "승인" || normalized === "APPROVED") {
    return ApplyStatus.APPROVED;
  }
  // 거절
  if (normalized === "N" || normalized === "NO" || normalized === "미적용" || normalized === "거절" || normalized === "REJECTED") {
    return ApplyStatus.REJECTED;
  }
  // 개발
  if (normalized === "개발" || normalized === "개발중" || normalized === "IN_DEVELOPMENT") {
    return ApplyStatus.IN_DEVELOPMENT;
  }
  // 적용
  if (normalized === "Y" || normalized === "YES" || normalized === "적용" || normalized === "APPLIED") {
    return ApplyStatus.APPLIED;
  }
  // 보류
  if (normalized === "보류" || normalized === "HOLD") {
    return ApplyStatus.HOLD;
  }
  return ApplyStatus.REVIEWING;
}

/**
 * Excel 날짜 시리얼 번호를 Date로 변환
 */
function parseExcelDate(value: number | string | undefined | null): Date | null {
  if (!value) return null;

  // 이미 날짜 문자열인 경우
  if (typeof value === "string") {
    const date = new Date(value);
    if (!isNaN(date.getTime())) return date;
    return null;
  }

  // Excel 날짜 시리얼 번호인 경우
  if (typeof value === "number") {
    // Excel은 1900년 1월 1일을 1로 시작 (윤년 버그 포함)
    const excelEpoch = new Date(1899, 11, 30);
    const date = new Date(excelEpoch.getTime() + value * 24 * 60 * 60 * 1000);
    return date;
  }

  return null;
}

/**
 * Excel 데이터 임포트
 * POST /api/customer-requirements/import
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
        { error: "엑셀 파일이 필요합니다." },
        { status: 400 }
      );
    }

    if (!projectId) {
      return NextResponse.json(
        { error: "프로젝트 ID는 필수입니다." },
        { status: 400 }
      );
    }

    // 파일 확장자 검증
    const fileName = file.name.toLowerCase();
    if (!fileName.endsWith(".xlsx") && !fileName.endsWith(".xls")) {
      return NextResponse.json(
        { error: "엑셀 파일(.xlsx, .xls)만 업로드할 수 있습니다." },
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

    // 기존 데이터 삭제 (옵션)
    if (clearExisting) {
      await prisma.customerRequirement.deleteMany({
        where: { projectId },
      });
    }

    // 파일을 ArrayBuffer로 변환 후 XLSX 파싱
    const arrayBuffer = await file.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer, { type: "array" });

    // 첫 번째 시트 처리
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as (string | number | undefined)[][];

    if (data.length < 2) {
      return NextResponse.json(
        { error: "데이터가 없습니다. (헤더 제외 최소 1행 필요)" },
        { status: 400 }
      );
    }

    const stats = {
      total: 0,
      created: 0,
      skipped: 0,
      errors: [] as string[],
    };

    // 현재 최대 시퀀스 조회
    const lastRequirement = await prisma.customerRequirement.findFirst({
      where: { projectId },
      orderBy: { sequence: "desc" },
    });
    let nextSequence = lastRequirement ? lastRequirement.sequence + 1 : 1;

    // 헤더 행 건너뛰고 데이터 행 처리
    for (let rowIdx = 1; rowIdx < data.length; rowIdx++) {
      const row = data[rowIdx];

      // 행이 없거나 컬럼이 부족한 경우 (누락 추적)
      if (!row || row.length < 6) {
        // 빈 행이 아니면 에러로 기록
        if (row && row.some((cell) => cell != null && cell !== "")) {
          stats.skipped++;
          stats.errors.push(`행 ${rowIdx + 1}: 컬럼 수 부족 (${row.length}개, 최소 6개 필요)`);
        }
        continue;
      }

      // 빈 행 스킵 (에러로 기록하지 않음 - 의도적인 빈 행일 수 있음)
      const hasData = row.some((cell) => cell != null && cell !== "");
      if (!hasData) continue;

      stats.total++;

      try {
        // 컬럼 매핑 (엑셀 구조에 맞게)
        // 순번, 요구번호, 사업부, 업무구분, 기능명, 요구사항, 요청일자, 요청자, 적용방안, 적용여부, 비고
        const excelCode = String(row[1] || "").trim(); // 요구번호
        const businessUnit = String(row[2] || "").trim(); // 사업부
        const category = row[3] ? String(row[3]).trim() : null; // 업무구분
        const functionName = String(row[4] || "").trim(); // 기능명
        const content = String(row[5] || "").trim(); // 요구사항
        const requestDate = parseExcelDate(row[6]); // 요청일자
        const requester = row[7] ? String(row[7]).trim() : null; // 요청자
        const solution = row[8] ? String(row[8]).trim() : null; // 적용방안
        const applyStatus = parseApplyStatus(row[9] ? String(row[9]) : null); // 적용여부
        const remarks = row[10] ? String(row[10]).trim() : null; // 비고

        // 필수 값 검증
        if (!businessUnit || !functionName || !content) {
          stats.skipped++;
          stats.errors.push(`행 ${rowIdx + 1}: 필수 값 누락 (사업부, 기능명, 요구사항)`);
          continue;
        }

        // 관리번호 생성 (엑셀의 요구번호가 있으면 사용, 없으면 자동 생성)
        let code = excelCode;
        if (!code) {
          code = `RQIT_${String(nextSequence).padStart(5, "0")}`;
        }

        // 중복 확인
        const existing = await prisma.customerRequirement.findUnique({
          where: { projectId_code: { projectId, code } },
        });

        if (existing) {
          stats.skipped++;
          stats.errors.push(`행 ${rowIdx + 1}: 중복 관리번호 (${code})`);
          continue;
        }

        // 항목 생성
        await prisma.customerRequirement.create({
          data: {
            projectId,
            sequence: nextSequence,
            code,
            businessUnit,
            category,
            functionName,
            content,
            requestDate,
            requester,
            solution,
            applyStatus,
            remarks,
          },
        });

        nextSequence++;
        stats.created++;
      } catch (err) {
        stats.skipped++;
        stats.errors.push(`행 ${rowIdx + 1}: ${err instanceof Error ? err.message : String(err)}`);
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
