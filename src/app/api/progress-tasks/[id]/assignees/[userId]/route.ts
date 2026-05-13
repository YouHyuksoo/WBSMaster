/**
 * @file src/app/api/progress-tasks/[id]/assignees/[userId]/route.ts
 * @description
 * 진도 task 담당자를 수정하거나 삭제하는 API 엔드포인트입니다.
 *
 * 초보자 가이드:
 * 1. **PATCH**: 담당자의 역할(role)이나 참여율(allocationPct)을 수정합니다.
 * 2. **DELETE**: 담당자를 제거합니다.
 * 3. **사용 방법**: `/api/progress-tasks/{taskId}/assignees/{userId}`에 요청합니다.
 */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";

interface Ctx {
  params: Promise<{ id: string; userId: string }>;
}

/**
 * PATCH /api/progress-tasks/[id]/assignees/[userId]
 * 진도 task 담당자 정보 수정
 */
export async function PATCH(request: NextRequest, { params }: Ctx) {
  const { error: authError } = await requireAuth();
  if (authError) return authError;

  const { id: taskId, userId } = await params;
  const { role, allocationPct } = await request.json();

  const data: Record<string, unknown> = {};
  if (role !== undefined) data.role = role;
  if (allocationPct !== undefined) {
    data.allocationPct = Math.max(1, Math.min(100, Number(allocationPct)));
  }

  const updated = await prisma.progressTaskAssignee.update({
    where: { taskId_userId: { taskId, userId } },
    data,
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

  return NextResponse.json(updated);
}

/**
 * DELETE /api/progress-tasks/[id]/assignees/[userId]
 * 진도 task 담당자 제거
 */
export async function DELETE(request: NextRequest, { params }: Ctx) {
  const { error: authError } = await requireAuth();
  if (authError) return authError;

  const { id: taskId, userId } = await params;

  await prisma.progressTaskAssignee.delete({
    where: { taskId_userId: { taskId, userId } },
  });

  return NextResponse.json({ message: "Deleted" });
}
