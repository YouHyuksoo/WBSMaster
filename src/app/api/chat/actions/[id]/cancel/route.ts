/**
 * @file src/app/api/chat/actions/[id]/cancel/route.ts
 * @description
 * AI 채팅 확인 카드의 [취소] API 입니다. 본인의 PENDING 제안을 CANCELLED 로 바꿉니다.
 *
 * 초보자 가이드:
 * 1. **POST /api/chat/actions/:id/cancel** → { status: "CANCELLED" }
 * 2. 본인 제안만 (다른 사용자는 404), 프로젝트 멤버만. 이미 처리된 제안은 409
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, assertProjectAccess } from "@/lib/auth";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(_request: NextRequest, { params }: RouteParams) {
  try {
    const { user, error } = await requireAuth();
    if (error) return error;
    const { id } = await params;

    const action = await prisma.chatPendingAction.findFirst({ where: { id, userId: user!.id } });
    if (!action) return NextResponse.json({ error: "제안을 찾을 수 없습니다." }, { status: 404 });

    const denied = await assertProjectAccess(action.projectId, user!);
    if (denied) return denied;

    const r = await prisma.chatPendingAction.updateMany({ where: { id, userId: user!.id, status: "PENDING" }, data: { status: "CANCELLED" } });
    if (r.count === 0) return NextResponse.json({ error: "이미 처리된 제안입니다.", status: action.status }, { status: 409 });
    return NextResponse.json({ status: "CANCELLED" });
  } catch (error) {
    console.error("채팅 제안 취소 실패:", error);
    return NextResponse.json({ error: "제안을 취소할 수 없습니다." }, { status: 500 });
  }
}
