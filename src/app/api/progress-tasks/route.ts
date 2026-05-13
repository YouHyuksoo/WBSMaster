/**
 * @file src/app/api/progress-tasks/route.ts
 * @description
 * 진도 task API — 목록 조회 / 생성
 *
 * 초보자 가이드:
 * 1. **GET /api/progress-tasks**: 프로젝트별 진도 task 목록 조회
 *    - ?projectId=xxx: 특정 프로젝트의 task만 조회 (필수)
 * 2. **POST /api/progress-tasks**: 새 진도 task 생성
 *
 * 수정 방법:
 * - 정렬 추가: orderBy 조건 수정
 * - 추가 필터링: 필요 시 where 조건 확장 (단, 상태/우선순위 등 표시 필터는 클라이언트에서 처리)
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";

/**
 * 담당자 정보 포함 객체
 * 진도 task의 담당자 목록을 함께 조회
 */
const ASSIGNEE_INCLUDE = {
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
} as const;

/**
 * 진도 task 목록 조회
 * GET /api/progress-tasks
 */
export async function GET(request: NextRequest) {
  const { error: authError } = await requireAuth();
  if (authError) return authError;

  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get("projectId");

    if (!projectId) {
      return NextResponse.json({ error: "projectId required" }, { status: 400 });
    }

    const tasks = await prisma.progressTask.findMany({
      where: { projectId },
      orderBy: { order: "asc" },
      include: ASSIGNEE_INCLUDE,
    });

    return NextResponse.json(tasks);
  } catch (error) {
    console.error("진도 task 목록 조회 실패:", error);
    return NextResponse.json(
      { error: "진도 task 목록을 조회할 수 없습니다." },
      { status: 500 }
    );
  }
}

/**
 * 진도 task 생성
 * POST /api/progress-tasks
 */
export async function POST(request: NextRequest) {
  const { error: authError } = await requireAuth();
  if (authError) return authError;

  try {
    const body = await request.json();
    const { projectId, name, startDate, endDate, category, businessUnit, description, predecessorId, isParallel } = body;

    // 필수 필드 검증
    if (!projectId || !name || !startDate || !endDate) {
      return NextResponse.json(
        { error: "projectId, name, startDate, endDate는 필수입니다." },
        { status: 400 }
      );
    }

    // 날짜 범위 검증
    const startDt = new Date(startDate);
    const endDt = new Date(endDate);
    if (endDt < startDt) {
      return NextResponse.json(
        { error: "종료일이 시작일보다 빠를 수 없습니다." },
        { status: 400 }
      );
    }

    // 프로젝트 존재 확인
    const project = await prisma.project.findUnique({ where: { id: projectId } });
    if (!project) {
      return NextResponse.json({ error: "프로젝트를 찾을 수 없습니다." }, { status: 404 });
    }

    // 진도 task 코드 자동 생성 (T-001, T-002, ...)
    const existingCount = await prisma.progressTask.count({ where: { projectId } });
    const code = `T-${String(existingCount + 1).padStart(3, "0")}`;

    // 선행 task 존재 확인 (존재하면)
    if (predecessorId) {
      const predecessor = await prisma.progressTask.findUnique({
        where: { id: predecessorId },
      });
      if (!predecessor || predecessor.projectId !== projectId) {
        return NextResponse.json(
          { error: "선행 task가 같은 프로젝트에 없습니다." },
          { status: 404 }
        );
      }
    }

    const task = await prisma.progressTask.create({
      data: {
        projectId,
        code,
        name,
        category: category ?? null,
        businessUnit: businessUnit ?? null,
        description: description ?? null,
        startDate: startDt,
        endDate: endDt,
        predecessorId: predecessorId ?? null,
        isParallel: typeof isParallel === "boolean" ? isParallel : true,
        order: existingCount,
      },
      include: ASSIGNEE_INCLUDE,
    });

    return NextResponse.json(task, { status: 201 });
  } catch (error) {
    console.error("진도 task 생성 실패:", error);
    return NextResponse.json(
      { error: "진도 task를 생성할 수 없습니다." },
      { status: 500 }
    );
  }
}
