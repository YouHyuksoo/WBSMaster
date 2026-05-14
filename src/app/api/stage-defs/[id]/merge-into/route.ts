/**
 * @file src/app/api/stage-defs/[id]/merge-into/route.ts
 * @description 단계 합치기 — source의 task를 target으로 이동 후 source 삭제
 *
 * 동작 (트랜잭션):
 * 1. source와 target이 같은 projectId + category인지 검증 (다르면 400)
 * 2. source를 currentStageId로 가진 모든 task를 target으로 update
 * 3. source 삭제
 * 4. 같은 카테고리의 뒤 항목 order -1 (gap 메우기)
 *
 * 권한: ADMIN 또는 그 프로젝트의 OWNER/MANAGER
 */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { computeStageProgress } from "@/lib/stage-categories";

interface Ctx {
  params: Promise<{ id: string }>;
}

export async function POST(request: NextRequest, { params }: Ctx) {
  const { user, error: authError } = await requireAuth();
  if (authError) return authError;

  const { id: sourceId } = await params;
  const body = await request.json();
  const { targetStageId } = body as { targetStageId: string };

  if (!targetStageId) {
    return NextResponse.json({ error: "targetStageId가 필요합니다." }, { status: 400 });
  }
  if (sourceId === targetStageId) {
    return NextResponse.json({ error: "자기 자신과 합칠 수 없습니다." }, { status: 400 });
  }

  const source = await prisma.progressStageDef.findUnique({
    where: { id: sourceId },
    select: { id: true, projectId: true, category: true, order: true, name: true },
  });
  const target = await prisma.progressStageDef.findUnique({
    where: { id: targetStageId },
    select: { id: true, projectId: true, category: true },
  });
  if (!source || !target) {
    return NextResponse.json({ error: "단계를 찾을 수 없습니다." }, { status: 404 });
  }
  if (source.projectId !== target.projectId || source.category !== target.category) {
    return NextResponse.json(
      { error: "같은 프로젝트의 같은 카테고리 내 단계만 합칠 수 있습니다." },
      { status: 400 }
    );
  }

  // 권한: ADMIN 또는 OWNER/MANAGER
  if (user!.role !== "ADMIN") {
    const myMembership = await prisma.teamMember.findUnique({
      where: { projectId_userId: { projectId: source.projectId, userId: user!.id } },
      select: { role: true },
    });
    if (!myMembership || (myMembership.role !== "OWNER" && myMembership.role !== "MANAGER")) {
      return NextResponse.json({ error: "단계를 합칠 권한이 없습니다." }, { status: 403 });
    }
  }

  const result = await prisma.$transaction(async (tx) => {
    // 0. target 단계 위치 기준 progress 미리 계산
    //    (source는 곧 삭제되지만 target은 그대로이므로 source 삭제 전 stages 목록 사용해도 target의 상대 위치 동일)
    const stagesPreDelete = await tx.progressStageDef.findMany({
      where: { projectId: source.projectId, category: source.category },
      select: { id: true, order: true },
      orderBy: { order: "asc" },
    });
    // source를 제외한 단계 목록으로 target의 새 진척률 계산
    const stagesAfterMerge = stagesPreDelete.filter((s) => s.id !== sourceId);
    const newProgress = computeStageProgress(stagesAfterMerge, targetStageId);

    // 1. source를 currentStageId로 가진 task들 target으로 이동 + progress 재계산
    const updated = await tx.progressTask.updateMany({
      where: { currentStageId: sourceId },
      data: { currentStageId: targetStageId, progress: newProgress },
    });

    // 2. source 삭제
    await tx.progressStageDef.delete({ where: { id: sourceId } });

    // 3. 뒤 항목 order -1 (gap 메우기) — 임시 음수 영역으로 충돌 회피
    const toShift = await tx.progressStageDef.findMany({
      where: { projectId: source.projectId, category: source.category, order: { gt: source.order } },
      select: { id: true, order: true },
      orderBy: { order: "asc" },
    });
    for (const s of toShift) {
      await tx.progressStageDef.update({ where: { id: s.id }, data: { order: -(s.order + 5000) } });
    }
    for (const s of toShift) {
      await tx.progressStageDef.update({ where: { id: s.id }, data: { order: s.order - 1 } });
    }

    // 4. shift 후 남은 단계 목록으로 같은 카테고리의 모든 task progress 일괄 재계산
    //    (target 이외 단계의 task들도 shift로 인해 단계 순서 변경 → 진척률 영향)
    const finalStages = await tx.progressStageDef.findMany({
      where: { projectId: source.projectId, category: source.category },
      select: { id: true, order: true },
      orderBy: { order: "asc" },
    });
    const tasksInCategory = await tx.progressTask.findMany({
      where: { projectId: source.projectId, stageCategory: source.category, currentStageId: { not: null } },
      select: { id: true, currentStageId: true },
    });
    for (const t of tasksInCategory) {
      const p = computeStageProgress(finalStages, t.currentStageId);
      await tx.progressTask.update({ where: { id: t.id }, data: { progress: p } });
    }

    return { movedTaskCount: updated.count };
  });

  return NextResponse.json(result);
}
