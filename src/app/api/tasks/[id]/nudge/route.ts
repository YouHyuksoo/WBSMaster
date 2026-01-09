/**
 * @file src/app/api/tasks/[id]/nudge/route.ts
 * @description
 * 태스크 재촉 API 엔드포인트입니다.
 * 다른 사람의 태스크에 재촉을 보낼 수 있습니다.
 *
 * 기능:
 * - POST: 재촉 보내기
 * - GET: 재촉 목록 조회
 * - DELETE: 재촉 취소 (본인이 보낸 것만)
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUser } from "@/lib/auth";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/tasks/[id]/nudge
 * 태스크의 재촉 목록 조회
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: taskId } = await params;

    const nudges = await prisma.taskNudge.findMany({
      where: { taskId },
      include: {
        nudger: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(nudges);
  } catch (error) {
    console.error("재촉 목록 조회 실패:", error);
    return NextResponse.json(
      { error: "재촉 목록 조회에 실패했습니다." },
      { status: 500 }
    );
  }
}

/**
 * POST /api/tasks/[id]/nudge
 * 태스크에 재촉 보내기
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json(
        { error: "로그인이 필요합니다." },
        { status: 401 }
      );
    }

    const { id: taskId } = await params;
    const body = await request.json().catch(() => ({}));
    const { message } = body;

    // 태스크 존재 확인
    const task = await prisma.task.findUnique({
      where: { id: taskId },
      include: {
        assignee: true,
        assignees: true,
      },
    });

    if (!task) {
      return NextResponse.json(
        { error: "태스크를 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    // 본인 태스크에는 재촉 불가
    const isMyTask =
      task.assigneeId === user.id ||
      task.assignees.some((a) => a.userId === user.id);

    if (isMyTask) {
      return NextResponse.json(
        { error: "본인의 태스크에는 재촉할 수 없습니다." },
        { status: 400 }
      );
    }

    // 이미 재촉한 경우 중복 방지 (24시간 내)
    const existingNudge = await prisma.taskNudge.findFirst({
      where: {
        taskId,
        nudgerId: user.id,
        createdAt: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000), // 24시간 이내
        },
      },
    });

    if (existingNudge) {
      return NextResponse.json(
        { error: "24시간 내에 이미 재촉했습니다." },
        { status: 400 }
      );
    }

    // 재촉 생성
    const nudge = await prisma.taskNudge.create({
      data: {
        taskId,
        nudgerId: user.id,
        message: message || null,
      },
      include: {
        nudger: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true,
          },
        },
      },
    });

    return NextResponse.json(nudge, { status: 201 });
  } catch (error) {
    console.error("재촉 보내기 실패:", error);
    return NextResponse.json(
      { error: "재촉 보내기에 실패했습니다." },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/tasks/[id]/nudge
 * 본인이 보낸 재촉 취소
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json(
        { error: "로그인이 필요합니다." },
        { status: 401 }
      );
    }

    const { id: taskId } = await params;

    // 본인이 보낸 재촉만 삭제
    const deleted = await prisma.taskNudge.deleteMany({
      where: {
        taskId,
        nudgerId: user.id,
      },
    });

    if (deleted.count === 0) {
      return NextResponse.json(
        { error: "삭제할 재촉이 없습니다." },
        { status: 404 }
      );
    }

    return NextResponse.json({ message: "재촉이 취소되었습니다." });
  } catch (error) {
    console.error("재촉 취소 실패:", error);
    return NextResponse.json(
      { error: "재촉 취소에 실패했습니다." },
      { status: 500 }
    );
  }
}
