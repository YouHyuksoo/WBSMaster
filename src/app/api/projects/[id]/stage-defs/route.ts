/**
 * @file src/app/api/projects/[id]/stage-defs/route.ts
 * @description 프로젝트의 진도 단계 정의 목록 조회 / 추가
 *
 * 초보자 가이드:
 * 1. **GET**: 멤버 또는 ADMIN이면 조회 가능
 * 2. **POST**: ADMIN 또는 그 프로젝트의 OWNER/MANAGER만 추가 가능
 * 3. **order**: 미지정 시 마지막+1, 지정 시 같은 order 이상의 항목 +1 shift
 */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, assertProjectAccess } from "@/lib/auth";
import type { StageCategory } from "@/lib/stage-categories";

interface Ctx {
  params: Promise<{ id: string }>;
}

/** GET /api/projects/[id]/stage-defs?category=... */
export async function GET(request: NextRequest, { params }: Ctx) {
  const { user, error: authError } = await requireAuth();
  if (authError) return authError;

  const { id: projectId } = await params;
  const accessError = await assertProjectAccess(projectId, user!);
  if (accessError) return accessError;

  const { searchParams } = new URL(request.url);
  const category = searchParams.get("category") as StageCategory | null;

  const where: { projectId: string; category?: StageCategory } = { projectId };
  if (category) where.category = category;

  const stageDefs = await prisma.progressStageDef.findMany({
    where,
    orderBy: [{ category: "asc" }, { order: "asc" }],
  });

  return NextResponse.json(stageDefs);
}

/** POST /api/projects/[id]/stage-defs body: { category, name, order? } */
export async function POST(request: NextRequest, { params }: Ctx) {
  const { user, error: authError } = await requireAuth();
  if (authError) return authError;

  const { id: projectId } = await params;

  // 단계 추가는 ADMIN 또는 OWNER/MANAGER만 가능
  if (user!.role !== "ADMIN") {
    const myMembership = await prisma.teamMember.findUnique({
      where: { projectId_userId: { projectId, userId: user!.id } },
      select: { role: true },
    });
    if (!myMembership || (myMembership.role !== "OWNER" && myMembership.role !== "MANAGER")) {
      return NextResponse.json({ error: "단계를 추가할 권한이 없습니다." }, { status: 403 });
    }
  }

  const body = await request.json();
  const { category, name, order } = body as { category: StageCategory; name: string; order?: number };

  if (!category || !name?.trim()) {
    return NextResponse.json({ error: "category와 name은 필수입니다." }, { status: 400 });
  }

  // 같은 카테고리 내 중복 이름 체크
  const existing = await prisma.progressStageDef.findUnique({
    where: { projectId_category_name: { projectId, category, name: name.trim() } },
  });
  if (existing) {
    return NextResponse.json({ error: "이미 존재하는 단계명입니다." }, { status: 400 });
  }

  // order 결정
  let finalOrder = order;
  if (finalOrder === undefined || finalOrder === null) {
    const last = await prisma.progressStageDef.findFirst({
      where: { projectId, category },
      orderBy: { order: "desc" },
      select: { order: true },
    });
    finalOrder = last ? last.order + 1 : 0;
  } else {
    // 지정 시: 같은 order 이상의 항목을 임시 음수로 옮긴 뒤 +1 shift로 unique 충돌 회피
    await prisma.$transaction(async (tx) => {
      const toShift = await tx.progressStageDef.findMany({
        where: { projectId, category, order: { gte: finalOrder! } },
        select: { id: true, order: true },
      });
      // 임시로 음수 영역에 옮김 (unique 충돌 방지)
      for (const s of toShift) {
        await tx.progressStageDef.update({ where: { id: s.id }, data: { order: -(s.order + 100) } });
      }
      for (const s of toShift) {
        await tx.progressStageDef.update({ where: { id: s.id }, data: { order: s.order + 1 } });
      }
    });
  }

  const created = await prisma.progressStageDef.create({
    data: { projectId, category, name: name.trim(), order: finalOrder },
  });

  return NextResponse.json(created, { status: 201 });
}
