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
        // 다중 담당자 조회 (TaskAssignee를 통해)
        assignees: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                avatar: true,
              },
            },
          },
        },
        creator: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        // 연결된 요구사항 조회
        requirement: {
          select: {
            id: true,
            code: true,
            title: true,
            status: true,
            priority: true,
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

    // 응답 형식 변환 (assignees 배열 평탄화)
    const transformedTask = {
      ...task,
      assignees: task.assignees.map((a) => a.user),
    };

    return NextResponse.json(transformedTask);
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
 *
 * @param assigneeIds - 담당자 ID 배열 (다중 담당자 지원, 기존 담당자 대체)
 * @param requirementId - 연결할 요구사항 ID (null로 연결 해제 가능)
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { title, description, status, priority, assigneeIds, dueDate, order, requirementId } = body;

    // 태스크 존재 확인
    const existing = await prisma.task.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { error: "태스크를 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    // 담당자 업데이트가 있는 경우 (기존 담당자 삭제 후 새로 생성)
    if (assigneeIds !== undefined) {
      // 기존 담당자 모두 삭제
      await prisma.taskAssignee.deleteMany({
        where: { taskId: id },
      });

      // 새 담당자 추가
      if (Array.isArray(assigneeIds) && assigneeIds.length > 0) {
        await prisma.taskAssignee.createMany({
          data: assigneeIds.map((userId: string) => ({
            taskId: id,
            userId,
          })),
        });
      }
    }

    const task = await prisma.task.update({
      where: { id },
      data: {
        ...(title !== undefined && { title }),
        ...(description !== undefined && { description }),
        ...(status !== undefined && { status }),
        ...(priority !== undefined && { priority }),
        ...(dueDate !== undefined && { dueDate: dueDate ? new Date(dueDate) : null }),
        ...(order !== undefined && { order }),
        ...(requirementId !== undefined && { requirementId: requirementId || null }),
      },
      include: {
        assignees: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                avatar: true,
              },
            },
          },
        },
        creator: {
          select: {
            id: true,
            name: true,
          },
        },
        requirement: {
          select: {
            id: true,
            code: true,
            title: true,
            status: true,
            priority: true,
          },
        },
      },
    });

    // 응답 형식 변환 (assignees 배열 평탄화)
    const transformedTask = {
      ...task,
      assignees: task.assignees.map((a) => a.user),
    };

    return NextResponse.json(transformedTask);
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
