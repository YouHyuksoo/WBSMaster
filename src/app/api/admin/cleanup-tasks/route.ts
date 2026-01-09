/**
 * @file src/app/api/admin/cleanup-tasks/route.ts
 * @description
 * HOLDING, DELAYED 상태의 태스크를 정리하는 관리자 API입니다.
 *
 * 사용법:
 * DELETE /api/admin/cleanup-tasks
 */

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * DELETE /api/admin/cleanup-tasks
 * HOLDING, DELAYED 상태의 태스크 삭제
 */
export async function DELETE() {
  try {
    // 삭제 전 조회
    const tasksToDelete = await prisma.task.findMany({
      where: { status: { in: ["HOLDING", "DELAYED"] } },
      select: { id: true, title: true, status: true },
    });

    console.log("삭제 대상 태스크:", tasksToDelete);

    if (tasksToDelete.length === 0) {
      return NextResponse.json({
        message: "삭제할 태스크가 없습니다.",
        deleted: 0,
      });
    }

    // 삭제 실행
    const result = await prisma.task.deleteMany({
      where: { status: { in: ["HOLDING", "DELAYED"] } },
    });

    return NextResponse.json({
      message: `${result.count}개의 태스크가 삭제되었습니다.`,
      deleted: result.count,
      deletedTasks: tasksToDelete,
    });
  } catch (error) {
    console.error("태스크 정리 실패:", error);
    return NextResponse.json(
      { error: "태스크 정리에 실패했습니다." },
      { status: 500 }
    );
  }
}

/**
 * GET /api/admin/cleanup-tasks
 * HOLDING, DELAYED 상태의 태스크 조회 (삭제 전 확인용)
 */
export async function GET() {
  try {
    const tasks = await prisma.task.findMany({
      where: { status: { in: ["HOLDING", "DELAYED"] } },
      select: { id: true, title: true, status: true, createdAt: true },
    });

    return NextResponse.json({
      count: tasks.length,
      tasks,
    });
  } catch (error) {
    console.error("태스크 조회 실패:", error);
    return NextResponse.json(
      { error: "태스크 조회에 실패했습니다." },
      { status: 500 }
    );
  }
}
