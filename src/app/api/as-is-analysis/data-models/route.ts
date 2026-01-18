/**
 * @file src/app/api/as-is-analysis/data-models/route.ts
 * @description
 * AS-IS 데이터 모델 API 라우트입니다.
 * 시스템의 테이블/컬럼 정보 목록 조회 및 생성을 처리합니다.
 *
 * 초보자 가이드:
 * - GET: 단위업무 분석에 속한 데이터 모델 목록 조회
 * - POST: 새 데이터 모델 항목 생성
 * - 조건: currentMethod가 SYSTEM일 때 사용
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";

/**
 * GET /api/as-is-analysis/data-models
 * 데이터 모델 목록 조회
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

    // 데이터 모델 목록 조회
    const dataModels = await prisma.asIsDataModel.findMany({
      where: { unitAnalysisId },
      orderBy: { order: "asc" },
    });

    return NextResponse.json(dataModels);
  } catch (error) {
    console.error("데이터 모델 조회 오류:", error);
    return NextResponse.json(
      { error: "데이터 모델 조회에 실패했습니다." },
      { status: 500 }
    );
  }
}

/**
 * POST /api/as-is-analysis/data-models
 * 새 데이터 모델 항목 생성
 */
export async function POST(request: NextRequest) {
  try {
    // 인증 확인
    const { error } = await requireAuth();
    if (error) return error;

    const body = await request.json();
    const {
      unitAnalysisId,
      tableName,
      tableNameKr,
      description,
      columnName,
      columnNameKr,
      dataType,
      length,
      isPrimaryKey,
      isForeignKey,
      isNullable,
      defaultValue,
      remarks,
    } = body;

    // 필수 필드 확인
    if (!unitAnalysisId || !tableName) {
      return NextResponse.json(
        { error: "unitAnalysisId, tableName은 필수입니다." },
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
    const maxOrder = await prisma.asIsDataModel.aggregate({
      where: { unitAnalysisId },
      _max: { order: true },
    });
    const nextOrder = (maxOrder._max.order ?? -1) + 1;

    // 새 데이터 모델 생성
    const newItem = await prisma.asIsDataModel.create({
      data: {
        unitAnalysisId,
        tableName,
        tableNameKr: tableNameKr || null,
        description: description || null,
        columnName: columnName || null,
        columnNameKr: columnNameKr || null,
        dataType: dataType || null,
        length: length || null,
        isPrimaryKey: isPrimaryKey ?? false,
        isForeignKey: isForeignKey ?? false,
        isNullable: isNullable ?? true,
        defaultValue: defaultValue || null,
        remarks: remarks || null,
        order: nextOrder,
      },
    });

    return NextResponse.json(newItem, { status: 201 });
  } catch (error) {
    console.error("데이터 모델 생성 오류:", error);
    return NextResponse.json(
      { error: "데이터 모델 생성에 실패했습니다." },
      { status: 500 }
    );
  }
}
