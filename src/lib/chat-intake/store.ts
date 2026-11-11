/**
 * @file src/lib/chat-intake/store.ts
 * @description 영속 초안 조회와 사용자에게 보이는 질문·등록 확인 내용을 만듭니다.
 * 초보자 가이드: 확인 제안은 초안 revision에 고정되며 답변이 바뀌면 취소됩니다.
 */
import type { ChatIntakeDraft, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { INTAKE_POLICIES, displayValue, isIntakeTarget, questionsFor } from "@/lib/chat-intake/policies";
import { IntakeError, type IntakeItem, type IntakeView } from "@/lib/chat-intake/types";
import { findDuplicates } from "@/lib/chat-intake/records";

export const INTAKE_TTL = 7 * 86400_000;
export const asJson = (v: unknown): Prisma.InputJsonValue => JSON.parse(JSON.stringify(v));
export async function ownedDraft(id: string, userId: string, projectId: string) {
  const draft = await prisma.chatIntakeDraft.findFirst({ where: { id, userId, projectId } });
  if (!draft) throw new IntakeError("초안을 찾을 수 없습니다.", 404);
  if (draft.status !== "COMMITTED" && draft.expiresAt.getTime() <= Date.now()) throw new IntakeError("초안 보관 기간이 지났습니다. 자료로 새로 시작해 주세요.", 410);
  return draft;
}
export function viewDraft(d: ChatIntakeDraft): IntakeView {
  if (!isIntakeTarget(d.target)) throw new IntakeError("등록 대상을 확인해 주세요.");
  const items = d.items as unknown as IntakeItem[];
  return { id: d.id, target: d.target, revision: d.revision, status: d.status, items,
    questions: questionsFor(d.target, items), expiresAt: d.expiresAt.toISOString(), duplicates: d.duplicates as unknown as IntakeView["duplicates"],
    ...(d.result ? { result: d.result as unknown as IntakeView["result"] } : {}) };
}

export function draftContent(view: IntakeView): string {
  const policy = INTAKE_POLICIES[view.target];
  if (view.status === "COMMITTED") return `${policy.label} ${view.result?.length ?? 0}건을 등록했습니다.\n${view.result?.map((r) => `- [${r.label}](${r.link})`).join("\n")}`;
  if (["PAUSED", "CANCELLED"].includes(view.status)) return view.status === "PAUSED" ? "초안을 보류했습니다. 이어서 작성할 때 선택해 주세요." : "초안 등록을 취소했습니다.";
  if (!view.items.length) return "자료 분석이 완료되지 않았습니다. 다시 시도해 주세요.";
  if (view.questions.length) return `${policy.label} ${view.items.length}건으로 정리했습니다. 다음 정보를 보완해 주세요.\n\n` + view.questions.slice(0, 3).map((q) => `${view.items.findIndex((i) => i.key === q.itemKey) + 1}번 항목 · ${q.message}`).join("\n\n");
  const details = view.items.map((item, i) => `### ${i + 1}번 · ${String(item.fields.title?.value ?? "업무")}\n` + policy.fields.map((p) => {
    const f = item.fields[p.key];
    const suffix = !f?.value && p.default !== undefined ? ` (기본값: ${displayValue(p, p.default)})` : "";
    const value = f?.state === "NOT_APPLICABLE" ? "해당 없음" : f?.state === "DEFERRED" ? "미확인" : displayValue(p, f?.value ?? null);
    return `- ${p.label}: ${value}${suffix}`;
  }).join("\n")).join("\n\n");
  const duplicateNote = view.duplicates?.length ? `\n\n동일 제목의 기존 자료 ${view.duplicates.length}건이 있습니다. 등록을 누르면 기존 자료를 유지하고 새 항목을 추가합니다.\n${view.duplicates.map((x) => `- ${x.label}`).join("\n")}` : "";
  const weeklyNote = view.target === "weekly_report" ? "\n미확인 진행률·완료 여부는 저장 시 0%·미완료로 두고 비고에 미확인임을 기록합니다. 보고서는 제출하지 않고 작성 중으로 저장합니다." : "";
  return `${policy.label} ${view.items.length}건의 등록 내용을 확인해 주세요. 변경할 내용은 채팅으로 알려 주세요.${weeklyNote}\n\n${details}${duplicateNote}`;
}

export async function draftResponse(draft: ChatIntakeDraft, db: Pick<Prisma.TransactionClient, "chatPendingAction"> = prisma) {
  const intake = viewDraft(draft);
  const action = draft.actionId ? await db.chatPendingAction.findUnique({ where: { id: draft.actionId } }) : null;
  const pendingAction = action?.status === "PENDING" && action.expiresAt.getTime() > Date.now() ? {
    id: action.id, summary: action.summary, op: "create" as const,
    fields: [{ label: "등록 건수", value: `${intake.items.length}건` }, { label: "내용", value: "위 컬럼별 내용을 확인한 뒤 등록해 주세요." }],
  } : undefined;
  return { role: "assistant" as const, content: draftContent(intake), intake, pendingAction };
}

export async function prepareAction(tx: Prisma.TransactionClient, draft: ChatIntakeDraft) {
  const view = viewDraft(draft);
  if (view.questions.length || !view.items.length) return draft;
  for (const item of view.items) {
    const name = item.fields.assigneeName?.value;
    if (typeof name !== "string") continue;
    const people = await tx.teamMember.findMany({ where: { projectId: draft.projectId, user: { OR: [{ name }, { email: name }] } }, select: { userId: true } });
    if (new Set(people.map((p) => p.userId)).size !== 1) item.fields.assigneeName = { ...item.fields.assigneeName, state: "CONFLICT", note: "프로젝트 구성원의 정확한 이름이나 이메일을 알려 주세요. 모르면 미확인으로 진행할 수 있습니다." };
  }
  if (questionsFor(view.target, view.items).length) return tx.chatIntakeDraft.update({ where: { id: draft.id }, data: { items: asJson(view.items), status: "COLLECTING" } });
  const duplicates = await findDuplicates(tx, view.target, view.items, draft.projectId, draft.userId);
  if (draft.actionId) await tx.chatPendingAction.updateMany({ where: { id: draft.actionId, status: "PENDING" }, data: { status: "CANCELLED" } });
  const action = await tx.chatPendingAction.create({ data: {
    userId: draft.userId, projectId: draft.projectId, kind: "intake_commit",
    args: { draftId: draft.id, revision: draft.revision }, summary: `${INTAKE_POLICIES[view.target].label} ${view.items.length}건 등록`,
    expiresAt: new Date(Date.now() + 30 * 60_000),
  } });
  return tx.chatIntakeDraft.update({ where: { id: draft.id }, data: { status: "AWAITING_CONFIRMATION", actionId: action.id, duplicates: asJson(duplicates) } });
}
