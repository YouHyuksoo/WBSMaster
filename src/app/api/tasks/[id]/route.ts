/**
 * @file src/app/api/tasks/[id]/route.ts
 * @description
 * 개별 태스크 API 라우트입니다.
 * 태스크 상세 조회(GET), 수정(PATCH), 삭제(DELETE)를 처리합니다.
 *
 * 초보자 가이드:
 * 1. **GET /api/tasks/:id**: 태스크 상세 정보 조회
 * 2. **PATCH /api/tasks/:id**: 태스크 정보 수정 (상태 변경, 담당자 변경 등)
 * 3. **DELETE /api/tasks/:id**: 태스크 삭제
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
 * 태스크 상세 조회
 * GET /api/tasks/:id
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    const task = await prisma.task.findUnique({
      where: { id },
      include: {
        project: {
          select: {
            id: true,
            name: true,
          },
        },
        assignee: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true,
          },
        },
        creator: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    if (!task) {
      return NextResponse.json(
        { error: "태스크를 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    return NextResponse.json(task);
  } catch (error) {
    console.error("태스크 조회 실패:", error);
    return NextResponse.json(
      { error: "태스크를 조회할 수 없습니다." },
      { status: 500 }
    );
  }
}

/**
 * 태스크 수정
 * PATCH /api/tasks/:id
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { title, description, status, priority, assigneeId, dueDate, order } = body;

    // 태스크 존재 확인
    const existing = await prisma.task.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { error: "태스크를 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    const task = await prisma.task.update({
      where: { id },
      data: {
        ...(title !== undefined && { title }),
        ...(description !== undefined && { description }),
        ...(status !== undefined && { status }),
        ...(priority !== undefined && { priority }),
        ...(assigneeId !== undefined && { assigneeId }),
        ...(dueDate !== undefined && { dueDate: dueDate ? new Date(dueDate) : null }),
        ...(order !== undefined && { order }),
      },
      include: {
        assignee: {
          select: {
            id: true,
            name: true,
            avatar: true,
          },
        },
        creator: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    return NextResponse.json(task);
  } catch (error) {
    console.error("태스크 수정 실패:", error);
    return NextResponse.json(
      { error: "태스크를 수정할 수 없습니다." },
      { status: 500 }
    );
  }
}

/**
 * 태스크 삭제
 * DELETE /api/tasks/:id
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    // 태스크 존재 확인
    const existing = await prisma.task.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { error: "태스크를 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    await prisma.task.delete({ where: { id } });

    return NextResponse.json({ message: "태스크가 삭제되었습니다." });
  } catch (error) {
    console.error("태스크 삭제 실패:", error);
    return NextResponse.json(
      { error: "태스크를 삭제할 수 없습니다." },
      { status: 500 }
    );
  }
}
