/**
 * @file src/app/api/as-is-analysis/screens/[id]/route.ts
 * @description
 * AS-IS 화면 목록 개별 API 라우트입니다.
 * 화면 항목의 조회, 수정, 삭제를 처리합니다.
 *
 * 초보자 가이드:
 * - GET: 특정 화면 조회
 * - PATCH: 화면 수정
 * - DELETE: 화면 삭제
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/as-is-analysis/screens/[id]
 * 특정 화면 조회
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    // 인증 확인
    const { error } = await requireAuth();
    if (error) return error;

    const { id } = await params;

    const item = await prisma.asIsScreen.findUnique({
      where: { id },
    });

    if (!item) {
      return NextResponse.json(
        { error: "화면을 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    return NextResponse.json(item);
  } catch (error) {
    console.error("화면 조회 오류:", error);
    return NextResponse.json(
      { error: "화면 조회에 실패했습니다." },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/as-is-analysis/screens/[id]
 * 화면 수정
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    // 인증 확인
    const { error } = await requireAuth();
    if (error) return error;

    const { id } = await params;
    const body = await request.json();
    const {
      screenId,
      screenName,
      description,
      menuPath,
      screenType,
      relatedFunction,
      remarks,
      order,
    } = body;

    // 존재 여부 확인
    const existing = await prisma.asIsScreen.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "화면을 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    // 업데이트
    const updated = await prisma.asIsScreen.update({
      where: { id },
      data: {
        ...(screenId !== undefined && { screenId }),
        ...(screenName !== undefined && { screenName }),
        ...(description !== undefined && { description }),
        ...(menuPath !== undefined && { menuPath }),
        ...(screenType !== undefined && { screenType }),
        ...(relatedFunction !== undefined && { relatedFunction }),
        ...(remarks !== undefined && { remarks }),
        ...(order !== undefined && { order }),
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("화면 수정 오류:", error);
    return NextResponse.json(
      { error: "화면 수정에 실패했습니다." },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/as-is-analysis/screens/[id]
 * 화면 삭제
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    // 인증 확인
    const { error } = await requireAuth();
    if (error) return error;

    const { id } = await params;

    // 존재 여부 확인
    const existing = await prisma.asIsScreen.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "화면을 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    // 삭제
    await prisma.asIsScreen.delete({
      where: { id },
    });

    return NextResponse.json({ message: "화면이 삭제되었습니다." });
  } catch (error) {
    console.error("화면 삭제 오류:", error);
    return NextResponse.json(
      { error: "화면 삭제에 실패했습니다." },
      { status: 500 }
    );
  }
}
