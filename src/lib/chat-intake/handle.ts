/**
 * @file src/lib/chat-intake/handle.ts
 * @description 문서와 채팅 답변을 공통 업무 등록 초안으로 누적합니다.
 * 초보자 가이드: LLM은 트랜잭션 밖에서 호출하고 revision과 요청 ID로 재전송을 보호합니다.
 */
import { randomUUID } from "node:crypto";
import { prisma } from "@/lib/prisma";
import type { AuthUser } from "@/lib/auth";
import type { LLMClient } from "@/lib/llm/client-base";
import { detectIntakeTarget, isIntakeTarget } from "@/lib/chat-intake/policies";
import { structureIntake } from "@/lib/chat-intake/structure";
import { INTAKE_TTL, asJson, draftResponse, ownedDraft, prepareAction } from "@/lib/chat-intake/store";
import { IntakeError, type IntakeItem, type SourceText } from "@/lib/chat-intake/types";
import { relativeDateSources } from "@/lib/chat-intake/date-evidence";

export interface IntakeRequest {
  intakeDraftId?: unknown; intakeTarget?: unknown; attachmentIds?: unknown;
  revision?: unknown; requestId?: unknown;
}
export function wantsIntake(message: string, input: IntakeRequest) {
  return !!(input.intakeDraftId || input.intakeTarget || (Array.isArray(input.attachmentIds) && input.attachmentIds.length) || detectIntakeTarget(message));
}

export async function answerIntake(user: AuthUser, projectId: string, message: string, client: LLMClient, input: IntakeRequest, options: { persistHistory?: boolean; priorSources?: SourceText[] } = {}) {
  if (message.length > 100000) throw new IntakeError("자료를 10만 자 이하로 나누어 주세요.");
  const requestId = typeof input.requestId === "string" && input.requestId.length <= 100 ? input.requestId : randomUUID();
  let draft;
  const starting = !input.intakeDraftId;
  const sources: SourceText[] = [{ id: `message:${requestId}`, location: "사용자 입력", text: message }];
  if (starting) sources.push(...options.priorSources ?? []);
  if (!starting) {
    if (typeof input.intakeDraftId !== "string") throw new IntakeError("초안 ID가 올바르지 않습니다.");
    draft = await ownedDraft(input.intakeDraftId, user.id, projectId);
    const event = await prisma.chatIntakeEvent.findUnique({ where: { draftId_requestId: { draftId: draft.id, requestId } } });
    if (event) return { id: event.id, ...event.response as object };
    if (draft.status === "COMMITTED") return { id: draft.id, ...await draftResponse(draft) };
    if (draft.status === "CANCELLED") throw new IntakeError("취소된 초안입니다. 새로 시작해 주세요.", 409);
    if (input.revision !== draft.revision) throw new IntakeError("초안이 변경되었습니다. 초안을 다시 불러온 뒤 답해 주세요.", 409);
  } else {
    const target = isIntakeTarget(input.intakeTarget) ? input.intakeTarget : detectIntakeTarget(message);
    if (!target) throw new IntakeError("인터뷰관리·주간보고·이슈사항·협의요청 중 등록할 대상을 알려 주세요.");
    const ids = input.attachmentIds ?? [];
    if (!Array.isArray(ids) || ids.length > 3 || ids.some((id) => typeof id !== "string")) throw new IntakeError("첨부 문서는 최대 3개입니다.");
    const attachments = await prisma.chatAttachment.findMany({ where: { id: { in: ids }, userId: user.id, projectId, expiresAt: { gt: new Date() } } });
    if (attachments.length !== new Set(ids).size) throw new IntakeError("첨부 문서가 만료되었거나 접근할 수 없습니다.", 404);
    for (const attachment of attachments) sources.push(...attachment.segments as unknown as SourceText[]);
    if (sources.reduce((n, s) => n + s.text.length, 0) > 100000) throw new IntakeError("첨부와 입력을 합쳐 10만 자 이하로 나누어 주세요.");
    draft = await prisma.chatIntakeDraft.upsert({
      where: { userId_projectId_startRequestId: { userId: user.id, projectId, startRequestId: requestId } }, update: {},
      create: { userId: user.id, projectId, target, startRequestId: requestId, inputText: message, attachmentIds: attachments.map((a) => a.id), expiresAt: new Date(Date.now() + INTAKE_TTL) },
    });
    if (draft.target !== target || draft.inputText !== message || [...draft.attachmentIds].sort().join() !== [...new Set(ids)].sort().join()) throw new IntakeError("같은 요청 ID로 다른 자료를 보낼 수 없습니다.", 409);
    const event = await prisma.chatIntakeEvent.findUnique({ where: { draftId_requestId: { draftId: draft.id, requestId } } });
    if (event) return { id: event.id, ...event.response as object };
  }
  if (!isIntakeTarget(draft.target)) throw new IntakeError("등록 대상을 확인해 주세요.");
  const base = { ...draft, target: draft.target as import("@/lib/chat-intake/types").IntakeTarget };
  if (!starting && base.status === "NEW") {
    const attachments = await prisma.chatAttachment.findMany({ where: { id: { in: base.attachmentIds }, userId: user.id, projectId } });
    sources.splice(0, sources.length, { id: `message:${base.startRequestId}`, location: "사용자 입력", text: base.inputText });
    for (const a of attachments) sources.push(...a.segments as unknown as SourceText[]);
  }
  sources.push(...relativeDateSources(starting || base.status === "NEW" ? base.inputText : message, requestId, starting || base.status === "NEW" ? base.createdAt : new Date()));
  let command = /^\$(pause|cancel|resume|prepare)$/.exec(message)?.[1] ?? (/^(나중에|보류|그만)$/.test(message.trim()) ? "pause" : /^취소$/.test(message.trim()) ? "cancel" : null);
  if (base.status === "NEW" && ["prepare", "resume"].includes(command ?? "")) command = null;
  if (sources.reduce((n, s) => n + s.text.length, 0) > 100000) throw new IntakeError("자료를 10만 자 이하로 나누어 주세요.");
  // lease 만료 뒤에는 재시도 가능. 서버 재시작 시에도 NEW 초안을 복구한다.
  const leaseUntil = new Date(Date.now() + 5 * 60_000);
  const claimed = await prisma.chatIntakeDraft.updateMany({ where: { id: base.id, revision: base.revision,
    OR: [{ leaseUntil: null }, { leaseUntil: { lt: new Date() } }] }, data: { leaseUntil } });
  if (!claimed.count) throw new IntakeError("이 초안의 답변을 처리 중입니다. 잠시 후 다시 불러와 주세요.", 409);
  try {
    const items = command ? base.items as unknown as IntakeItem[] : await structureIntake((p, s) => client.generate(p, s), base.target, sources, starting || base.status === "NEW" ? [] : base.items as unknown as IntakeItem[]);
    return await prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM chat_intake_drafts WHERE id = ${base.id} FOR UPDATE`;
      const current = await tx.chatIntakeDraft.findUniqueOrThrow({ where: { id: base.id } });
      if (current.revision !== base.revision || current.status === "COMMITTED" || current.leaseUntil?.getTime() !== leaseUntil.getTime()) throw new IntakeError("초안이 변경되었습니다. 다시 불러와 주세요.", 409);
      if (current.actionId) await tx.chatPendingAction.updateMany({ where: { id: current.actionId, status: "PENDING" }, data: { status: "CANCELLED" } });
      let updated = await tx.chatIntakeDraft.update({ where: { id: base.id }, data: {
        items: asJson(items), revision: { increment: 1 }, status: command === "pause" ? "PAUSED" : command === "cancel" ? "CANCELLED" : "COLLECTING",
        actionId: null, leaseUntil: null, expiresAt: new Date(Date.now() + INTAKE_TTL),
      } });
      if (!["pause", "cancel"].includes(command ?? "")) updated = await prepareAction(tx, updated);
      const response = await draftResponse(updated, tx);
      let id: string = randomUUID();
      if (options.persistHistory !== false) {
        await tx.chatHistory.create({ data: { userId: user.id, projectId, role: "user", content: message, intakeDraftId: base.id } });
        const saved = await tx.chatHistory.create({ data: { userId: user.id, projectId, role: "assistant", content: response.content, intakeDraftId: base.id, pendingActionId: updated.actionId } });
        id = saved.id;
      }
      const full = { id, ...response };
      await tx.chatIntakeEvent.create({ data: { draftId: base.id, requestId, revision: updated.revision, message, response: asJson(full) } });
      return full;
    });
  } finally {
    await prisma.chatIntakeDraft.updateMany({ where: { id: base.id, revision: base.revision, leaseUntil }, data: { leaseUntil: null } });
  }
}
