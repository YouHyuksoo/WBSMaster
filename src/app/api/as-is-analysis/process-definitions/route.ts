/**
 * @file src/app/api/as-is-analysis/process-definitions/route.ts
 * @description
 * AS-IS 프로세스 정의서 API 라우트입니다.
 * 업무 프로세스 단계의 목록 조회 및 생성을 처리합니다.
 *
 * 초보자 가이드:
 * - GET: 단위업무 분석에 속한 프로세스 정의 목록 조회
 * - POST: 새 프로세스 단계 생성
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";

/**
 * GET /api/as-is-analysis/process-definitions
 * 프로세스 정의 목록 조회
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

    // 프로세스 정의 목록 조회
    const definitions = await prisma.asIsProcessDefinition.findMany({
      where: { unitAnalysisId },
      orderBy: { order: "asc" },
    });

    return NextResponse.json(definitions);
  } catch (error) {
    console.error("프로세스 정의 조회 오류:", error);
    return NextResponse.json(
      { error: "프로세스 정의 조회에 실패했습니다." },
      { status: 500 }
    );
  }
}

/**
 * POST /api/as-is-analysis/process-definitions
 * 새 프로세스 단계 생성
 */
export async function POST(request: NextRequest) {
  try {
    // 인증 확인
    const { error } = await requireAuth();
    if (error) return error;

    const body = await request.json();
    const {
      unitAnalysisId,
      stepNumber,
      processName,
      description,
      input,
      output,
      relatedSystem,
      remarks,
    } = body;

    // 필수 필드 확인
    if (!unitAnalysisId || !processName) {
      return NextResponse.json(
        { error: "unitAnalysisId와 processName은 필수입니다." },
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
    const maxOrder = await prisma.asIsProcessDefinition.aggregate({
      where: { unitAnalysisId },
      _max: { order: true },
    });
    const nextOrder = (maxOrder._max.order ?? -1) + 1;

    // 다음 stepNumber 계산 (입력값이 없으면 자동 계산)
    let finalStepNumber = stepNumber;
    if (!finalStepNumber) {
      const maxStep = await prisma.asIsProcessDefinition.aggregate({
        where: { unitAnalysisId },
        _max: { stepNumber: true },
      });
      finalStepNumber = (maxStep._max.stepNumber ?? 0) + 1;
    }

    // 새 프로세스 정의 생성
    const definition = await prisma.asIsProcessDefinition.create({
      data: {
        unitAnalysisId,
        stepNumber: finalStepNumber,
        processName,
        description: description || null,
        input: input || null,
        output: output || null,
        relatedSystem: relatedSystem || null,
        remarks: remarks || null,
        order: nextOrder,
      },
    });

    return NextResponse.json(definition, { status: 201 });
  } catch (error) {
    console.error("프로세스 정의 생성 오류:", error);
    return NextResponse.json(
      { error: "프로세스 정의 생성에 실패했습니다." },
      { status: 500 }
    );
  }
}
