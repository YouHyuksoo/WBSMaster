/**
 * @file src/lib/chat-tools/actions.ts
 * @description
 * 확인된 AI 채팅 쓰기 제안(chat_pending_actions)을 화면과 같은 서비스 계층 함수로 실행합니다.
 *
 * 초보자 가이드:
 * - executePendingAction(action, user): kind 별로 createTask / updateIssue 등을 부른다.
 *   알림·Slack 같은 후처리는 화면에서 등록할 때와 똑같이 돈다.
 * - 수정(update_*)은 args.targetId 와 action.projectId 로 서비스가 같은 프로젝트인지 다시 확인한다.
 * - 결과: { ok: true, resultRef, link } 또는 { ok: false, error, status }
 */

import type { AuthUser } from "@/lib/auth";
import { createTask, updateTask } from "@/lib/services/taskService";
import { createIssue, updateIssue } from "@/lib/services/issueService";
import { createFieldIssue, updateFieldIssue } from "@/lib/services/fieldIssueService";
import { createDiscussionItem, updateDiscussionItem } from "@/lib/services/discussionItemService";
import { updateWbsItems } from "@/lib/services/wbsService";
import { ENTITY_SPECS, executeEntityAction } from "./entities";
import { executeWeeklyAction } from "./weekly-report-execute";

export type ActionOutcome = { ok: true; resultRef: string; link: string } | { ok: false; error: string; status: number };

type PendingAction = { kind: string; projectId: string; args: unknown };
type ServiceOut = { success: boolean; data?: { id: string }; task?: { id: string }; error?: string; status?: number };

const LINKS: Record<string, string> = {
  task: "/dashboard/kanban",
  issue: "/dashboard/issues",
  field_issue: "/dashboard/field-issues",
  discussion_item: "/dashboard/discussion-items",
  wbs: "/dashboard/wbs",
};

/* eslint-disable @typescript-eslint/no-explicit-any -- args 는 제안 도구가 검증·정규화해 저장한 서비스 입력 */
export async function executePendingAction(action: PendingAction, user: AuthUser): Promise<ActionOutcome> {
  const a = (action.args ?? {}) as any;
  const p = action.projectId;
  // 공통 등록·수정·삭제는 화면 API 핸들러로 실행 (같은 요청의 로그인 쿠키 사용)
  if (action.kind.startsWith("entity_")) return executeEntityAction(action, ENTITY_SPECS);
  if (action.kind.startsWith("weekly_item_")) return executeWeeklyAction(action);
  let out: ServiceOut;
  switch (action.kind) {
    case "create_task":
      out = await createTask({ ...a, projectId: p, creatorId: user.id, creatorName: user.name || user.email, isAiGenerated: true });
      break;
    case "update_task":
      out = await updateTask(a.targetId, p, a.patch);
      break;
    case "create_issue":
      out = await createIssue({ ...a, projectId: p, reporterId: user.id });
      break;
    case "update_issue":
      out = await updateIssue(a.targetId, p, a.patch);
      break;
    case "create_field_issue":
      out = await createFieldIssue({ ...a, projectId: p });
      break;
    case "update_field_issue":
      out = await updateFieldIssue(a.targetId, p, a.patch);
      break;
    case "create_discussion_item":
      // 화면의 선택지 형식 {label: "A안", description} 으로 바꾼다 (discussion-items/types.ts DiscussionOption)
      out = await createDiscussionItem({
        ...a,
        projectId: p,
        reporterId: user.id,
        options: (a.options ?? []).map((text: string, i: number) => ({ label: `${String.fromCharCode(65 + i)}안`, description: text })),
      });
      break;
    case "update_discussion_item":
      out = await updateDiscussionItem(a.targetId, p, a.patch);
      break;
    case "update_wbs":
      out = await updateWbsItems(a.targetIds ?? [], p, a.patch ?? {}, a.mode === "replace" ? "replace" : "add");
      break;
    default:
      return { ok: false, error: `알 수 없는 제안 종류입니다: ${action.kind}`, status: 400 };
  }
  /* eslint-enable @typescript-eslint/no-explicit-any */
  if (!out.success) return { ok: false, error: out.error || "실행에 실패했습니다.", status: out.status ?? 500 };
  const id = out.data?.id ?? out.task?.id ?? "";
  return { ok: true, resultRef: id, link: LINKS[action.kind.replace(/^(create|update)_/, "")] ?? "/dashboard" };
}
