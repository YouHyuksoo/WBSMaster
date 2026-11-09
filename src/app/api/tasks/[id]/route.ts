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
 * 4. 인증: requireAuth + assertProjectAccess (태스크의 projectId 기준, 프로젝트 멤버 · ADMIN 만)
 *
 * 수정 방법:
 * - 반환 필드 추가: include에 관계 추가
 * - 수정 가능 필드 추가: PATCH의 data에 필드 추가
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, assertProjectAccess } from "@/lib/auth";
import { updateTask } from "@/lib/services/taskService";

type RouteParams = {
  params: Promise<{ id: string }>;
};

/**
 * 태스크 상세 조회
 * GET /api/tasks/:id
 *
 * 지연 여부는 프론트엔드에서 마감일을 보고 표시만 합니다. (상태 변경 안함)
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { user, error } = await requireAuth();
    if (error) return error;

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

    const denied = await assertProjectAccess(task.projectId, user!);
    if (denied) return denied;

    // 응답 형식 변환 (assignees 배열 평탄화)
    // 주의: 지연 여부는 프론트엔드에서 계산하여 표시만 함 (상태 변경 안함)
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
 * @param assigneeId - 주 담당자 ID (단일, null로 해제 가능)
 * @param assigneeIds - 부 담당자 ID 배열 (다중 담당자 지원, 기존 담당자 대체)
 * @param requirementId - 연결할 요구사항 ID (null로 연결 해제 가능)
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { user, error } = await requireAuth();
    if (error) return error;

    const { id } = await params;
    const body = await request.json();
    const { title, description, status, priority, progress, assigneeId, assigneeIds, startDate, dueDate, actualStartDate, actualEndDate, order, requirementId, wbsItemId, flowX, flowY } = body;

    // 태스크 존재 확인
    const existing = await prisma.task.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { error: "태스크를 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    const denied = await assertProjectAccess(existing.projectId, user!);
    if (denied) return denied;

    // 담당자 교체 · 수정 · 완료 Slack 알림은 서비스에서 (AI 채팅 확인 카드와 같은 함수)
    const result = await updateTask(id, existing.projectId, {
      title, description, status, priority, progress, assigneeId, assigneeIds, startDate, dueDate,
      actualStartDate, actualEndDate, order, requirementId, wbsItemId, flowX, flowY,
    });
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    return NextResponse.json(result.data);
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
    const { user, error } = await requireAuth();
    if (error) return error;

    const { id } = await params;

    // 태스크 존재 확인
    const existing = await prisma.task.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { error: "태스크를 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    const denied = await assertProjectAccess(existing.projectId, user!);
    if (denied) return denied;

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
