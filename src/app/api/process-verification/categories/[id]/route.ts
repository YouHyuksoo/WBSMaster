/**
 * @file src/app/api/process-verification/categories/[id]/route.ts
 * @description
 * 개별 공정검증 카테고리 API 라우트입니다.
 * 카테고리 상세 조회(GET), 수정(PATCH), 삭제(DELETE)를 처리합니다.
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type RouteParams = {
  params: Promise<{ id: string }>;
};

/**
 * 카테고리 상세 조회
 * GET /api/process-verification/categories/:id
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    const category = await prisma.processVerificationCategory.findUnique({
      where: { id },
      include: {
        items: {
          orderBy: { order: "asc" },
        },
        _count: {
          select: { items: true },
        },
      },
    });

    if (!category) {
      return NextResponse.json(
        { error: "카테고리를 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    return NextResponse.json(category);
  } catch (error) {
    console.error("카테고리 조회 실패:", error);
    return NextResponse.json(
      { error: "카테고리를 조회할 수 없습니다." },
      { status: 500 }
    );
  }
}

/**
 * 카테고리 수정
 * PATCH /api/process-verification/categories/:id
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { name, code, order, description } = body;

    // 카테고리 존재 확인
    const existing = await prisma.processVerificationCategory.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "카테고리를 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    // 코드 중복 체크 (다른 카테고리와 충돌)
    if (code && code !== existing.code) {
      const codeExists = await prisma.processVerificationCategory.findUnique({
        where: { projectId_code: { projectId: existing.projectId, code } },
      });
      if (codeExists) {
        return NextResponse.json(
          { error: "이미 존재하는 카테고리 코드입니다." },
          { status: 400 }
        );
      }
    }

    const category = await prisma.processVerificationCategory.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(code !== undefined && { code }),
        ...(order !== undefined && { order }),
        ...(description !== undefined && { description }),
      },
    });

    return NextResponse.json(category);
  } catch (error) {
    console.error("카테고리 수정 실패:", error);
    return NextResponse.json(
      { error: "카테고리를 수정할 수 없습니다." },
      { status: 500 }
    );
  }
}

/**
 * 카테고리 삭제
 * DELETE /api/process-verification/categories/:id
 * @warning 해당 카테고리의 모든 항목도 함께 삭제됩니다.
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    // 카테고리 존재 확인
    const existing = await prisma.processVerificationCategory.findUnique({
      where: { id },
      include: {
        _count: {
          select: { items: true },
        },
      },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "카테고리를 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    // 카테고리 삭제 (항목도 Cascade로 함께 삭제)
    await prisma.processVerificationCategory.delete({ where: { id } });

    return NextResponse.json({
      message: "카테고리가 삭제되었습니다.",
      deletedItemsCount: existing._count.items,
    });
  } catch (error) {
    console.error("카테고리 삭제 실패:", error);
    return NextResponse.json(
      { error: "카테고리를 삭제할 수 없습니다." },
      { status: 500 }
    );
  }
}
