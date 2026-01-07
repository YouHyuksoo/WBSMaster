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

/**
 * 태스크 목록 조회
 * GET /api/tasks
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
        // 다중 담당자 조회 (TaskAssignee를 통해)
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
      },
      orderBy: [
        { status: "asc" },
        { order: "asc" },
        { createdAt: "desc" },
      ],
    });

    // 응답 형식 변환 (assignees 배열을 평탄화)
    const transformedTasks = tasks.map((task) => ({
      ...task,
      assignees: task.assignees.map((a) => a.user),
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
 * @param assigneeIds - 담당자 ID 배열 (다중 담당자 지원)
 * @param requirementId - 연결할 요구사항 ID (선택)
 */
export async function POST(request: NextRequest) {
  try {
    // 인증 확인
    const { user, error } = await requireAuth();
    if (error) return error;

    const body = await request.json();
    const { title, description, projectId, assigneeIds, priority, dueDate, requirementId } = body;

    // 필수 필드 검증
    if (!title || !projectId) {
      return NextResponse.json(
        { error: "태스크 제목과 프로젝트 ID는 필수입니다." },
        { status: 400 }
      );
    }

    // 생성자 ID는 현재 로그인한 사용자
    const creatorId = user!.id;

    // 프로젝트 존재 확인
    const project = await prisma.project.findUnique({ where: { id: projectId } });
    if (!project) {
      return NextResponse.json(
        { error: "프로젝트를 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    // 현재 태스크 수로 order 결정
    const taskCount = await prisma.task.count({ where: { projectId } });

    // 담당자 배열 준비 (다대다 관계 생성)
    const assigneesData = Array.isArray(assigneeIds) && assigneeIds.length > 0
      ? assigneeIds.map((userId: string) => ({ userId }))
      : [];

    const task = await prisma.task.create({
      data: {
        title,
        description,
        projectId,
        creatorId,
        priority: priority || "MEDIUM",
        dueDate: dueDate ? new Date(dueDate) : null,
        status: "PENDING",
        order: taskCount,
        requirementId: requirementId || null, // 요구사항 연결 (선택)
        // 다중 담당자 생성 (TaskAssignee 레코드)
        assignees: {
          create: assigneesData,
        },
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

    return NextResponse.json(transformedTask, { status: 201 });
  } catch (error) {
    console.error("태스크 생성 실패:", error);
    return NextResponse.json(
      { error: "태스크를 생성할 수 없습니다." },
      { status: 500 }
    );
  }
}
