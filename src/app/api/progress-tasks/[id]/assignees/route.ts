/**
 * @file src/app/api/progress-tasks/[id]/assignees/route.ts
 * @description
 * 진도 task에 담당자 추가하는 API 엔드포인트입니다.
 *
 * 초보자 가이드:
 * 1. **주요 개념**: POST 요청으로 담당자를 추가합니다. 역할(role)과 참여율(allocationPct)을 설정할 수 있습니다.
 * 2. **사용 방법**: `/api/progress-tasks/{taskId}/assignees`에 POST 요청으로 userId, role, allocationPct를 전달합니다.
 */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, assertProjectAccess } from "@/lib/auth";

interface Ctx {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/progress-tasks/[id]/assignees
 * 진도 task에 담당자 추가
 */
export async function POST(request: NextRequest, { params }: Ctx) {
  const { user, error: authError } = await requireAuth();
  if (authError) return authError;

  const { id: taskId } = await params;

  // 권한 가드: task의 projectId로 멤버십 확인
  const task = await prisma.progressTask.findUnique({
    where: { id: taskId },
    select: { projectId: true },
  });
  if (!task) {
    return NextResponse.json({ error: "task를 찾을 수 없습니다." }, { status: 404 });
  }
  const accessError = await assertProjectAccess(task.projectId, user!);
  if (accessError) return accessError;

  const { userId, role, allocationPct } = await request.json();

  if (!userId) {
    return NextResponse.json({ error: "userId가 필요합니다." }, { status: 400 });
  }

  const pct = Math.max(1, Math.min(100, Number(allocationPct ?? 100)));

  const assignee = await prisma.progressTaskAssignee.create({
    data: {
      taskId,
      userId,
      role: role ?? null,
      allocationPct: pct,
    },
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
  });

  return NextResponse.json(assignee);
}
