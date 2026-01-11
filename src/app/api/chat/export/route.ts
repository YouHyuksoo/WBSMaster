/**
 * @file src/app/api/chat/export/route.ts
 * @description
 * 채팅 SQL 쿼리 결과를 Excel로 내보내는 API입니다.
 * LLM 분석 없이 SQL을 직접 실행하여 전체 데이터를 Excel로 변환합니다.
 *
 * 초보자 가이드:
 * 1. **POST /api/chat/export**: SQL 쿼리 실행 후 Excel 파일 반환
 *    - LIMIT 제한 없이 전체 데이터 조회
 *    - LLM 토큰 비용 없음
 * 2. **보안**: SELECT 쿼리만 허용 (INSERT, UPDATE, DELETE 차단)
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import * as XLSX from "xlsx";

/**
 * SQL 쿼리에서 LIMIT 절 제거
 */
function removeLimitClause(sql: string): string {
  return sql
    .replace(/\s+LIMIT\s+\d+/gi, "")
    .replace(/\s+OFFSET\s+\d+/gi, "")
    .trim();
}

/**
 * SQL 쿼리 보안 검증 (SELECT만 허용)
 */
function validateSelectQuery(sql: string): boolean {
  const upperSQL = sql.toUpperCase().trim();
  // SELECT 또는 WITH (CTE) 로 시작해야 함
  if (!upperSQL.startsWith("SELECT") && !upperSQL.startsWith("WITH")) {
    return false;
  }
  // 위험한 키워드 차단
  const dangerousKeywords = [
    "INSERT",
    "UPDATE",
    "DELETE",
    "DROP",
    "TRUNCATE",
    "ALTER",
    "CREATE",
    "GRANT",
    "REVOKE",
    "EXEC",
    "EXECUTE",
  ];
  for (const keyword of dangerousKeywords) {
    // 단어 경계 체크 (예: "UPDATE_DATE" 같은 컬럼명은 허용)
    const regex = new RegExp(`\\b${keyword}\\b`, "i");
    if (regex.test(upperSQL)) {
      return false;
    }
  }
  return true;
}

/**
 * Excel 파일 생성 및 다운로드
 * POST /api/chat/export
 * (인증 필요)
 *
 * Request Body:
 * - sqlQuery: 실행할 SQL 쿼리
 * - fileName?: 다운로드 파일명 (선택, 기본값: "data_export")
 */
export async function POST(request: NextRequest) {
  try {
    const { error } = await requireAuth();
    if (error) return error;

    const body = await request.json();
    const { sqlQuery, fileName = "data_export" } = body;

    if (!sqlQuery || typeof sqlQuery !== "string") {
      return NextResponse.json(
        { error: "SQL 쿼리가 필요합니다." },
        { status: 400 }
      );
    }

    // LIMIT 제거
    const fullQuery = removeLimitClause(sqlQuery);

    // 보안 검증
    if (!validateSelectQuery(fullQuery)) {
      return NextResponse.json(
        { error: "SELECT 쿼리만 허용됩니다." },
        { status: 400 }
      );
    }

    console.log("[Chat Export] Executing query:", fullQuery.substring(0, 200) + "...");

    // SQL 실행
    const results = (await prisma.$queryRawUnsafe(fullQuery)) as Record<
      string,
      unknown
    >[];

    if (!results || results.length === 0) {
      return NextResponse.json(
        { error: "조회된 데이터가 없습니다." },
        { status: 404 }
      );
    }

    console.log(`[Chat Export] Retrieved ${results.length} rows`);

    // 데이터 전처리 (BigInt, Date 등 처리)
    const processedData = results.map((row) => {
      const processed: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(row)) {
        if (typeof value === "bigint") {
          processed[key] = Number(value);
        } else if (value instanceof Date) {
          processed[key] = value.toISOString().split("T")[0]; // YYYY-MM-DD 형식
        } else if (value === null) {
          processed[key] = "";
        } else {
          processed[key] = value;
        }
      }
      return processed;
    });

    // Excel 워크북 생성
    const worksheet = XLSX.utils.json_to_sheet(processedData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Data");

    // 컬럼 너비 자동 조정
    const columns = Object.keys(processedData[0]);
    worksheet["!cols"] = columns.map((col) => {
      // 헤더와 데이터 중 가장 긴 값 기준으로 너비 설정
      const maxLength = Math.max(
        col.length,
        ...processedData.map((row) => {
          const value = row[col];
          return value ? String(value).length : 0;
        })
      );
      return { wch: Math.min(maxLength + 2, 50) }; // 최대 50자
    });

    // Excel 버퍼 생성
    const excelBuffer = XLSX.write(workbook, {
      type: "buffer",
      bookType: "xlsx",
    });

    // 파일명에 날짜 추가
    const timestamp = new Date().toISOString().split("T")[0];
    const safeFileName = fileName.replace(/[^a-zA-Z0-9가-힣_-]/g, "_");

    // 응답 반환
    return new NextResponse(excelBuffer, {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${safeFileName}_${timestamp}.xlsx"`,
      },
    });
  } catch (error) {
    console.error("[Chat Export] Error:", error);

    let errorMessage = "Excel 내보내기에 실패했습니다.";
    if (error instanceof Error) {
      if (error.message.includes("syntax")) {
        errorMessage = "SQL 문법 오류가 발생했습니다.";
      } else if (error.message.includes("permission")) {
        errorMessage = "데이터 접근 권한이 없습니다.";
      }
    }

    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
