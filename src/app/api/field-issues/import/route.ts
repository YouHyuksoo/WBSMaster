/**
 * @file src/app/api/field-issues/import/route.ts
 * @description
 * Excel 파일을 업로드하여 현업이슈 데이터를 가져오는 API입니다.
 *
 * 초보자 가이드:
 * POST /api/field-issues/import (multipart/form-data)
 * - file: 엑셀 파일 (.xlsx, .xls)
 * - projectId: 프로젝트 ID (필수)
 * - clearExisting: 기존 데이터 삭제 여부 (선택, 기본값 "false")
 *
 * 엑셀 컬럼 순서 (리스트 시트):
 * 이슈번호, 사업부, 업무구분, 이슈관리명, 이슈 설명, 등록일, 이슈어,
 * 요구사항 번호, 담당자, 상태, 타겟일, 완료일, 제안된 해결 방안, 최종 적용된 방안, 참고
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { FieldIssueStatus } from "@prisma/client";
import * as XLSX from "xlsx";

/**
 * 상태 문자열을 FieldIssueStatus로 변환 (필독 가이드 기준)
 * 상태 흐름: OPEN → IN_PROGRESS → RESOLVED/WONT_FIX → CLOSED
 */
function parseStatus(value: string | undefined | null): FieldIssueStatus {
  if (!value) return FieldIssueStatus.OPEN;
  const normalized = String(value).toUpperCase().trim();

  // 발견 (OPEN)
  if (normalized === "발견" || normalized === "OPEN" || normalized === "오픈") {
    return FieldIssueStatus.OPEN;
  }
  // 수정 중 (IN_PROGRESS)
  if (normalized === "수정중" || normalized === "수정 중" || normalized === "IN_PROGRESS" || normalized === "PENDING" || normalized === "대기") {
    return FieldIssueStatus.IN_PROGRESS;
  }
  // 해결 (RESOLVED)
  if (normalized === "해결" || normalized === "RESOLVED") {
    return FieldIssueStatus.RESOLVED;
  }
  // 수정 안함 (WONT_FIX)
  if (normalized === "수정안함" || normalized === "수정 안함" || normalized === "WONT_FIX" || normalized === "WONTFIX") {
    return FieldIssueStatus.WONT_FIX;
  }
  // 완료 (CLOSED)
  if (normalized === "완료" || normalized === "CLOSED" || normalized === "COMPLETED" || normalized === "DONE") {
    return FieldIssueStatus.CLOSED;
  }
  // 기본값: 발견
  return FieldIssueStatus.OPEN;
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
 * POST /api/field-issues/import
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
      await prisma.fieldIssue.deleteMany({
        where: { projectId },
      });
    }

    // 파일을 ArrayBuffer로 변환 후 XLSX 파싱
    const arrayBuffer = await file.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer, { type: "array" });

    // "리스트" 시트 또는 첫 번째 시트 처리
    const sheetName = workbook.SheetNames.includes("리스트")
      ? "리스트"
      : workbook.SheetNames[0];
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
    const lastIssue = await prisma.fieldIssue.findFirst({
      where: { projectId },
      orderBy: { sequence: "desc" },
    });
    let nextSequence = lastIssue ? lastIssue.sequence + 1 : 1;

    // 헤더 행 건너뛰고 데이터 행 처리
    for (let rowIdx = 1; rowIdx < data.length; rowIdx++) {
      const row = data[rowIdx];

      // 행이 없거나 컬럼이 부족한 경우
      if (!row || row.length < 4) {
        // 빈 행이 아니면 에러로 기록
        if (row && row.some((cell) => cell != null && cell !== "")) {
          stats.skipped++;
          stats.errors.push(`행 ${rowIdx + 1}: 컬럼 수 부족 (${row.length}개, 최소 4개 필요)`);
        }
        continue;
      }

      // 빈 행 스킵
      const hasData = row.some((cell) => cell != null && cell !== "");
      if (!hasData) continue;

      stats.total++;

      try {
        // 컬럼 매핑 (엑셀 구조에 맞게 - 0부터 시작)
        // 이슈번호, 사업부, 업무구분, 이슈관리명, 이슈 설명, 등록일, 이슈어,
        // 요구사항 번호, 담당자, 상태, 타겟일, 완료일, 제안된 해결 방안, 최종 적용된 방안, 참고
        const excelCode = String(row[0] || "").trim(); // 이슈번호
        const businessUnit = String(row[1] || "").trim(); // 사업부
        const category = row[2] ? String(row[2]).trim() : null; // 업무구분
        const title = String(row[3] || "").trim(); // 이슈관리명
        const description = row[4] ? String(row[4]).trim() : null; // 이슈 설명
        const registeredDate = parseExcelDate(row[5]); // 등록일
        const issuer = row[6] ? String(row[6]).trim() : null; // 이슈어
        const requirementCode = row[7] ? String(row[7]).trim() : null; // 요구사항 번호
        const assignee = row[8] ? String(row[8]).trim() : null; // 담당자
        const status = parseStatus(row[9] ? String(row[9]) : null); // 상태
        const targetDate = parseExcelDate(row[10]); // 타겟일
        const completedDate = parseExcelDate(row[11]); // 완료일
        const proposedSolution = row[12] ? String(row[12]).trim() : null; // 제안된 해결 방안
        const finalSolution = row[13] ? String(row[13]).trim() : null; // 최종 적용된 방안
        const remarks = row[14] ? String(row[14]).trim() : null; // 참고

        // 필수 값 검증
        if (!businessUnit || !title) {
          stats.skipped++;
          stats.errors.push(`행 ${rowIdx + 1}: 필수 값 누락 (사업부, 이슈관리명)`);
          continue;
        }

        // 이슈번호 생성 (엑셀의 이슈번호가 있으면 사용, 없으면 자동 생성)
        let code = excelCode;
        if (!code) {
          code = `IS${String(nextSequence).padStart(4, "0")}`;
        }

        // 중복 확인
        const existing = await prisma.fieldIssue.findUnique({
          where: { projectId_code: { projectId, code } },
        });

        if (existing) {
          stats.skipped++;
          stats.errors.push(`행 ${rowIdx + 1}: 중복 이슈번호 (${code})`);
          continue;
        }

        // 항목 생성
        await prisma.fieldIssue.create({
          data: {
            projectId,
            sequence: nextSequence,
            code,
            businessUnit,
            category,
            title,
            description,
            registeredDate,
            issuer,
            requirementCode,
            assignee,
            status,
            targetDate,
            completedDate,
            proposedSolution,
            finalSolution,
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
