/**
 * @file src/app/api/as-is-analysis/flow-chart-details/route.ts
 * @description
 * AS-IS Flow Chart 상세 API 라우트입니다.
 * Flow Chart의 각 단계별 상세 정보 목록 조회 및 생성을 처리합니다.
 *
 * 초보자 가이드:
 * - GET: 단위업무 분석에 속한 Flow Chart 상세 목록 조회
 * - POST: 새 Flow Chart 상세 항목 생성
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";

/**
 * GET /api/as-is-analysis/flow-chart-details
 * Flow Chart 상세 목록 조회
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

    // Flow Chart 상세 목록 조회
    const details = await prisma.asIsFlowChartDetail.findMany({
      where: { unitAnalysisId },
      orderBy: { order: "asc" },
    });

    return NextResponse.json(details);
  } catch (error) {
    console.error("Flow Chart 상세 조회 오류:", error);
    return NextResponse.json(
      { error: "Flow Chart 상세 조회에 실패했습니다." },
      { status: 500 }
    );
  }
}

/**
 * POST /api/as-is-analysis/flow-chart-details
 * 새 Flow Chart 상세 항목 생성
 */
export async function POST(request: NextRequest) {
  try {
    // 인증 확인
    const { error } = await requireAuth();
    if (error) return error;

    const body = await request.json();
    const {
      unitAnalysisId,
      nodeId,
      stepNumber,
      processName,
      description,
      responsible,
      systemUsed,
      inputData,
      outputData,
      remarks,
    } = body;

    // 필수 필드 확인
    if (!unitAnalysisId || !processName) {
      return NextResponse.json(
        { error: "unitAnalysisId, processName은 필수입니다." },
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
    const maxOrder = await prisma.asIsFlowChartDetail.aggregate({
      where: { unitAnalysisId },
      _max: { order: true },
    });
    const nextOrder = (maxOrder._max.order ?? -1) + 1;

    // 다음 stepNumber 계산 (입력값이 없으면 자동 계산)
    let finalStepNumber = stepNumber;
    if (!finalStepNumber) {
      const maxStep = await prisma.asIsFlowChartDetail.aggregate({
        where: { unitAnalysisId },
        _max: { stepNumber: true },
      });
      finalStepNumber = (maxStep._max.stepNumber ?? 0) + 1;
    }

    // 새 Flow Chart 상세 생성
    const newItem = await prisma.asIsFlowChartDetail.create({
      data: {
        unitAnalysisId,
        nodeId: nodeId || null,
        stepNumber: finalStepNumber,
        processName,
        description: description || null,
        responsible: responsible || null,
        systemUsed: systemUsed || null,
        inputData: inputData || null,
        outputData: outputData || null,
        remarks: remarks || null,
        order: nextOrder,
      },
    });

    return NextResponse.json(newItem, { status: 201 });
  } catch (error) {
    console.error("Flow Chart 상세 생성 오류:", error);
    return NextResponse.json(
      { error: "Flow Chart 상세 생성에 실패했습니다." },
      { status: 500 }
    );
  }
}
