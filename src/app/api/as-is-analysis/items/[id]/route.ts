/**
 * @file src/app/api/as-is-analysis/items/[id]/route.ts
 * @description
 * AS-IS 총괄 항목(OverviewItem) 개별 API 라우트입니다.
 * 업무 항목의 조회, 수정, 삭제를 처리합니다.
 *
 * 초보자 가이드:
 * - GET: 특정 항목 조회
 * - PATCH: 항목 수정
 * - DELETE: 항목 삭제
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/as-is-analysis/items/[id]
 * 특정 항목 조회
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    // 인증 확인
    const { error } = await requireAuth();
    if (error) return error;

    const { id } = await params;

    const item = await prisma.asIsOverviewItem.findUnique({
      where: { id },
      include: {
        overview: {
          select: {
            id: true,
            projectId: true,
          },
        },
        unitAnalysis: true,
      },
    });

    if (!item) {
      return NextResponse.json(
        { error: "AS-IS 항목을 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    return NextResponse.json(item);
  } catch (error) {
    console.error("AS-IS 항목 조회 오류:", error);
    return NextResponse.json(
      { error: "AS-IS 항목 조회에 실패했습니다." },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/as-is-analysis/items/[id]
 * 항목 수정
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    // 인증 확인
    const { error } = await requireAuth();
    if (error) return error;

    const { id } = await params;
    const body = await request.json();
    const {
      asIsManagementNo, // AS-IS 관리번호
      majorCategory,
      middleCategory,
      taskName,
      currentMethod,
      issueSummary,
      details,
      remarks,
      order,
    } = body;

    // 존재 여부 확인
    const existing = await prisma.asIsOverviewItem.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "AS-IS 항목을 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    // 업데이트
    const item = await prisma.asIsOverviewItem.update({
      where: { id },
      data: {
        ...(asIsManagementNo !== undefined && { asIsManagementNo }), // AS-IS 관리번호
        ...(majorCategory !== undefined && { majorCategory: majorCategory as never }),
        ...(middleCategory !== undefined && { middleCategory }),
        ...(taskName !== undefined && { taskName }),
        ...(currentMethod !== undefined && { currentMethod: currentMethod as never }),
        ...(issueSummary !== undefined && { issueSummary }),
        ...(details !== undefined && { details }),
        ...(remarks !== undefined && { remarks }),
        ...(order !== undefined && { order }),
      },
      include: {
        unitAnalysis: {
          select: {
            id: true,
          },
        },
      },
    });

    return NextResponse.json(item);
  } catch (error) {
    console.error("AS-IS 항목 수정 오류:", error);
    return NextResponse.json(
      { error: "AS-IS 항목 수정에 실패했습니다." },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/as-is-analysis/items/[id]
 * 항목 삭제
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    // 인증 확인
    const { error } = await requireAuth();
    if (error) return error;

    const { id } = await params;

    // 존재 여부 확인
    const existing = await prisma.asIsOverviewItem.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "AS-IS 항목을 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    // 삭제 (Cascade로 unitAnalysis도 함께 삭제됨)
    await prisma.asIsOverviewItem.delete({
      where: { id },
    });

    return NextResponse.json({ message: "AS-IS 항목이 삭제되었습니다." });
  } catch (error) {
    console.error("AS-IS 항목 삭제 오류:", error);
    return NextResponse.json(
      { error: "AS-IS 항목 삭제에 실패했습니다." },
      { status: 500 }
    );
  }
}
