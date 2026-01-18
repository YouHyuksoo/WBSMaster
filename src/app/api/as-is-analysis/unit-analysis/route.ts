/**
 * @file src/app/api/as-is-analysis/unit-analysis/route.ts
 * @description
 * AS-IS 단위업무 분석(UnitAnalysis) API 라우트입니다.
 * 단위업무 상세 분석의 조회 및 생성을 처리합니다.
 *
 * 초보자 가이드:
 * - GET: 단위업무 분석 조회
 * - POST: 새 단위업무 분석 생성
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";

/**
 * GET /api/as-is-analysis/unit-analysis
 * 단위업무 분석 조회
 */
export async function GET(request: NextRequest) {
  try {
    // 인증 확인
    const { error } = await requireAuth();
    if (error) return error;

    // 쿼리 파라미터
    const { searchParams } = new URL(request.url);
    const overviewItemId = searchParams.get("overviewItemId");

    if (!overviewItemId) {
      return NextResponse.json(
        { error: "overviewItemId가 필요합니다." },
        { status: 400 }
      );
    }

    // 단위업무 분석 조회 (모든 하위 데이터 포함)
    const unitAnalysis = await prisma.asIsUnitAnalysis.findUnique({
      where: { overviewItemId },
      include: {
        overviewItem: {
          select: {
            id: true,
            majorCategory: true,
            middleCategory: true,
            taskName: true,
            currentMethod: true,
          },
        },
        processDefinitions: { orderBy: { order: "asc" } },
        flowChartDetails: { orderBy: { order: "asc" } },
        responsibilities: { orderBy: { order: "asc" } },
        interviews: { orderBy: { order: "asc" } },
        issues: { orderBy: { order: "asc" } },
        documents: { orderBy: { order: "asc" } },
        documentAnalyses: { orderBy: { order: "asc" } },
        functions: { orderBy: { order: "asc" } },
        screens: { orderBy: { order: "asc" } },
        interfaces: { orderBy: { order: "asc" } },
        dataModels: { orderBy: { order: "asc" } },
        codeDefinitions: { orderBy: { order: "asc" } },
      },
    });

    return NextResponse.json(unitAnalysis);
  } catch (error) {
    console.error("단위업무 분석 조회 오류:", error);
    return NextResponse.json(
      { error: "단위업무 분석 조회에 실패했습니다." },
      { status: 500 }
    );
  }
}

/**
 * POST /api/as-is-analysis/unit-analysis
 * 새 단위업무 분석 생성
 */
export async function POST(request: NextRequest) {
  try {
    // 인증 확인
    const { error } = await requireAuth();
    if (error) return error;

    const body = await request.json();
    const { overviewItemId } = body;

    if (!overviewItemId) {
      return NextResponse.json(
        { error: "overviewItemId가 필요합니다." },
        { status: 400 }
      );
    }

    // 항목 존재 여부 확인
    const item = await prisma.asIsOverviewItem.findUnique({
      where: { id: overviewItemId },
    });

    if (!item) {
      return NextResponse.json(
        { error: "AS-IS 항목을 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    // 이미 존재하는지 확인
    const existing = await prisma.asIsUnitAnalysis.findUnique({
      where: { overviewItemId },
    });

    if (existing) {
      return NextResponse.json(
        { error: "이미 단위업무 분석이 존재합니다." },
        { status: 400 }
      );
    }

    // 새 단위업무 분석 생성
    const unitAnalysis = await prisma.asIsUnitAnalysis.create({
      data: {
        overviewItemId,
        // flowChartData, swimlaneData는 생략 (기본값 null)
      },
      include: {
        overviewItem: {
          select: {
            id: true,
            majorCategory: true,
            middleCategory: true,
            taskName: true,
            currentMethod: true,
          },
        },
      },
    });

    return NextResponse.json(unitAnalysis, { status: 201 });
  } catch (error) {
    console.error("단위업무 분석 생성 오류:", error);
    return NextResponse.json(
      { error: "단위업무 분석 생성에 실패했습니다." },
      { status: 500 }
    );
  }
}
