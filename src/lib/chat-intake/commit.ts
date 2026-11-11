/**
 * @file src/lib/chat-intake/commit.ts
 * @description 확인 제안·초안·업무 등록 결과를 하나의 트랜잭션으로 확정합니다.
 * 초보자 가이드: 커밋 뒤 응답이 유실되어도 같은 제안은 기존 결과를 반환합니다.
 */
import { prisma } from "@/lib/prisma";
import { asJson, viewDraft } from "@/lib/chat-intake/store";
import { duplicateSignature, findDuplicates, saveIntakeItem } from "@/lib/chat-intake/records";
import { lockProjectWrites } from "@/lib/chat-intake/locks";
import { IntakeError } from "@/lib/chat-intake/types";
import { INTAKE_POLICIES } from "@/lib/chat-intake/policies";

export async function commitIntake(actionId: string, userId: string, projectId: string) {
  return prisma.$transaction(async (tx) => {
    // 보완 답변·취소와 같은 초안 행을 먼저 잠가 잠금 순서를 일정하게 유지한다.
    const candidate = await tx.chatIntakeDraft.findFirst({ where: { actionId, userId, projectId } });
    if (!candidate) throw new IntakeError("현재 초안의 등록 제안이 아닙니다. 다시 확인해 주세요.", 409);
    await tx.$queryRaw`SELECT id FROM chat_intake_drafts WHERE id = ${candidate.id} FOR UPDATE`;
    const d = await tx.chatIntakeDraft.findUniqueOrThrow({ where: { id: candidate.id } });
    const action = await tx.chatPendingAction.findFirst({ where: { id: actionId, userId, projectId, kind: "intake_commit" } });
    if (!action) throw new IntakeError("등록 제안을 찾을 수 없습니다.", 404);
    const view = viewDraft(d);
    if (d.status === "COMMITTED") return { status: "CONFIRMED", resultRef: view.result?.[0]?.id, link: view.result?.[0]?.link, results: view.result };
    if (d.leaseUntil && d.leaseUntil.getTime() > Date.now()) throw new IntakeError("보완 답변을 반영 중입니다. 답변 처리가 끝난 뒤 등록해 주세요.", 409);
    if (action.status !== "PENDING" || d.status !== "AWAITING_CONFIRMATION" || d.actionId !== action.id) throw new IntakeError("변경되거나 취소된 초안입니다. 내용을 다시 확인해 주세요.", 409);
    if (action.expiresAt.getTime() <= Date.now() || d.expiresAt.getTime() <= Date.now()) throw new IntakeError("확인 시간이 지났습니다. 초안에서 다시 확인해 주세요.", 410);
    const args = action.args as { draftId?: string; revision?: number };
    if (args.draftId !== d.id || args.revision !== d.revision || view.questions.length || !view.items.length) throw new IntakeError("초안 정보를 보완한 뒤 다시 확인해 주세요.", 409);
    await lockProjectWrites(tx, projectId);
    const duplicates = await findDuplicates(tx, view.target, view.items, projectId, userId);
    if (duplicateSignature(duplicates) !== duplicateSignature(d.duplicates)) throw new IntakeError("동일 제목의 기존 자료가 변경되었습니다. 초안에서 등록 내용을 다시 확인해 주세요.", 409);
    const results = [];
    for (const item of view.items) results.push(await saveIntakeItem(tx, view.target, item, projectId, userId));
    await tx.chatIntakeDraft.update({ where: { id: d.id }, data: { status: "COMMITTED", result: asJson(results), leaseUntil: null } });
    await tx.chatPendingAction.update({ where: { id: action.id }, data: { status: "CONFIRMED", resultRef: results[0].id } });
    await tx.chatIntakeEvent.create({ data: { draftId: d.id, requestId: `commit:${action.id}`, revision: d.revision, message: "등록 확정", response: asJson(results) } });
    await tx.chatHistory.create({ data: { userId, projectId, role: "assistant", intakeDraftId: d.id,
      content: `${INTAKE_POLICIES[view.target].label} ${results.length}건을 등록했습니다.\n${results.map((r) => `- [${r.label}](${r.link})`).join("\n")}`,
    } });
    return { status: "CONFIRMED", resultRef: results[0].id, link: results[0].link, results };
  }, { timeout: 20000 });
}

export async function cancelIntakeAction(actionId: string, userId: string, projectId: string) {
  return prisma.$transaction(async (tx) => {
    const d = await tx.chatIntakeDraft.findFirst({ where: { actionId, userId, projectId } });
    if (!d) throw new IntakeError("현재 초안의 제안이 아닙니다.", 409);
    await tx.$queryRaw`SELECT id FROM chat_intake_drafts WHERE id = ${d.id} FOR UPDATE`;
    const changed = await tx.chatPendingAction.updateMany({ where: { id: actionId, userId, projectId, status: "PENDING" }, data: { status: "CANCELLED" } });
    if (!changed.count) throw new IntakeError("이미 처리된 제안입니다.", 409);
    await tx.chatIntakeDraft.update({ where: { id: d.id }, data: { status: "PAUSED", revision: { increment: 1 }, actionId: null, leaseUntil: null } });
    return { status: "CANCELLED" };
  });
}
