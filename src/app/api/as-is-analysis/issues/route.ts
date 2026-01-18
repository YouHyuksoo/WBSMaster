/**
 * @file src/app/api/as-is-analysis/issues/route.ts
 * @description
 * AS-IS 이슈/Pain Point API 라우트입니다.
 * 업무상 이슈, 병목현상, Gap 등의 목록 조회 및 생성을 처리합니다.
 *
 * 초보자 가이드:
 * - GET: 단위업무 분석에 속한 이슈 목록 조회
 * - POST: 새 이슈 항목 생성
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";

/**
 * GET /api/as-is-analysis/issues
 * 이슈 목록 조회
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

    // 이슈 목록 조회
    const issues = await prisma.asIsIssue.findMany({
      where: { unitAnalysisId },
      orderBy: { order: "asc" },
    });

    return NextResponse.json(issues);
  } catch (error) {
    console.error("이슈 조회 오류:", error);
    return NextResponse.json(
      { error: "이슈 조회에 실패했습니다." },
      { status: 500 }
    );
  }
}

/**
 * POST /api/as-is-analysis/issues
 * 새 이슈 항목 생성
 */
export async function POST(request: NextRequest) {
  try {
    // 인증 확인
    const { error } = await requireAuth();
    if (error) return error;

    const body = await request.json();
    const {
      unitAnalysisId,
      issueType,
      title,
      description,
      impact,
      frequency,
      priority,
      suggestedFix,
      remarks,
    } = body;

    // 필수 필드 확인
    if (!unitAnalysisId || !title) {
      return NextResponse.json(
        { error: "unitAnalysisId, title은 필수입니다." },
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
    const maxOrder = await prisma.asIsIssue.aggregate({
      where: { unitAnalysisId },
      _max: { order: true },
    });
    const nextOrder = (maxOrder._max.order ?? -1) + 1;

    // 새 이슈 생성
    const newItem = await prisma.asIsIssue.create({
      data: {
        unitAnalysisId,
        issueType: issueType || "PAIN_POINT",
        title,
        description: description || null,
        impact: impact || null,
        frequency: frequency || null,
        priority: priority || null,
        suggestedFix: suggestedFix || null,
        remarks: remarks || null,
        order: nextOrder,
      },
    });

    return NextResponse.json(newItem, { status: 201 });
  } catch (error) {
    console.error("이슈 생성 오류:", error);
    return NextResponse.json(
      { error: "이슈 생성에 실패했습니다." },
      { status: 500 }
    );
  }
}
