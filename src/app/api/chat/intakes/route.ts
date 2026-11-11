/**
 * @file src/app/api/chat/intakes/route.ts
 * @description 본인 프로젝트의 이어서 작성할 업무 초안 목록입니다.
 * 초보자 가이드: 프로젝트 권한 검사 후 원문 없이 요약만 반환합니다.
 */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, assertProjectAccess } from "@/lib/auth";
export async function GET(request: NextRequest) {
  const { user, error } = await requireAuth();
  if (error) return error;
  const projectId = request.nextUrl.searchParams.get("projectId");
  if (!projectId) return NextResponse.json({ error: "프로젝트를 선택해 주세요." }, { status: 400 });
  const denied = await assertProjectAccess(projectId, user!);
  if (denied) return denied;
  const drafts = await prisma.chatIntakeDraft.findMany({ where: { userId: user!.id, projectId,
    status: { notIn: ["CANCELLED", "COMMITTED"] }, expiresAt: { gt: new Date() } }, orderBy: { updatedAt: "desc" }, take: 20,
    select: { id: true, target: true, status: true, revision: true, updatedAt: true },
  });
  return NextResponse.json(drafts);
}
