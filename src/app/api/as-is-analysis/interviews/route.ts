/**
 * @file src/app/api/as-is-analysis/interviews/route.ts
 * @description
 * AS-IS 현업 인터뷰 결과 API 라우트입니다.
 * 인터뷰 대상자, 내용, 주요 발견사항 등의 목록 조회 및 생성을 처리합니다.
 *
 * 초보자 가이드:
 * - GET: 단위업무 분석에 속한 인터뷰 목록 조회
 * - POST: 새 인터뷰 항목 생성
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";

/**
 * GET /api/as-is-analysis/interviews
 * 인터뷰 목록 조회
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

    // 인터뷰 목록 조회
    const interviews = await prisma.asIsInterview.findMany({
      where: { unitAnalysisId },
      orderBy: { order: "asc" },
    });

    return NextResponse.json(interviews);
  } catch (error) {
    console.error("인터뷰 조회 오류:", error);
    return NextResponse.json(
      { error: "인터뷰 조회에 실패했습니다." },
      { status: 500 }
    );
  }
}

/**
 * POST /api/as-is-analysis/interviews
 * 새 인터뷰 항목 생성
 */
export async function POST(request: NextRequest) {
  try {
    // 인증 확인
    const { error } = await requireAuth();
    if (error) return error;

    const body = await request.json();
    const {
      unitAnalysisId,
      interviewee,
      department,
      position,
      interviewDate,
      topic,
      content,
      keyFindings,
      suggestions,
      remarks,
    } = body;

    // 필수 필드 확인
    if (!unitAnalysisId || !interviewee || !content) {
      return NextResponse.json(
        { error: "unitAnalysisId, interviewee, content는 필수입니다." },
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
    const maxOrder = await prisma.asIsInterview.aggregate({
      where: { unitAnalysisId },
      _max: { order: true },
    });
    const nextOrder = (maxOrder._max.order ?? -1) + 1;

    // 새 인터뷰 생성
    const newItem = await prisma.asIsInterview.create({
      data: {
        unitAnalysisId,
        interviewee,
        department: department || null,
        position: position || null,
        interviewDate: interviewDate ? new Date(interviewDate) : null,
        topic: topic || null,
        content,
        keyFindings: keyFindings || null,
        suggestions: suggestions || null,
        remarks: remarks || null,
        order: nextOrder,
      },
    });

    return NextResponse.json(newItem, { status: 201 });
  } catch (error) {
    console.error("인터뷰 생성 오류:", error);
    return NextResponse.json(
      { error: "인터뷰 생성에 실패했습니다." },
      { status: 500 }
    );
  }
}
