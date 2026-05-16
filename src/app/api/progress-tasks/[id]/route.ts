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
import { requireAuth, assertProjectAccess } from "@/lib/auth";
import { computeStageProgress } from "@/lib/stage-categories";

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
  const { user, error: authError } = await requireAuth();
  if (authError) return authError;

  const { id } = await params;
  const task = await prisma.progressTask.findUnique({
    where: { id },
    include: ASSIGNEE_INCLUDE,
  });

  if (!task) {
    return NextResponse.json({ error: "task를 찾을 수 없습니다." }, { status: 404 });
  }

  const accessError = await assertProjectAccess(task.projectId, user!);
  if (accessError) return accessError;

  return NextResponse.json(task);
}

/** PATCH /api/progress-tasks/[id] */
export async function PATCH(request: NextRequest, { params }: Ctx) {
  const { user, error: authError } = await requireAuth();
  if (authError) return authError;

  const { id } = await params;

  // 권한 가드: task의 projectId를 먼저 조회해 멤버십 확인
  const existing = await prisma.progressTask.findUnique({
    where: { id },
    select: { projectId: true, stageCategory: true, currentStageId: true },
  });
  if (!existing) {
    return NextResponse.json({ error: "task를 찾을 수 없습니다." }, { status: 404 });
  }
  const patchAccessError = await assertProjectAccess(existing.projectId, user!);
  if (patchAccessError) return patchAccessError;

  const body = await request.json();

  const data: Record<string, unknown> = {};

  if (body.name !== undefined) data.name = body.name;
  if (body.category !== undefined) data.category = body.category;
  if (body.businessUnit !== undefined) data.businessUnit = body.businessUnit;
  if (body.description !== undefined) data.description = body.description;
  if (body.startDate !== undefined) data.startDate = new Date(body.startDate);
  if (body.endDate !== undefined) data.endDate = new Date(body.endDate);
  if (body.actualStartDate !== undefined)
    data.actualStartDate = body.actualStartDate
      ? new Date(body.actualStartDate)
      : null;
  if (body.actualEndDate !== undefined)
    data.actualEndDate = body.actualEndDate ? new Date(body.actualEndDate) : null;
  if (body.stageCategory !== undefined) data.stageCategory = body.stageCategory;
  if (body.currentStageId !== undefined) data.currentStageId = body.currentStageId;
  if (body.status !== undefined) data.status = body.status;
  if (body.predecessorId !== undefined) data.predecessorId = body.predecessorId;
  if (body.effortMd !== undefined) data.effortMd = body.effortMd;
  if (body.order !== undefined) data.order = body.order;
  if (body.isParallel !== undefined) data.isParallel = !!body.isParallel;

  // stageCategory 또는 currentStageId 변경 시 progress 재계산
  if (body.stageCategory !== undefined || body.currentStageId !== undefined) {
    const finalCategory = (body.stageCategory ?? existing!.stageCategory) as never;
    let finalStageId: string | null =
      body.currentStageId !== undefined ? (body.currentStageId as string | null) : existing!.currentStageId;

    // 카테고리가 바뀐 경우 currentStageId가 새 카테고리에 속하는지 검증
    if (body.stageCategory !== undefined && finalStageId) {
      const stage = await prisma.progressStageDef.findUnique({
        where: { id: finalStageId },
        select: { category: true },
      });
      if (!stage || stage.category !== finalCategory) {
        finalStageId = null;
        data.currentStageId = null;
      }
    }

    // 해당 카테고리의 단계 목록으로 progress 계산
    const stages = await prisma.progressStageDef.findMany({
      where: { projectId: existing!.projectId, category: finalCategory },
      select: { id: true, order: true },
      orderBy: { order: "asc" },
    });
    data.progress = computeStageProgress(stages, finalStageId);
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

    // 2) 같은 프로젝트의 모든 task를 가져와 순환 탐지 (projectId는 상단 existing에서 확보)
    const all = await prisma.progressTask.findMany({
      where: { projectId: existing.projectId },
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

  // 날짜 변경 시 startDate ≤ endDate 검증
  const willUpdateStart = body.startDate !== undefined;
  const willUpdateEnd = body.endDate !== undefined;
  if (willUpdateStart || willUpdateEnd) {
    const dateCheck = await prisma.progressTask.findUnique({
      where: { id },
      select: { startDate: true, endDate: true },
    });
    if (dateCheck) {
      const newStart = willUpdateStart ? new Date(body.startDate) : dateCheck.startDate;
      const newEnd = willUpdateEnd ? new Date(body.endDate) : dateCheck.endDate;
      if (willUpdateEnd && !willUpdateStart && newEnd < newStart) {
        data.startDate = newEnd;
      } else if (newEnd < newStart) {
        return NextResponse.json(
          { error: "목표일자가 내부 시작일보다 빠를 수 없습니다." },
          { status: 400 }
        );
      }
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
  const { user, error: authError } = await requireAuth();
  if (authError) return authError;

  const { id } = await params;

  // 권한 가드: task의 projectId로 멤버십 확인
  const target = await prisma.progressTask.findUnique({
    where: { id },
    select: { projectId: true },
  });
  if (!target) {
    return NextResponse.json({ error: "task를 찾을 수 없습니다." }, { status: 404 });
  }

  const accessError = await assertProjectAccess(target.projectId, user!);
  if (accessError) return accessError;

  await prisma.progressTask.delete({
    where: { id },
  });

  return NextResponse.json({ message: "Deleted" });
}
