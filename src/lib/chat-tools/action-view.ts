/**
 * @file src/lib/chat-tools/action-view.ts
 * @description
 * 채팅 기록을 다시 불러올 때, 답에 딸린 쓰기 확인 카드(chat_pending_actions)를 처리 상태와 함께 되살립니다.
 *
 * 초보자 가이드:
 * - 채팅 기록(chat_history)에는 "아래 내용으로 진행할까요?" 같은 질문만 저장되고, 카드는 pendingActionId 로만 이어진다.
 *   예전에는 기록을 다시 불러오면 카드가 사라져 질문만 남았다 (2026-11-19: 등록하고 나서 화면을 다시 열면 결과 대신 질문만 보였다).
 * - pendingActionViews(ids, userId): 본인 제안만 읽어 { id, summary, op, danger, status, link, error } 로 돌려준다.
 *   항목별 표(fields)는 저장하지 않으므로 비어 있고, summary 에 같은 내용이 들어 있다.
 * - 확인 시간이 지난 PENDING 은 EXPIRED 로 보여 준다 (DB 는 [등록]을 누를 때 바뀐다).
 * - 업무 접수(intake_commit) 카드는 IntakePanel 이 따로 보여 주므로 제외한다.
 */

import { prisma } from "@/lib/prisma";
import { ENTITY_SPECS } from "./entities";

export type PendingActionStatus = "PENDING" | "CONFIRMED" | "CANCELLED" | "EXPIRED" | "FAILED";

export interface PendingActionHistoryView {
  id: string;
  summary: string;
  fields: { label: string; value: string }[];
  op: "create" | "update" | "delete";
  danger?: boolean;
  status: PendingActionStatus;
  link?: string;
  error?: string;
}

const LEGACY_LINKS: Record<string, string> = {
  task: "/dashboard/kanban",
  issue: "/dashboard/issues",
  field_issue: "/dashboard/field-issues",
  discussion_item: "/dashboard/discussion-items",
  wbs: "/dashboard/wbs",
};

/** 처리 결과 화면 주소 (확인 API 가 돌려주는 link 와 같은 규칙) */
export function actionLink(kind: string, args: unknown): string {
  if (kind.startsWith("entity_")) {
    const entity = (args as { entity?: string } | null)?.entity;
    return ENTITY_SPECS.find((s) => s.key === entity)?.link ?? "/dashboard";
  }
  if (kind.startsWith("weekly_item_")) return "/dashboard/weekly-report";
  return LEGACY_LINKS[kind.replace(/^(create|update)_/, "")] ?? "/dashboard";
}

function opOf(kind: string): PendingActionHistoryView["op"] {
  if (/delete/.test(kind)) return "delete";
  if (/update/.test(kind)) return "update";
  return "create";
}

export async function pendingActionViews(ids: string[], userId: string, now = new Date()): Promise<Map<string, PendingActionHistoryView>> {
  const views = new Map<string, PendingActionHistoryView>();
  if (!ids.length) return views;
  const rows = await prisma.chatPendingAction.findMany({ where: { id: { in: ids }, userId } });
  for (const r of rows) {
    if (r.kind === "intake_commit") continue;
    const op = opOf(r.kind);
    const expired = r.status === "PENDING" && r.expiresAt.getTime() <= now.getTime();
    const status = (expired ? "EXPIRED" : r.status) as PendingActionStatus;
    views.set(r.id, {
      id: r.id,
      summary: r.summary,
      fields: [],
      op,
      ...(op === "delete" ? { danger: true } : {}),
      status,
      ...(status === "CONFIRMED" ? { link: actionLink(r.kind, r.args) } : {}),
      ...(status === "FAILED" && r.error ? { error: r.error } : {}),
    });
  }
  return views;
}
