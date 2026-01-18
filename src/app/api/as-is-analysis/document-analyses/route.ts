/**
 * @file src/app/api/as-is-analysis/document-analyses/route.ts
 * @description
 * AS-IS 문서 구조 분석 API 라우트입니다.
 * 수기/엑셀 문서의 필드/항목 분석 정보의 목록 조회 및 생성을 처리합니다.
 *
 * 초보자 가이드:
 * - GET: 단위업무 분석에 속한 문서 구조 분석 목록 조회
 * - POST: 새 문서 구조 분석 항목 생성
 * - 조건: currentMethod가 MANUAL 또는 EXCEL일 때 사용
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";

/**
 * GET /api/as-is-analysis/document-analyses
 * 문서 구조 분석 목록 조회
 */
export async function GET(request: NextRequest) {
  try {
    // 인증 확인
    const { error } = await requireAuth();
    if (error) return error;

    // 쿼리 파라미터
    const { searchParams } = new URL(request.url);
    const unitAnalysisId = searchParams.get("unitAnalysisId");

    if (!unitAnalysisId) {
      return NextResponse.json(
        { error: "unitAnalysisId가 필요합니다." },
        { status: 400 }
      );
    }

    // 문서 구조 분석 목록 조회
    const analyses = await prisma.asIsDocumentAnalysis.findMany({
      where: { unitAnalysisId },
      orderBy: { order: "asc" },
    });

    return NextResponse.json(analyses);
  } catch (error) {
    console.error("문서 구조 분석 조회 오류:", error);
    return NextResponse.json(
      { error: "문서 구조 분석 조회에 실패했습니다." },
      { status: 500 }
    );
  }
}

/**
 * POST /api/as-is-analysis/document-analyses
 * 새 문서 구조 분석 항목 생성
 */
export async function POST(request: NextRequest) {
  try {
    // 인증 확인
    const { error } = await requireAuth();
    if (error) return error;

    const body = await request.json();
    const {
      unitAnalysisId,
      documentName,
      fieldName,
      dataType,
      sampleData,
      isMandatory,
      validationRule,
      remarks,
    } = body;

    // 필수 필드 확인
    if (!unitAnalysisId || !documentName || !fieldName) {
      return NextResponse.json(
        { error: "unitAnalysisId, documentName, fieldName은 필수입니다." },
        { status: 400 }
      );
    }

    // 단위업무 분석 존재 여부 확인
    const unitAnalysis = await prisma.asIsUnitAnalysis.findUnique({
      where: { id: unitAnalysisId },
    });

    if (!unitAnalysis) {
      return NextResponse.json(
        { error: "단위업무 분석을 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    // 다음 order 값 계산
    const maxOrder = await prisma.asIsDocumentAnalysis.aggregate({
      where: { unitAnalysisId },
      _max: { order: true },
    });
    const nextOrder = (maxOrder._max.order ?? -1) + 1;

    // 새 문서 구조 분석 생성
    const newItem = await prisma.asIsDocumentAnalysis.create({
      data: {
        unitAnalysisId,
        documentName,
        fieldName,
        dataType: dataType || null,
        sampleData: sampleData || null,
        isMandatory: isMandatory ?? false,
        validationRule: validationRule || null,
        remarks: remarks || null,
        order: nextOrder,
      },
    });

    return NextResponse.json(newItem, { status: 201 });
  } catch (error) {
    console.error("문서 구조 분석 생성 오류:", error);
    return NextResponse.json(
      { error: "문서 구조 분석 생성에 실패했습니다." },
      { status: 500 }
    );
  }
}
