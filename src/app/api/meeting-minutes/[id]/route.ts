/**
 * @file src/app/api/meeting-minutes/[id]/route.ts
 * @description
 * 회의록 단건 조회/수정/삭제 API입니다.
 *
 * 초보자 가이드:
 * - GET /api/meeting-minutes/[id]: 단건 조회 (내용 항목 포함)
 * - PATCH /api/meeting-minutes/[id]: 머리 필드는 허용 목록만 수정, items 를 보내면 내용 항목 전체 교체
 *   (문서번호 · 프로젝트는 바꿀 수 없다)
 * - DELETE /api/meeting-minutes/[id]: 삭제 (내용 항목은 Cascade 로 함께 삭제)
 * - 레코드를 먼저 읽고 그 projectId 로 권한을 확인한다.
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, assertProjectAccess, type AuthUser } from "@/lib/auth";
import { normalizeItems, pickMinuteFields } from "@/lib/meeting-minutes";

interface RouteParams {
  params: Promise<{ id: string }>;
}

const includeItems = { items: { orderBy: { sortOrder: "asc" as const } } };

/** 레코드 존재 + 프로젝트 권한 확인. 실패 시 응답을 돌려준다 */
async function loadGuarded(id: string, user: AuthUser) {
  const minute = await prisma.meetingMinute.findUnique({ where: { id }, select: { id: true, projectId: true } });
  if (!minute) {
    return { denied: NextResponse.json({ error: "회의록을 찾을 수 없습니다." }, { status: 404 }) };
  }
  const accessError = await assertProjectAccess(minute.projectId, user);
  return accessError ? { denied: accessError } : { minute };
}

/** 회의록 단건 조회 */
export async function GET(_request: NextRequest, { params }: RouteParams) {
  const { user, error: authError } = await requireAuth();
  if (authError) return authError;
  const { id } = await params;

  const { denied } = await loadGuarded(id, user!);
  if (denied) return denied;

  const minute = await prisma.meetingMinute.findUnique({ where: { id }, include: includeItems });
  return NextResponse.json(minute);
}

/** 회의록 수정 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const { user, error: authError } = await requireAuth();
  if (authError) return authError;
  const { id } = await params;

  const body = (await request.json()) as Record<string, unknown>;
  const { fields, error: fieldError } = pickMinuteFields(body);
  if (fieldError) return NextResponse.json({ error: fieldError }, { status: 400 });

  const { denied } = await loadGuarded(id, user!);
  if (denied) return denied;

  try {
    const updated = await prisma.$transaction(async (tx) => {
      if ("items" in body) {
        await tx.meetingMinuteItem.deleteMany({ where: { minuteId: id } });
        await tx.meetingMinuteItem.createMany({
          data: normalizeItems(body.items).map((item) => ({ ...item, minuteId: id })),
        });
      }
      return tx.meetingMinute.update({ where: { id }, data: fields, include: includeItems });
    });
    return NextResponse.json(updated);
  } catch (error) {
    console.error("회의록 수정 실패:", error);
    return NextResponse.json({ error: "회의록을 수정할 수 없습니다." }, { status: 500 });
  }
}

/** 회의록 삭제 */
export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  const { user, error: authError } = await requireAuth();
  if (authError) return authError;
  const { id } = await params;

  const { denied } = await loadGuarded(id, user!);
  if (denied) return denied;

  try {
    await prisma.meetingMinute.delete({ where: { id } });
    return NextResponse.json({ message: "회의록이 삭제되었습니다." });
  } catch (error) {
    console.error("회의록 삭제 실패:", error);
    return NextResponse.json({ error: "회의록을 삭제할 수 없습니다." }, { status: 500 });
  }
}
