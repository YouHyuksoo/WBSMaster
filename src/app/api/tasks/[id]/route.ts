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
import { TaskStatus } from "@prisma/client";
import { sendTaskCompletedNotification } from "@/lib/slack";

/**
 * 마감일 초과 여부 확인 헬퍼 함수
 * @param dueDate - 마감일
 * @param status - 현재 상태
 * @returns 지연 상태로 변경해야 하는지 여부
 */
function shouldBeDelayed(dueDate: Date | null, status: TaskStatus): boolean {
  // 마감일이 없거나 이미 완료/취소/지연 상태면 지연 처리 안함
  if (!dueDate) return false;
  if (status === "COMPLETED" || status === "CANCELLED" || status === "DELAYED") return false;

  // 마감일이 오늘보다 과거인지 확인 (자정 기준)
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dueDateNormalized = new Date(dueDate);
  dueDateNormalized.setHours(0, 0, 0, 0);

  return dueDateNormalized < today;
}

type RouteParams = {
  params: Promise<{ id: string }>;
};

/**
 * 태스크 상세 조회
 * GET /api/tasks/:id
 *
 * 마감일이 초과된 미완료 태스크는 자동으로 DELAYED(지연) 상태로 변경됩니다.
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
        // 주 담당자 조회 (1:N)
        assignee: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true,
          },
        },
        // 부 담당자 조회 (다대다, TaskAssignee를 통해)
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
        // 연결된 WBS 항목 조회
        wbsItem: {
          select: {
            id: true,
            code: true,
            name: true,
            level: true,
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

    // 마감일 초과된 태스크는 자동으로 DELAYED 상태로 업데이트
    let currentStatus: TaskStatus = task.status;
    if (shouldBeDelayed(task.dueDate, task.status)) {
      await prisma.task.update({
        where: { id },
        data: { status: TaskStatus.DELAYED },
      });
      currentStatus = TaskStatus.DELAYED;
    }

    // 응답 형식 변환 (assignees 배열 평탄화, 지연 상태 반영)
    const transformedTask = {
      ...task,
      status: currentStatus,
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
 * @param assigneeId - 주 담당자 ID (단일, null로 해제 가능)
 * @param assigneeIds - 부 담당자 ID 배열 (다중 담당자 지원, 기존 담당자 대체)
 * @param requirementId - 연결할 요구사항 ID (null로 연결 해제 가능)
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { title, description, status, priority, assigneeId, assigneeIds, startDate, dueDate, order, requirementId, wbsItemId } = body;

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
        ...(assigneeId !== undefined && { assigneeId: assigneeId || null }),  // 주 담당자
        ...(startDate !== undefined && { startDate: startDate ? new Date(startDate) : null }),  // 시작일
        ...(dueDate !== undefined && { dueDate: dueDate ? new Date(dueDate) : null }),          // 마감일
        ...(order !== undefined && { order }),
        ...(requirementId !== undefined && { requirementId: requirementId || null }),
        ...(wbsItemId !== undefined && { wbsItemId: wbsItemId || null }),
      },
      include: {
        // 주 담당자 조회
        assignee: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true,
          },
        },
        // 부 담당자 조회
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
        wbsItem: {
          select: {
            id: true,
            code: true,
            name: true,
            level: true,
          },
        },
      },
    });

    // 응답 형식 변환 (assignees 배열 평탄화)
    const transformedTask = {
      ...task,
      assignees: task.assignees.map((a) => a.user),
    };

    // Task가 완료 상태로 변경되었을 때 Slack 알림 전송
    if (status === "COMPLETED" && existing.status !== "COMPLETED") {
      // 프로젝트 정보 조회
      const project = await prisma.project.findUnique({
        where: { id: task.projectId },
        select: { name: true },
      });

      // 담당자 이름 (주 담당자 또는 부 담당자 첫 번째)
      const assigneeName = task.assignee?.name
        || (task.assignees.length > 0 ? task.assignees[0].user.name : null);

      // Slack 알림 전송 (비동기, 실패해도 응답에 영향 없음)
      sendTaskCompletedNotification({
        taskTitle: task.title,
        projectName: project?.name,
        assigneeName: assigneeName || undefined,
        completedAt: new Date(),
      }).catch((err) => {
        console.error("[Slack] Task 완료 알림 전송 실패:", err);
      });
    }

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
