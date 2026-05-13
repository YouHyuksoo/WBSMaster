/**
 * @file src/app/api/progress-tasks/[id]/route.ts
 * @description
 * 진도 task — 단건 조회 / 수정(인라인 편집) / 삭제
 *
 * 초보자 가이드:
 * 1. **단건 조회 (GET)**: 특정 task 상세 조회
 * 2. **수정 (PATCH)**: 부분 업데이트, currentStage 변경 시 progress 자동 재계산
 * 3. **삭제 (DELETE)**: task 삭제 (선행 관계는 자동으로 해제됨)
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";

const ASSIGNEE_INCLUDE = {
  assignees: {
    include: { user: { select: { id: true, name: true, email: true, avatar: true } } },
  },
} as const;

interface Ctx {
  params: Promise<{ id: string }>;
}

/** GET /api/progress-tasks/[id] */
export async function GET(request: NextRequest, { params }: Ctx) {
  const { error: authError } = await requireAuth();
  if (authError) return authError;

  const { id } = await params;
  const task = await prisma.progressTask.findUnique({
    where: { id },
    include: ASSIGNEE_INCLUDE,
  });

  if (!task) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(task);
}

/** PATCH /api/progress-tasks/[id] */
export async function PATCH(request: NextRequest, { params }: Ctx) {
  const { error: authError } = await requireAuth();
  if (authError) return authError;

  const { id } = await params;
  const body = await request.json();

  const data: Record<string, unknown> = {};

  if (body.name !== undefined) data.name = body.name;
  if (body.category !== undefined) data.category = body.category;
  if (body.description !== undefined) data.description = body.description;
  if (body.startDate !== undefined) data.startDate = new Date(body.startDate);
  if (body.endDate !== undefined) data.endDate = new Date(body.endDate);
  if (body.actualStartDate !== undefined)
    data.actualStartDate = body.actualStartDate
      ? new Date(body.actualStartDate)
      : null;
  if (body.actualEndDate !== undefined)
    data.actualEndDate = body.actualEndDate ? new Date(body.actualEndDate) : null;
  if (body.currentStage !== undefined) data.currentStage = body.currentStage;
  if (body.status !== undefined) data.status = body.status;
  if (body.predecessorId !== undefined) data.predecessorId = body.predecessorId;
  if (body.effortMd !== undefined) data.effortMd = body.effortMd;
  if (body.order !== undefined) data.order = body.order;

  // currentStage가 바뀌면 progress 자동 재계산
  if (body.currentStage !== undefined) {
    const STAGE_ORDER = [
      "ANALYSIS",
      "DESIGN",
      "IMPLEMENTATION",
      "UNIT_TEST",
      "IT_TEST",
      "TRAINING",
      "INTEGRATION_TEST",
      "MIGRATION",
      "STABILIZATION",
    ];
    const idx = STAGE_ORDER.indexOf(body.currentStage);
    if (idx >= 0) {
      data.progress = Math.round(((idx + 1) / 9) * 100);
    }
  }

  const task = await prisma.progressTask.update({
    where: { id },
    data,
    include: ASSIGNEE_INCLUDE,
  });

  return NextResponse.json(task);
}

/** DELETE /api/progress-tasks/[id] */
export async function DELETE(request: NextRequest, { params }: Ctx) {
  const { error: authError } = await requireAuth();
  if (authError) return authError;

  const { id } = await params;
  await prisma.progressTask.delete({
    where: { id },
  });

  return NextResponse.json({ message: "Deleted" });
}
