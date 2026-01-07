/**
 * @file src/app/api/requirements/[id]/route.ts
 * @description
 * 개별 요구사항 API 라우트입니다.
 * 요구사항 상세 조회(GET), 수정(PATCH), 삭제(DELETE)를 처리합니다.
 *
 * 초보자 가이드:
 * 1. **GET /api/requirements/:id**: 요구사항 상세 정보 조회
 * 2. **PATCH /api/requirements/:id**: 요구사항 정보 수정
 * 3. **DELETE /api/requirements/:id**: 요구사항 삭제
 *
 * 수정 방법:
 * - 반환 필드 추가: include에 관계 추가
 * - 수정 가능 필드 추가: PATCH의 data에 필드 추가
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type RouteParams = {
  params: Promise<{ id: string }>;
};

/**
 * 요구사항 상세 조회
 * GET /api/requirements/:id
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    const requirement = await prisma.requirement.findUnique({
      where: { id },
      include: {
        project: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!requirement) {
      return NextResponse.json(
        { error: "요구사항을 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    return NextResponse.json(requirement);
  } catch (error) {
    console.error("요구사항 조회 실패:", error);
    return NextResponse.json(
      { error: "요구사항을 조회할 수 없습니다." },
      { status: 500 }
    );
  }
}

/**
 * 요구사항 수정
 * PATCH /api/requirements/:id
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { title, description, status, dueDate, isDelayed } = body;

    // 요구사항 존재 확인
    const existing = await prisma.requirement.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { error: "요구사항을 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    const requirement = await prisma.requirement.update({
      where: { id },
      data: {
        ...(title !== undefined && { title }),
        ...(description !== undefined && { description }),
        ...(status !== undefined && { status }),
        ...(dueDate !== undefined && { dueDate: dueDate ? new Date(dueDate) : null }),
        ...(isDelayed !== undefined && { isDelayed }),
      },
      include: {
        project: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    return NextResponse.json(requirement);
  } catch (error) {
    console.error("요구사항 수정 실패:", error);
    return NextResponse.json(
      { error: "요구사항을 수정할 수 없습니다." },
      { status: 500 }
    );
  }
}

/**
 * 요구사항 삭제
 * DELETE /api/requirements/:id
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    // 요구사항 존재 확인
    const existing = await prisma.requirement.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { error: "요구사항을 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    await prisma.requirement.delete({ where: { id } });

    return NextResponse.json({ message: "요구사항이 삭제되었습니다." });
  } catch (error) {
    console.error("요구사항 삭제 실패:", error);
    return NextResponse.json(
      { error: "요구사항을 삭제할 수 없습니다." },
      { status: 500 }
    );
  }
}
