import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, assertProjectAccess } from "@/lib/auth";

interface Ctx {
  params: Promise<{ id: string }>;
}

export async function GET(_request: NextRequest, { params }: Ctx) {
  const { user, error: authError } = await requireAuth();
  if (authError) return authError;

  const { id } = await params;
  const task = await prisma.progressTask.findUnique({
    where: { id },
    select: { projectId: true },
  });

  if (!task) {
    return NextResponse.json({ error: "task를 찾을 수 없습니다." }, { status: 404 });
  }

  const accessError = await assertProjectAccess(task.projectId, user!);
  if (accessError) return accessError;

  const details = await prisma.progressTaskStageDetail.findMany({
    where: { taskId: id },
    include: {
      stage: true,
      assigneeUser: { select: { id: true, name: true, email: true, avatar: true } },
    },
    orderBy: { stage: { order: "asc" } },
  });

  return NextResponse.json(details);
}
