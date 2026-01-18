/**
 * @file src/app/api/as-is-analysis/overview/[id]/route.ts
 * @description
 * AS-IS 총괄(Overview) 개별 항목 API 라우트입니다.
 * 총괄 정보의 조회, 수정, 삭제를 처리합니다.
 *
 * 초보자 가이드:
 * - GET: 특정 AS-IS 총괄 조회
 * - PATCH: AS-IS 총괄 정보 수정
 * - DELETE: AS-IS 총괄 삭제 (모든 항목도 함께 삭제)
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/as-is-analysis/overview/[id]
 * 특정 AS-IS 총괄 조회
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    // 인증 확인
    const { user, error } = await requireAuth();
    if (error) return error;

    const { id } = await params;

    const overview = await prisma.asIsOverview.findUnique({
      where: { id },
      include: {
        project: {
          select: {
            id: true,
            name: true,
          },
        },
        items: {
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
        },
      },
    });

    if (!overview) {
      return NextResponse.json(
        { error: "AS-IS 총괄을 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    return NextResponse.json(overview);
  } catch (error) {
    console.error("AS-IS 총괄 조회 오류:", error);
    return NextResponse.json(
      { error: "AS-IS 총괄 조회에 실패했습니다." },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/as-is-analysis/overview/[id]
 * AS-IS 총괄 정보 수정
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    // 인증 확인
    const { user, error } = await requireAuth();
    if (error) return error;

    const { id } = await params;
    const body = await request.json();
    const { customerName, author, createdDate } = body;

    // 존재 여부 확인
    const existing = await prisma.asIsOverview.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "AS-IS 총괄을 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    // 업데이트
    const overview = await prisma.asIsOverview.update({
      where: { id },
      data: {
        ...(customerName !== undefined && { customerName }),
        ...(author !== undefined && { author }),
        ...(createdDate !== undefined && { createdDate: new Date(createdDate) }),
      },
      include: {
        project: {
          select: {
            id: true,
            name: true,
          },
        },
        items: {
          orderBy: [
            { majorCategory: "asc" },
            { order: "asc" },
          ],
        },
      },
    });

    return NextResponse.json(overview);
  } catch (error) {
    console.error("AS-IS 총괄 수정 오류:", error);
    return NextResponse.json(
      { error: "AS-IS 총괄 수정에 실패했습니다." },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/as-is-analysis/overview/[id]
 * AS-IS 총괄 삭제
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    // 인증 확인
    const { user, error } = await requireAuth();
    if (error) return error;

    const { id } = await params;

    // 존재 여부 확인
    const existing = await prisma.asIsOverview.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "AS-IS 총괄을 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    // 삭제 (Cascade로 items도 함께 삭제됨)
    await prisma.asIsOverview.delete({
      where: { id },
    });

    return NextResponse.json({ message: "AS-IS 총괄이 삭제되었습니다." });
  } catch (error) {
    console.error("AS-IS 총괄 삭제 오류:", error);
    return NextResponse.json(
      { error: "AS-IS 총괄 삭제에 실패했습니다." },
      { status: 500 }
    );
  }
}
