/**
 * @file src/app/api/stage-defs/[id]/route.ts
 * @description 단계 정의 수정/삭제
 *
 * 초보자 가이드:
 * 1. **PATCH**: 이름/순서 변경. 순서 변경 시 같은 카테고리 내 다른 항목 자동 shift
 * 2. **DELETE**: 단계 삭제. 사용 중인 task의 currentStageId는 onDelete:SetNull로 자동 처리
 *    삭제 후 같은 카테고리의 뒤 항목들 order -1 (gap 메우기)
 * 3. **권한**: ADMIN 또는 그 프로젝트의 OWNER/MANAGER
 */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, type AuthUser } from "@/lib/auth";

interface Ctx {
  params: Promise<{ id: string }>;
}

/** 단계 관리 권한 체크: ADMIN 또는 OWNER/MANAGER */
async function requireStageManageAccess(stageId: string, user: AuthUser) {
  const stage = await prisma.progressStageDef.findUnique({
    where: { id: stageId },
    select: { id: true, projectId: true, category: true, order: true },
  });
  if (!stage) {
    return { stage: null, error: NextResponse.json({ error: "단계를 찾을 수 없습니다." }, { status: 404 }) };
  }
  if (user.role !== "ADMIN") {
    const myMembership = await prisma.teamMember.findUnique({
      where: { projectId_userId: { projectId: stage.projectId, userId: user.id } },
      select: { role: true },
    });
    if (!myMembership || (myMembership.role !== "OWNER" && myMembership.role !== "MANAGER")) {
      return { stage, error: NextResponse.json({ error: "단계를 수정할 권한이 없습니다." }, { status: 403 }) };
    }
  }
  return { stage, error: null };
}

/** PATCH /api/stage-defs/[id] body: { name?, order? } */
export async function PATCH(request: NextRequest, { params }: Ctx) {
  const { user, error: authError } = await requireAuth();
  if (authError) return authError;

  const { id } = await params;
  const { stage, error: accessError } = await requireStageManageAccess(id, user!);
  if (accessError) return accessError;

  const body = await request.json();
  const { name, order } = body as { name?: string; order?: number };

  // order 변경 시 같은 카테고리 내 재정렬 (트랜잭션 + 임시 음수 영역)
  if (order !== undefined && order !== stage!.order) {
    await prisma.$transaction(async (tx) => {
      // 1) 현재 단계를 임시 음수로 옮김 (unique 충돌 회피)
      await tx.progressStageDef.update({ where: { id }, data: { order: -1000 } });

      if (order > stage!.order) {
        // 위로 이동: stage!.order+1 ~ order 범위 항목들 -1
        const toShift = await tx.progressStageDef.findMany({
          where: { projectId: stage!.projectId, category: stage!.category, order: { gt: stage!.order, lte: order } },
          select: { id: true, order: true },
          orderBy: { order: "asc" },
        });
        for (const s of toShift) {
          await tx.progressStageDef.update({ where: { id: s.id }, data: { order: -(s.order + 2000) } });
        }
        for (const s of toShift) {
          await tx.progressStageDef.update({ where: { id: s.id }, data: { order: s.order - 1 } });
        }
      } else {
        // 아래로 이동: order ~ stage!.order-1 범위 항목들 +1
        const toShift = await tx.progressStageDef.findMany({
          where: { projectId: stage!.projectId, category: stage!.category, order: { gte: order, lt: stage!.order } },
          select: { id: true, order: true },
          orderBy: { order: "desc" },
        });
        for (const s of toShift) {
          await tx.progressStageDef.update({ where: { id: s.id }, data: { order: -(s.order + 2000) } });
        }
        for (const s of toShift) {
          await tx.progressStageDef.update({ where: { id: s.id }, data: { order: s.order + 1 } });
        }
      }

      // 2) 현재 단계를 새 order로 옮김
      await tx.progressStageDef.update({ where: { id }, data: { order } });
    });
  }

  // 이름 변경
  if (name !== undefined && name.trim() !== "") {
    // 같은 카테고리 내 중복 체크
    const existing = await prisma.progressStageDef.findUnique({
      where: {
        projectId_category_name: { projectId: stage!.projectId, category: stage!.category, name: name.trim() },
      },
    });
    if (existing && existing.id !== id) {
      return NextResponse.json({ error: "이미 존재하는 단계명입니다." }, { status: 400 });
    }
    await prisma.progressStageDef.update({ where: { id }, data: { name: name.trim() } });
  }

  const updated = await prisma.progressStageDef.findUnique({ where: { id } });
  return NextResponse.json(updated);
}

/** DELETE /api/stage-defs/[id] */
export async function DELETE(request: NextRequest, { params }: Ctx) {
  const { user, error: authError } = await requireAuth();
  if (authError) return authError;

  const { id } = await params;
  const { stage, error: accessError } = await requireStageManageAccess(id, user!);
  if (accessError) return accessError;

  // 삭제 + 뒤 항목 order -1 (트랜잭션)
  await prisma.$transaction(async (tx) => {
    await tx.progressStageDef.delete({ where: { id } });
    // 뒤 항목들을 임시로 음수로 옮긴 뒤 -1 (unique 충돌 회피)
    const toShift = await tx.progressStageDef.findMany({
      where: { projectId: stage!.projectId, category: stage!.category, order: { gt: stage!.order } },
      select: { id: true, order: true },
      orderBy: { order: "asc" },
    });
    for (const s of toShift) {
      await tx.progressStageDef.update({ where: { id: s.id }, data: { order: -(s.order + 3000) } });
    }
    for (const s of toShift) {
      await tx.progressStageDef.update({ where: { id: s.id }, data: { order: s.order - 1 } });
    }
  });

  return NextResponse.json({ message: "삭제됨" });
}
