/**
 * @file src/app/api/task-connections/[id]/route.ts
 * @description
 * 태스크 연결 개별 API
 * DELETE: 연결 삭제
 *
 * 초보자 가이드:
 * - 인증: requireAuth + assertProjectAccess (연결의 projectId 기준, 프로젝트 멤버 · ADMIN 만)
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, assertProjectAccess } from "@/lib/auth";

type RouteParams = { params: Promise<{ id: string }> };

/**
 * DELETE /api/task-connections/[id]
 * 태스크 연결 삭제
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { user, error } = await requireAuth();
    if (error) return error;

    const { id } = await params;

    const existing = await prisma.taskConnection.findUnique({
      where: { id },
      select: { projectId: true },
    });
    if (!existing) {
      return NextResponse.json(
        { error: "연결을 찾을 수 없습니다." },
        { status: 404 }
      );
    }
    const denied = await assertProjectAccess(existing.projectId, user!);
    if (denied) return denied;

    await prisma.taskConnection.delete({
      where: { id },
    });

    return NextResponse.json({ message: "Connection deleted" });
  } catch (error) {
    console.error("[DELETE /api/task-connections/[id]] Error:", error);
    return NextResponse.json(
      { error: "Failed to delete task connection" },
      { status: 500 }
    );
  }
}
