/**
 * @file src/app/api/chat/attachments/[id]/route.ts
 * @description 등록 근거 원본 문서를 본인에게만 내려줍니다.
 * 초보자 가이드: 추측 가능한 파일 경로 대신 ID로 조회하고 항상 다운로드로 제공합니다.
 */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, assertProjectAccess } from "@/lib/auth";
import { attachmentOriginal } from "@/lib/chat-intake/attachments";
import { IntakeError } from "@/lib/chat-intake/types";
export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { user, error } = await requireAuth();
  if (error) return error;
  const { id } = await params;
  const attachment = await prisma.chatAttachment.findFirst({ where: { id, userId: user!.id } });
  if (!attachment) return NextResponse.json({ error: "문서를 찾을 수 없습니다." }, { status: 404 });
  const denied = await assertProjectAccess(attachment.projectId, user!);
  if (denied) return denied;
  try {
    const { row, data } = await attachmentOriginal(id, user!.id, attachment.projectId);
    return new Response(new Uint8Array(data), { headers: {
      "Content-Type": "application/octet-stream", "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(row.name)}`,
      "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff", "Content-Security-Policy": "sandbox",
    } });
  } catch (e) { if (e instanceof IntakeError) return NextResponse.json({ error: e.message }, { status: e.status }); throw e; }
}
