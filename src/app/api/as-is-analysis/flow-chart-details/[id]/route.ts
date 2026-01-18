/**
 * @file src/app/api/as-is-analysis/flow-chart-details/[id]/route.ts
 * @description
 * AS-IS Flow Chart 상세 개별 API 라우트입니다.
 * Flow Chart 상세 항목의 조회, 수정, 삭제를 처리합니다.
 *
 * 초보자 가이드:
 * - GET: 특정 Flow Chart 상세 조회
 * - PATCH: Flow Chart 상세 수정
 * - DELETE: Flow Chart 상세 삭제
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/as-is-analysis/flow-chart-details/[id]
 * 특정 Flow Chart 상세 조회
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    // 인증 확인
    const { error } = await requireAuth();
    if (error) return error;

    const { id } = await params;

    const item = await prisma.asIsFlowChartDetail.findUnique({
      where: { id },
    });

    if (!item) {
      return NextResponse.json(
        { error: "Flow Chart 상세를 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    return NextResponse.json(item);
  } catch (error) {
    console.error("Flow Chart 상세 조회 오류:", error);
    return NextResponse.json(
      { error: "Flow Chart 상세 조회에 실패했습니다." },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/as-is-analysis/flow-chart-details/[id]
 * Flow Chart 상세 수정
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    // 인증 확인
    const { error } = await requireAuth();
    if (error) return error;

    const { id } = await params;
    const body = await request.json();
    const {
      nodeId,
      stepNumber,
      processName,
      description,
      responsible,
      systemUsed,
      inputData,
      outputData,
      remarks,
      order,
    } = body;

    // 존재 여부 확인
    const existing = await prisma.asIsFlowChartDetail.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Flow Chart 상세를 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    // 업데이트
    const updated = await prisma.asIsFlowChartDetail.update({
      where: { id },
      data: {
        ...(nodeId !== undefined && { nodeId }),
        ...(stepNumber !== undefined && { stepNumber }),
        ...(processName !== undefined && { processName }),
        ...(description !== undefined && { description }),
        ...(responsible !== undefined && { responsible }),
        ...(systemUsed !== undefined && { systemUsed }),
        ...(inputData !== undefined && { inputData }),
        ...(outputData !== undefined && { outputData }),
        ...(remarks !== undefined && { remarks }),
        ...(order !== undefined && { order }),
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Flow Chart 상세 수정 오류:", error);
    return NextResponse.json(
      { error: "Flow Chart 상세 수정에 실패했습니다." },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/as-is-analysis/flow-chart-details/[id]
 * Flow Chart 상세 삭제
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    // 인증 확인
    const { error } = await requireAuth();
    if (error) return error;

    const { id } = await params;

    // 존재 여부 확인
    const existing = await prisma.asIsFlowChartDetail.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Flow Chart 상세를 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    // 삭제
    await prisma.asIsFlowChartDetail.delete({
      where: { id },
    });

    return NextResponse.json({ message: "Flow Chart 상세가 삭제되었습니다." });
  } catch (error) {
    console.error("Flow Chart 상세 삭제 오류:", error);
    return NextResponse.json(
      { error: "Flow Chart 상세 삭제에 실패했습니다." },
      { status: 500 }
    );
  }
}
