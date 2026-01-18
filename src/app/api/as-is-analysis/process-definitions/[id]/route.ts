/**
 * @file src/app/api/as-is-analysis/process-definitions/[id]/route.ts
 * @description
 * AS-IS 프로세스 정의서 개별 API 라우트입니다.
 * 프로세스 단계의 조회, 수정, 삭제를 처리합니다.
 *
 * 초보자 가이드:
 * - GET: 특정 프로세스 정의 조회
 * - PATCH: 프로세스 정의 수정
 * - DELETE: 프로세스 정의 삭제
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/as-is-analysis/process-definitions/[id]
 * 특정 프로세스 정의 조회
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    // 인증 확인
    const { error } = await requireAuth();
    if (error) return error;

    const { id } = await params;

    const definition = await prisma.asIsProcessDefinition.findUnique({
      where: { id },
    });

    if (!definition) {
      return NextResponse.json(
        { error: "프로세스 정의를 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    return NextResponse.json(definition);
  } catch (error) {
    console.error("프로세스 정의 조회 오류:", error);
    return NextResponse.json(
      { error: "프로세스 정의 조회에 실패했습니다." },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/as-is-analysis/process-definitions/[id]
 * 프로세스 정의 수정
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    // 인증 확인
    const { error } = await requireAuth();
    if (error) return error;

    const { id } = await params;
    const body = await request.json();
    const {
      stepNumber,
      processName,
      description,
      input,
      output,
      relatedSystem,
      remarks,
      order,
    } = body;

    // 존재 여부 확인
    const existing = await prisma.asIsProcessDefinition.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "프로세스 정의를 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    // 업데이트
    const definition = await prisma.asIsProcessDefinition.update({
      where: { id },
      data: {
        ...(stepNumber !== undefined && { stepNumber }),
        ...(processName !== undefined && { processName }),
        ...(description !== undefined && { description }),
        ...(input !== undefined && { input }),
        ...(output !== undefined && { output }),
        ...(relatedSystem !== undefined && { relatedSystem }),
        ...(remarks !== undefined && { remarks }),
        ...(order !== undefined && { order }),
      },
    });

    return NextResponse.json(definition);
  } catch (error) {
    console.error("프로세스 정의 수정 오류:", error);
    return NextResponse.json(
      { error: "프로세스 정의 수정에 실패했습니다." },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/as-is-analysis/process-definitions/[id]
 * 프로세스 정의 삭제
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    // 인증 확인
    const { error } = await requireAuth();
    if (error) return error;

    const { id } = await params;

    // 존재 여부 확인
    const existing = await prisma.asIsProcessDefinition.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "프로세스 정의를 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    // 삭제
    await prisma.asIsProcessDefinition.delete({
      where: { id },
    });

    return NextResponse.json({ message: "프로세스 정의가 삭제되었습니다." });
  } catch (error) {
    console.error("프로세스 정의 삭제 오류:", error);
    return NextResponse.json(
      { error: "프로세스 정의 삭제에 실패했습니다." },
      { status: 500 }
    );
  }
}
