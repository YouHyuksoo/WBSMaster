/**
 * @file src/app/api/task-connections/route.ts
 * @description
 * 태스크 연결 API (플로우 차트용)
 * GET: 연결 목록 조회
 * POST: 연결 생성
 *
 * 초보자 가이드:
 * - 인증: requireAuth + assertProjectAccess (프로젝트 멤버 · ADMIN 만)
 * - POST 의 fromTaskId · toTaskId 는 둘 다 같은 프로젝트 태스크여야 한다
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, assertProjectAccess } from "@/lib/auth";

/**
 * GET /api/task-connections
 * 태스크 연결 목록 조회
 */
export async function GET(request: NextRequest) {
  try {
    const { user, error } = await requireAuth();
    if (error) return error;

    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get("projectId");

    if (!projectId) {
      return NextResponse.json(
        { error: "projectId is required" },
        { status: 400 }
      );
    }

    const denied = await assertProjectAccess(projectId, user!);
    if (denied) return denied;

    const connections = await prisma.taskConnection.findMany({
      where: { projectId },
      include: {
        fromTask: {
          select: { id: true, title: true, status: true },
        },
        toTask: {
          select: { id: true, title: true, status: true },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json(connections);
  } catch (error) {
    console.error("[GET /api/task-connections] Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch task connections" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/task-connections
 * 태스크 연결 생성
 */
export async function POST(request: NextRequest) {
  try {
    const { user, error } = await requireAuth();
    if (error) return error;

    const body = await request.json();
    const {
      fromTaskId,
      toTaskId,
      projectId,
      type = "FLOW",
      label,
      color,
      animated = false,
      sourceHandle,
      targetHandle,
    } = body;

    if (!fromTaskId || !toTaskId || !projectId) {
      return NextResponse.json(
        { error: "fromTaskId, toTaskId, projectId are required" },
        { status: 400 }
      );
    }

    const denied = await assertProjectAccess(projectId, user!);
    if (denied) return denied;

    // 두 태스크 모두 같은 프로젝트 것이어야 한다
    const sameProjectTasks = await prisma.task.count({
      where: { id: { in: [fromTaskId, toTaskId] }, projectId },
    });
    if (sameProjectTasks !== (fromTaskId === toTaskId ? 1 : 2)) {
      return NextResponse.json(
        { error: "연결할 태스크가 같은 프로젝트에 없습니다." },
        { status: 400 }
      );
    }

    // 같은 태스크끼리 연결 방지
    if (fromTaskId === toTaskId) {
      return NextResponse.json(
        { error: "같은 태스크끼리는 연결할 수 없습니다." },
        { status: 400 }
      );
    }

    // 중복 연결 확인
    const existing = await prisma.taskConnection.findFirst({
      where: { fromTaskId, toTaskId },
    });

    if (existing) {
      return NextResponse.json(
        { error: "이미 존재하는 연결입니다." },
        { status: 400 }
      );
    }

    const connection = await prisma.taskConnection.create({
      data: {
        fromTaskId,
        toTaskId,
        projectId,
        type,
        label,
        color,
        animated,
        sourceHandle,
        targetHandle,
      },
      include: {
        fromTask: {
          select: { id: true, title: true, status: true },
        },
        toTask: {
          select: { id: true, title: true, status: true },
        },
      },
    });

    return NextResponse.json(connection, { status: 201 });
  } catch (error) {
    console.error("[POST /api/task-connections] Error:", error);
    return NextResponse.json(
      { error: "Failed to create task connection" },
      { status: 500 }
    );
  }
}
