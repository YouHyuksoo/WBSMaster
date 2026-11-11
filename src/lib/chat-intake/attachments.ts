/**
 * @file src/lib/chat-intake/attachments.ts
 * @description 업무 등록용 문서를 비공개 저장하고 추출 근거를 보존합니다.
 * 초보자 가이드: 공개 이미지 URL을 반환하지 않고 소유권을 확인할 수 있는 ID만 반환합니다.
 */
import { createHash, randomUUID } from "node:crypto";
import { readFile, unlink } from "node:fs/promises";
import { prisma } from "@/lib/prisma";
import { saveUpload, resolveUploadPath } from "@/lib/uploads";
import { extractDocument, MAX_DOCUMENT_BYTES } from "@/lib/chat-intake/extract";
import { IntakeError } from "@/lib/chat-intake/types";
import { asJson, INTAKE_TTL } from "@/lib/chat-intake/store";

export async function uploadIntakeAttachment(file: File, userId: string, projectId: string) {
  if (file.size > MAX_DOCUMENT_BYTES) throw new IntakeError("문서는 5MB 이하여야 합니다.");
  const id = randomUUID();
  const buffer = Buffer.from(await file.arrayBuffer());
  const segments = await extractDocument(file.name, buffer, id);
  const storageKey = `private/chat/${id}.bin`;
  await saveUpload(storageKey, buffer); // 반환 공개 URL은 사용하지 않는다. 공개 라우트도 private 접근을 차단한다.
  try {
    const row = await prisma.chatAttachment.create({ data: {
      id, userId, projectId, name: file.name.slice(0, 240), storageKey, size: buffer.length,
      mimeType: file.type || "application/octet-stream", sha256: createHash("sha256").update(buffer).digest("hex"),
      segments: asJson(segments), expiresAt: new Date(Date.now() + INTAKE_TTL),
    } });
    return { attachmentId: row.id, name: row.name, segments: segments.length };
  } catch (error) {
    const absolute = resolveUploadPath(storageKey);
    if (absolute) await unlink(absolute);
    throw error;
  }
}

export async function attachmentOriginal(id: string, userId: string, projectId: string) {
  const row = await prisma.chatAttachment.findFirst({ where: { id, userId, projectId } });
  if (!row) throw new IntakeError("문서를 찾을 수 없습니다.", 404);
  if (row.expiresAt.getTime() <= Date.now()) {
    const linked = await prisma.chatIntakeDraft.findFirst({ where: { userId, projectId, attachmentIds: { has: id }, OR: [{ status: "COMMITTED" }, { expiresAt: { gt: new Date() } }] } });
    if (!linked) throw new IntakeError("문서 보관 기간이 지났습니다.", 410);
  }
  const absolute = resolveUploadPath(row.storageKey);
  if (!absolute) throw new IntakeError("문서를 찾을 수 없습니다.", 404);
  return { row, data: await readFile(absolute) };
}
