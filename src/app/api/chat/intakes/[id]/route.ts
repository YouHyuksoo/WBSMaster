/**
 * @file src/app/api/chat/intakes/[id]/route.ts
 * @description 보완 중인 업무 초안과 확인 제안을 복구합니다.
 * 초보자 가이드: 본인 초안만 찾은 뒤 프로젝트 권한을 다시 검사합니다.
 */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, assertProjectAccess } from "@/lib/auth";
import { ownedDraft, draftResponse } from "@/lib/chat-intake/store";
import { IntakeError } from "@/lib/chat-intake/types";
export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { user, error } = await requireAuth();
  if (error) return error;
  const { id } = await params;
  const d = await prisma.chatIntakeDraft.findFirst({ where: { id, userId: user!.id } });
  if (!d) return NextResponse.json({ error: "초안을 찾을 수 없습니다." }, { status: 404 });
  const denied = await assertProjectAccess(d.projectId, user!);
  if (denied) return denied;
  try { return NextResponse.json(await draftResponse(await ownedDraft(id, user!.id, d.projectId))); }
  catch (e) { if (e instanceof IntakeError) return NextResponse.json({ error: e.message }, { status: e.status }); throw e; }
}
