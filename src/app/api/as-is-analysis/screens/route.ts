/**
 * @file src/app/api/as-is-analysis/screens/route.ts
 * @description
 * AS-IS 화면 목록 API 라우트입니다.
 * 시스템의 화면 목록 조회 및 생성을 처리합니다.
 *
 * 초보자 가이드:
 * - GET: 단위업무 분석에 속한 화면 목록 조회
 * - POST: 새 화면 항목 생성
 * - 조건: currentMethod가 SYSTEM일 때 사용
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";

/**
 * GET /api/as-is-analysis/screens
 * 화면 목록 조회
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

    // 화면 목록 조회
    const screens = await prisma.asIsScreen.findMany({
      where: { unitAnalysisId },
      orderBy: { order: "asc" },
    });

    return NextResponse.json(screens);
  } catch (error) {
    console.error("화면 조회 오류:", error);
    return NextResponse.json(
      { error: "화면 조회에 실패했습니다." },
      { status: 500 }
    );
  }
}

/**
 * POST /api/as-is-analysis/screens
 * 새 화면 항목 생성
 */
export async function POST(request: NextRequest) {
  try {
    // 인증 확인
    const { error } = await requireAuth();
    if (error) return error;

    const body = await request.json();
    const {
      unitAnalysisId,
      screenId,
      screenName,
      description,
      menuPath,
      screenType,
      relatedFunction,
      remarks,
    } = body;

    // 필수 필드 확인
    if (!unitAnalysisId || !screenName) {
      return NextResponse.json(
        { error: "unitAnalysisId, screenName은 필수입니다." },
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
    const maxOrder = await prisma.asIsScreen.aggregate({
      where: { unitAnalysisId },
      _max: { order: true },
    });
    const nextOrder = (maxOrder._max.order ?? -1) + 1;

    // 새 화면 생성
    const newItem = await prisma.asIsScreen.create({
      data: {
        unitAnalysisId,
        screenId: screenId || null,
        screenName,
        description: description || null,
        menuPath: menuPath || null,
        screenType: screenType || null,
        relatedFunction: relatedFunction || null,
        remarks: remarks || null,
        order: nextOrder,
      },
    });

    return NextResponse.json(newItem, { status: 201 });
  } catch (error) {
    console.error("화면 생성 오류:", error);
    return NextResponse.json(
      { error: "화면 생성에 실패했습니다." },
      { status: 500 }
    );
  }
}
