import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, assertProjectAccess } from "@/lib/auth";

interface Ctx {
  params: Promise<{ id: string; stageId: string }>;
}

export async function PATCH(request: NextRequest, { params }: Ctx) {
  const { user, error: authError } = await requireAuth();
  if (authError) return authError;

  const { id, stageId } = await params;
  const task = await prisma.progressTask.findUnique({
    where: { id },
    select: { projectId: true },
  });

  if (!task) {
    return NextResponse.json({ error: "task를 찾을 수 없습니다." }, { status: 404 });
  }

  const accessError = await assertProjectAccess(task.projectId, user!);
  if (accessError) return accessError;

  const stage = await prisma.progressStageDef.findUnique({
    where: { id: stageId },
    select: { projectId: true },
  });

  if (!stage || stage.projectId !== task.projectId) {
    return NextResponse.json({ error: "같은 프로젝트의 단계가 아닙니다." }, { status: 400 });
  }

  const body = await request.json();
  const assigneeUserId = nullableText(body.assigneeUserId);
  const status = parseStatus(body.status);
  if (!status) {
    return NextResponse.json({ error: "Invalid status." }, { status: 400 });
  }

  if (assigneeUserId) {
    const assignee = await prisma.user.findUnique({
      where: { id: assigneeUserId },
      select: { id: true },
    });
    if (!assignee) {
      return NextResponse.json({ error: "담당자를 찾을 수 없습니다." }, { status: 400 });
    }
  }

  const detail = await prisma.progressTaskStageDetail.upsert({
    where: { taskId_stageId: { taskId: id, stageId } },
    create: {
      taskId: id,
      stageId,
      status,
      description: nullableText(body.description),
      issue: nullableText(body.issue),
      assigneeUserId,
    },
    update: {
      status,
      ...(body.description !== undefined ? { description: nullableText(body.description) } : {}),
      ...(body.issue !== undefined ? { issue: nullableText(body.issue) } : {}),
      ...(body.assigneeUserId !== undefined ? { assigneeUserId } : {}),
    },
    include: {
      stage: true,
      assigneeUser: { select: { id: true, name: true, email: true, avatar: true } },
    },
  });

  return NextResponse.json(detail);
}

function nullableText(value: unknown): string | null {
  const text = String(value ?? "").trim();
  return text || null;
}

function parseStatus(value: unknown): "PENDING" | "IN_PROGRESS" | "COMPLETED" | null {
  const status = String(value ?? "PENDING");
  if (status === "PENDING" || status === "IN_PROGRESS" || status === "COMPLETED") return status;
  return null;
}
