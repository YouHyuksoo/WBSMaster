/**
 * @file src/app/api/task-connections/[id]/route.ts
 * @description
 * 태스크 연결 개별 API
 * DELETE: 연결 삭제
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";

type RouteParams = { params: Promise<{ id: string }> };

/**
 * DELETE /api/task-connections/[id]
 * 태스크 연결 삭제
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { error } = await requireAuth();
    if (error) return error;

    const { id } = await params;

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
