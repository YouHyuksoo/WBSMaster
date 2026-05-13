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
import { STAGE_ORDER } from "@/lib/progress-stages";

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
    const idx = STAGE_ORDER.indexOf(body.currentStage);
    if (idx >= 0) {
      data.progress = Math.round(((idx + 1) / 9) * 100);
    }
  }

  // predecessorId 변경 시 순환 의존성 검증 (서버 사이드)
  if (body.predecessorId !== undefined && body.predecessorId !== null) {
    // 1) 자기 자신 선행 방지
    if (body.predecessorId === id) {
      return NextResponse.json(
        { error: "자기 자신을 선행 task로 지정할 수 없습니다." },
        { status: 400 }
      );
    }

    // 2) 같은 프로젝트의 모든 task를 가져와 순환 탐지
    const target = await prisma.progressTask.findUnique({
      where: { id },
      select: { projectId: true },
    });
    if (!target) {
      return NextResponse.json({ error: "task not found" }, { status: 404 });
    }

    const all = await prisma.progressTask.findMany({
      where: { projectId: target.projectId },
      select: { id: true, predecessorId: true },
    });

    // 3) BFS로 무효 선행 집합 계산 (PredecessorSelect와 동일 알고리즘)
    const invalid = new Set<string>([id]);
    let changed = true;
    while (changed) {
      changed = false;
      for (const t of all) {
        if (!invalid.has(t.id) && t.predecessorId && invalid.has(t.predecessorId)) {
          invalid.add(t.id);
          changed = true;
        }
      }
    }

    if (invalid.has(body.predecessorId)) {
      return NextResponse.json(
        { error: "순환 의존성이 발생합니다. 다른 선행 task를 선택하세요." },
        { status: 400 }
      );
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
