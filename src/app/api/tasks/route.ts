/**
 * @file src/app/api/tasks/route.ts
 * @description
 * 태스크 API 라우트입니다.
 * 태스크 목록 조회(GET), 태스크 생성(POST)을 처리합니다.
 *
 * 초보자 가이드:
 * 1. **GET /api/tasks**: 프로젝트별 태스크 목록 조회
 *    - ?projectId=xxx: 특정 프로젝트의 태스크만 조회
 *    - ?status=IN_PROGRESS: 특정 상태의 태스크만 조회
 * 2. **POST /api/tasks**: 새 태스크 생성
 *
 * 수정 방법:
 * - 정렬 추가: orderBy 조건 수정
 * - 필터링 추가: where 조건 추가
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { TaskStatus, Prisma } from "@prisma/client";
import { requireAuth } from "@/lib/auth";
import { createTask } from "@/lib/services/taskService";

/**
 * 태스크 목록 조회
 * GET /api/tasks
 *
 * 지연 여부는 프론트엔드에서 마감일을 보고 표시만 합니다. (상태 변경 안함)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get("projectId");
    const status = searchParams.get("status") as TaskStatus | null;
    const assigneeId = searchParams.get("assigneeId");

    // 필터 조건 구성
    const where: Prisma.TaskWhereInput = {};

    if (projectId) where.projectId = projectId;
    if (status && Object.values(TaskStatus).includes(status)) where.status = status;
    // 특정 담당자가 포함된 태스크 필터링 (다대다)
    if (assigneeId) {
      where.assignees = {
        some: { userId: assigneeId },
      };
    }

    const tasks = await prisma.task.findMany({
      where,
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
        // 재촉 목록 조회
        nudges: {
          include: {
            nudger: {
              select: {
                id: true,
                name: true,
                avatar: true,
              },
            },
          },
          orderBy: { createdAt: "desc" },
        },
      },
      orderBy: [
        { status: "asc" },
        { order: "asc" },
        { createdAt: "desc" },
      ],
    });

    // 응답 형식 변환 (assignees 배열을 평탄화)
    // 주의: 지연 여부는 프론트엔드에서 계산하여 표시만 함 (상태 변경 안함)
    const transformedTasks = tasks.map((task) => ({
      ...task,
      // 주 담당자는 그대로 유지 (assignee)
      // 부 담당자 배열 평탄화 (assignees) - null 유저 필터링
      assignees: task.assignees.map((a) => a.user).filter((u) => u !== null),
    }));

    return NextResponse.json(transformedTasks);
  } catch (error) {
    console.error("태스크 목록 조회 실패:", error);
    return NextResponse.json(
      { error: "태스크 목록을 조회할 수 없습니다." },
      { status: 500 }
    );
  }
}

/**
 * 태스크 생성
 * POST /api/tasks
 * (인증 필요)
 *
 * 서비스 레이어(taskService)를 통해 중앙화된 Task 생성 로직 사용
 *
 * @param assigneeId - 주 담당자 ID (단일)
 * @param assigneeIds - 부 담당자 ID 배열 (다중 담당자 지원)
 * @param requirementId - 연결할 요구사항 ID (선택)
 */
export async function POST(request: NextRequest) {
  try {
    // 인증 확인
    const { user, error } = await requireAuth();
    if (error) return error;

    const body = await request.json();
    const { title, description, projectId, assigneeId, assigneeIds, priority, startDate, dueDate, requirementId, wbsItemId } = body;

    // 필수 필드 검증
    if (!title || !projectId) {
      return NextResponse.json(
        { error: "태스크 제목과 프로젝트 ID는 필수입니다." },
        { status: 400 }
      );
    }

    // 서비스 레이어를 통한 Task 생성
    const result = await createTask({
      title,
      description,
      projectId,
      creatorId: user!.id,
      creatorName: user!.name || user!.email || undefined,
      assigneeId,
      assigneeIds,
      priority,
      startDate,
      dueDate,
      requirementId,
      wbsItemId,
      isAiGenerated: body.isAiGenerated || false,
    });

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: result.error === "프로젝트를 찾을 수 없습니다." ? 404 : 500 }
      );
    }

    return NextResponse.json(result.task, { status: 201 });
  } catch (error) {
    console.error("태스크 생성 실패:", error);
    return NextResponse.json(
      { error: "태스크를 생성할 수 없습니다." },
      { status: 500 }
    );
  }
}
