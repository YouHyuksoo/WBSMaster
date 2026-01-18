/**
 * @file src/app/api/as-is-analysis/items/route.ts
 * @description
 * AS-IS 총괄 항목(OverviewItem) API 라우트입니다.
 * 업무 분류 체계 항목의 조회 및 생성을 처리합니다.
 *
 * 초보자 가이드:
 * - GET: 총괄에 속한 모든 항목 조회
 * - POST: 새 업무 항목 생성
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";

/**
 * GET /api/as-is-analysis/items
 * 총괄에 속한 모든 항목 조회
 */
export async function GET(request: NextRequest) {
  try {
    // 인증 확인
    const { error } = await requireAuth();
    if (error) return error;

    // 쿼리 파라미터
    const { searchParams } = new URL(request.url);
    const overviewId = searchParams.get("overviewId");
    const majorCategory = searchParams.get("majorCategory");

    if (!overviewId) {
      return NextResponse.json(
        { error: "overviewId가 필요합니다." },
        { status: 400 }
      );
    }

    // 항목 조회
    const items = await prisma.asIsOverviewItem.findMany({
      where: {
        overviewId,
        ...(majorCategory && { majorCategory: majorCategory as never }),
      },
      orderBy: [
        { majorCategory: "asc" },
        { order: "asc" },
      ],
      include: {
        unitAnalysis: {
          select: {
            id: true,
          },
        },
      },
    });

    return NextResponse.json(items);
  } catch (error) {
    console.error("AS-IS 항목 조회 오류:", error);
    return NextResponse.json(
      { error: "AS-IS 항목 조회에 실패했습니다." },
      { status: 500 }
    );
  }
}

/**
 * POST /api/as-is-analysis/items
 * 새 업무 항목 생성
 */
export async function POST(request: NextRequest) {
  try {
    // 인증 확인
    const { error } = await requireAuth();
    if (error) return error;

    const body = await request.json();
    const {
      overviewId,
      majorCategory,
      middleCategory,
      taskName,
      currentMethod,
      issueSummary,
      details,
      remarks,
    } = body;

    // 필수 필드 확인
    if (!overviewId || !majorCategory || !middleCategory || !taskName) {
      return NextResponse.json(
        { error: "overviewId, majorCategory, middleCategory, taskName은 필수입니다." },
        { status: 400 }
      );
    }

    // 총괄 존재 여부 확인
    const overview = await prisma.asIsOverview.findUnique({
      where: { id: overviewId },
    });

    if (!overview) {
      return NextResponse.json(
        { error: "AS-IS 총괄을 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    // 다음 order 값 계산
    const maxOrder = await prisma.asIsOverviewItem.aggregate({
      where: { overviewId, majorCategory: majorCategory as never },
      _max: { order: true },
    });
    const nextOrder = (maxOrder._max.order ?? -1) + 1;

    // 새 항목 생성
    const item = await prisma.asIsOverviewItem.create({
      data: {
        overviewId,
        majorCategory: majorCategory as never,
        middleCategory,
        taskName,
        currentMethod: (currentMethod as never) || "MANUAL",
        issueSummary: issueSummary || null,
        details: details || null,
        remarks: remarks || null,
        order: nextOrder,
      },
      include: {
        unitAnalysis: {
          select: {
            id: true,
          },
        },
      },
    });

    return NextResponse.json(item, { status: 201 });
  } catch (error) {
    console.error("AS-IS 항목 생성 오류:", error);
    return NextResponse.json(
      { error: "AS-IS 항목 생성에 실패했습니다." },
      { status: 500 }
    );
  }
}
