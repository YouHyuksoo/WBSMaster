/**
 * @file src/app/api/excel/parse/route.ts
 * @description
 * 엑셀 파일을 파싱하여 헤더와 샘플 데이터를 반환하는 API입니다.
 * xlsx 라이브러리를 사용하여 .xlsx, .xls, .csv 파일을 지원합니다.
 *
 * 초보자 가이드:
 * 1. **POST /api/excel/parse**: FormData로 파일을 받아 파싱
 * 2. **반환 데이터**: headers(컬럼명), sampleData(샘플 5행), totalRows(전체 행수), rawData(전체 데이터)
 *
 * @example
 * const formData = new FormData();
 * formData.append("file", excelFile);
 * const res = await fetch("/api/excel/parse", { method: "POST", body: formData });
 */

import { NextRequest, NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { requireAuth } from "@/lib/auth";

/**
 * 엑셀 파싱 결과 타입
 */
export interface ExcelParseResult {
  /** 컬럼 헤더 배열 */
  headers: string[];
  /** 샘플 데이터 (처음 5행) */
  sampleData: Record<string, unknown>[];
  /** 전체 행 수 */
  totalRows: number;
  /** 시트 이름 */
  sheetName: string;
  /** 전체 데이터 (임포트용) */
  rawData: Record<string, unknown>[];
}

/**
 * POST /api/excel/parse
 * 엑셀 파일을 파싱하여 데이터를 반환합니다.
 */
export async function POST(request: NextRequest) {
  // 인증 확인
  const { user, error } = await requireAuth();
  if (error) return error;

  try {
    // FormData에서 파일 추출
    const formData = await request.formData();
    const file = formData.get("file") as File;

    // 파일 검증
    if (!file) {
      return NextResponse.json(
        { error: "파일이 없습니다." },
        { status: 400 }
      );
    }

    // 파일 크기 제한 (5MB)
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json(
        { error: "파일 크기는 5MB 이하여야 합니다." },
        { status: 400 }
      );
    }

    // 파일 확장자 검증
    const ext = file.name.split(".").pop()?.toLowerCase();
    if (!["xlsx", "xls", "csv"].includes(ext || "")) {
      return NextResponse.json(
        { error: "지원하지 않는 파일 형식입니다. (.xlsx, .xls, .csv만 지원)" },
        { status: 400 }
      );
    }

    // ArrayBuffer로 변환
    const buffer = await file.arrayBuffer();

    // xlsx 파싱
    const workbook = XLSX.read(buffer, { type: "array" });

    // 첫 번째 시트 사용
    const sheetName = workbook.SheetNames[0];
    if (!sheetName) {
      return NextResponse.json(
        { error: "시트가 없습니다." },
        { status: 400 }
      );
    }

    const sheet = workbook.Sheets[sheetName];

    // JSON으로 변환 (header: 1은 첫 행을 헤더로 사용)
    const jsonData = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
      defval: "", // 빈 셀은 빈 문자열로
    });

    // 데이터가 없는 경우
    if (jsonData.length === 0) {
      return NextResponse.json(
        { error: "데이터가 없습니다." },
        { status: 400 }
      );
    }

    // 헤더 추출 (첫 행의 키)
    const headers = Object.keys(jsonData[0]);

    // 샘플 데이터 (최대 5행)
    const sampleData = jsonData.slice(0, 5);

    // 응답 반환
    const result: ExcelParseResult = {
      headers,
      sampleData,
      totalRows: jsonData.length,
      sheetName,
      rawData: jsonData,
    };

    return NextResponse.json(result);

  } catch (error) {
    console.error("[Excel Parse] 파싱 오류:", error);
    return NextResponse.json(
      { error: "파일 파싱 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
