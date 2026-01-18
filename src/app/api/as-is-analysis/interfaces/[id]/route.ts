/**
 * @file src/app/api/as-is-analysis/interfaces/[id]/route.ts
 * @description
 * AS-IS 인터페이스 개별 API 라우트입니다.
 * 인터페이스 항목의 조회, 수정, 삭제를 처리합니다.
 *
 * 초보자 가이드:
 * - GET: 특정 인터페이스 조회
 * - PATCH: 인터페이스 수정
 * - DELETE: 인터페이스 삭제
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/as-is-analysis/interfaces/[id]
 * 특정 인터페이스 조회
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    // 인증 확인
    const { error } = await requireAuth();
    if (error) return error;

    const { id } = await params;

    const item = await prisma.asIsInterface.findUnique({
      where: { id },
    });

    if (!item) {
      return NextResponse.json(
        { error: "인터페이스를 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    return NextResponse.json(item);
  } catch (error) {
    console.error("인터페이스 조회 오류:", error);
    return NextResponse.json(
      { error: "인터페이스 조회에 실패했습니다." },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/as-is-analysis/interfaces/[id]
 * 인터페이스 수정
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    // 인증 확인
    const { error } = await requireAuth();
    if (error) return error;

    const { id } = await params;
    const body = await request.json();
    const {
      interfaceId,
      interfaceName,
      description,
      sourceSystem,
      targetSystem,
      interfaceType,
      protocol,
      frequency,
      dataVolume,
      remarks,
      order,
    } = body;

    // 존재 여부 확인
    const existing = await prisma.asIsInterface.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "인터페이스를 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    // 업데이트
    const updated = await prisma.asIsInterface.update({
      where: { id },
      data: {
        ...(interfaceId !== undefined && { interfaceId }),
        ...(interfaceName !== undefined && { interfaceName }),
        ...(description !== undefined && { description }),
        ...(sourceSystem !== undefined && { sourceSystem }),
        ...(targetSystem !== undefined && { targetSystem }),
        ...(interfaceType !== undefined && { interfaceType }),
        ...(protocol !== undefined && { protocol }),
        ...(frequency !== undefined && { frequency }),
        ...(dataVolume !== undefined && { dataVolume }),
        ...(remarks !== undefined && { remarks }),
        ...(order !== undefined && { order }),
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("인터페이스 수정 오류:", error);
    return NextResponse.json(
      { error: "인터페이스 수정에 실패했습니다." },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/as-is-analysis/interfaces/[id]
 * 인터페이스 삭제
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    // 인증 확인
    const { error } = await requireAuth();
    if (error) return error;

    const { id } = await params;

    // 존재 여부 확인
    const existing = await prisma.asIsInterface.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "인터페이스를 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    // 삭제
    await prisma.asIsInterface.delete({
      where: { id },
    });

    return NextResponse.json({ message: "인터페이스가 삭제되었습니다." });
  } catch (error) {
    console.error("인터페이스 삭제 오류:", error);
    return NextResponse.json(
      { error: "인터페이스 삭제에 실패했습니다." },
      { status: 500 }
    );
  }
}
