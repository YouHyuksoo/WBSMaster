/**
 * @file src/app/api/chat/actions/[id]/confirm/route.ts
 * @description
 * AI 채팅 확인 카드의 [등록] API 입니다. 본인 제안을 한 번만, 만료 전에, 서비스 계층으로 실행합니다.
 *
 * 초보자 가이드:
 * 1. **POST /api/chat/actions/:id/confirm** → { status: "CONFIRMED", resultRef, link }
 * 2. 본인 제안만 (다른 사용자 제안은 404), 프로젝트 멤버만 (assertProjectAccess)
 * 3. PENDING → CONFIRMED 선점은 updateMany 조건부 갱신으로 한다 (두 번 눌러도 한 번만 실행). 이미 처리됨 409, 만료 410
 * 4. 서비스가 실패하면 FAILED 와 오류를 기록하고 서비스의 상태 코드로 응답한다
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, assertProjectAccess } from "@/lib/auth";
import { executePendingAction } from "@/lib/chat-tools/actions";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(_request: NextRequest, { params }: RouteParams) {
  try {
    const { user, error } = await requireAuth();
    if (error) return error;
    const { id } = await params;

    const action = await prisma.chatPendingAction.findFirst({ where: { id, userId: user!.id } });
    if (!action) return NextResponse.json({ error: "확인할 제안을 찾을 수 없습니다." }, { status: 404 });

    const denied = await assertProjectAccess(action.projectId, user!);
    if (denied) return denied;

    if (action.status === "PENDING" && action.expiresAt.getTime() <= Date.now()) {
      await prisma.chatPendingAction.update({ where: { id }, data: { status: "EXPIRED" } });
      return NextResponse.json({ error: "확인 시간이 지났습니다. 다시 요청해 주세요." }, { status: 410 });
    }

    // PENDING 이고 만료 전인 제안만 CONFIRMED 로 선점 (동시에 두 번 눌러도 하나만 성공)
    const claimed = await prisma.chatPendingAction.updateMany({
      where: { id, userId: user!.id, status: "PENDING", expiresAt: { gt: new Date() } },
      data: { status: "CONFIRMED" },
    });
    if (claimed.count === 0) {
      return NextResponse.json({ error: "이미 처리된 제안입니다.", status: action.status }, { status: 409 });
    }

    const outcome = await executePendingAction(action, user!);
    if (!outcome.ok) {
      await prisma.chatPendingAction.update({ where: { id }, data: { status: "FAILED", error: outcome.error } });
      return NextResponse.json({ error: outcome.error }, { status: outcome.status });
    }
    await prisma.chatPendingAction.update({ where: { id }, data: { resultRef: outcome.resultRef } });
    return NextResponse.json({ status: "CONFIRMED", resultRef: outcome.resultRef, link: outcome.link });
  } catch (error) {
    console.error("채팅 제안 실행 실패:", error);
    return NextResponse.json({ error: "제안을 실행할 수 없습니다." }, { status: 500 });
  }
}
