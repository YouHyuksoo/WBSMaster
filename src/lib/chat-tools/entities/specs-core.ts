/**
 * @file src/lib/chat-tools/entities/specs-core.ts
 * @description
 * AI 채팅 공통 등록·수정·삭제 메뉴 정의 (2): AS-IS 총괄 항목, WBS(등록·삭제), TASK·이슈사항·고객이슈·협의요청(삭제).
 *
 * 초보자 가이드:
 * - TASK·이슈·고객이슈·협의요청의 등록·수정과 WBS 수정은 전용 도구(propose_create_task, propose_update_wbs 등)가 있어 여기서는 삭제만 연다.
 * - WBS 등록은 parentCode(상위 WBS 코드)로 부모와 레벨을 서버가 정한다. 삭제는 하위 항목 수를 미리 알려 준다.
 */

import type { WbsLevel } from "@prisma/client";
import type { EntityCtx, EntityField, EntitySpec } from "./types";
import { AS_IS_MAJOR_CATEGORY, AS_IS_CURRENT_METHOD } from "./enum-labels";

const S = (key: string, label: string, required = false): EntityField => ({ key, label, type: "string", required });
const D = (key: string, label: string): EntityField => ({ key, label, type: "date" });
const E = (key: string, label: string, labels: Record<string, string>, required = false): EntityField => ({ key, label, type: "enum", values: Object.keys(labels), labels, required });

type WbsDb = { wbsItem: { findFirst(a: unknown): Promise<{ id: string; level: WbsLevel } | null>; findMany(a: unknown): Promise<{ id: string }[]> } };
type AsIsDb = { asIsOverview: { findFirst(a: unknown): Promise<{ id: string } | null> } };
const NEXT_LEVEL: Record<WbsLevel, WbsLevel | null> = { LEVEL1: "LEVEL2", LEVEL2: "LEVEL3", LEVEL3: "LEVEL4", LEVEL4: null };

/** 하위 WBS 전부 (재귀) 개수 */
async function countDescendants(ctx: EntityCtx, ids: string[]): Promise<number> {
  const db = ctx.prisma as WbsDb;
  let total = 0;
  let frontier = ids;
  while (frontier.length) {
    const children = await db.wbsItem.findMany({ where: { parentId: { in: frontier } }, select: { id: true } });
    total += children.length;
    frontier = children.map((c) => c.id);
  }
  return total;
}

export const CORE_SPECS: EntitySpec[] = [
  {
    key: "as_is_item", label: "AS-IS 총괄 항목", model: "asIsOverviewItem", refFields: ["asIsManagementNo", "taskName"],
    scope: (projectId) => ({ overview: { projectId } }), link: "/dashboard/as-is-analysis", ops: { create: true, update: true, delete: true },
    collectionRoute: () => import("@/app/api/as-is-analysis/items/route"), collectionPath: "/api/as-is-analysis/items",
    itemRoute: () => import("@/app/api/as-is-analysis/items/[id]/route"), itemPath: (id) => `/api/as-is-analysis/items/${id}`,
    fields: [S("taskName", "업무명", true), E("majorCategory", "대분류", AS_IS_MAJOR_CATEGORY, true), S("middleCategory", "중분류", true), E("currentMethod", "현행 방식", AS_IS_CURRENT_METHOD), S("asIsManagementNo", "관리번호"), S("issueSummary", "문제 요약"), S("details", "상세"), S("remarks", "비고")],
    // 프로젝트의 AS-IS 총괄표(프로젝트당 하나)에 넣는다
    prepareCreate: async (ctx, data) => {
      const overview = await (ctx.prisma as AsIsDb).asIsOverview.findFirst({ where: { projectId: ctx.projectId }, select: { id: true } });
      return overview ? { ...data, overviewId: overview.id } : { error: "이 프로젝트에 AS-IS 총괄표가 없습니다. AS-IS 분석 화면에서 먼저 만드세요." };
    },
  },
  {
    key: "wbs", label: "WBS", model: "wbsItem", refFields: ["code"], link: "/dashboard/wbs", ops: { create: true, delete: true },
    collectionRoute: () => import("@/app/api/wbs/route"), collectionPath: "/api/wbs",
    itemRoute: () => import("@/app/api/wbs/[id]/route"), itemPath: (id) => `/api/wbs/${id}`,
    fields: [S("name", "항목명", true), S("parentCode", "상위 WBS 코드(없으면 대분류)"), { key: "assigneeNames", label: "담당", type: "people", to: "assigneeIds" }, D("startDate", "시작일"), D("endDate", "종료일"), { key: "weight", label: "가중치", type: "int" }, S("description", "설명")],
    // 상위 코드 → parentId, 레벨은 상위 다음 단계 (없으면 LEVEL1)
    prepareCreate: async (ctx, data) => {
      const { parentCode, ...rest } = data;
      if (!parentCode) return { ...rest, level: "LEVEL1" };
      const parent = await (ctx.prisma as WbsDb).wbsItem.findFirst({ where: { projectId: ctx.projectId, code: parentCode }, select: { id: true, level: true } });
      if (!parent) return { error: `현재 프로젝트에 상위 WBS ${String(parentCode)} 가 없습니다.` };
      const level = NEXT_LEVEL[parent.level];
      if (!level) return { error: "단위업무(레벨4) 아래에는 항목을 만들 수 없습니다." };
      return { ...rest, parentId: parent.id, level };
    },
    deleteImpact: async (ctx, ids) => {
      const n = await countDescendants(ctx, ids);
      return n > 0 ? `하위 WBS ${n}건도 함께 삭제됩니다` : undefined;
    },
  },
  {
    key: "task", label: "TASK", model: "task", refFields: ["id", "title"], link: "/dashboard/kanban", ops: { delete: true },
    itemRoute: () => import("@/app/api/tasks/[id]/route"), itemPath: (id) => `/api/tasks/${id}`, fields: [],
  },
  {
    key: "issue", label: "이슈사항", model: "issue", refFields: ["code"], link: "/dashboard/issues", ops: { delete: true },
    itemRoute: () => import("@/app/api/issues/[id]/route"), itemPath: (id) => `/api/issues/${id}`, fields: [],
  },
  {
    key: "field_issue", label: "고객이슈", model: "fieldIssue", refFields: ["code"], link: "/dashboard/field-issues", ops: { delete: true },
    itemRoute: () => import("@/app/api/field-issues/[id]/route"), itemPath: (id) => `/api/field-issues/${id}`, fields: [],
  },
  {
    key: "discussion_item", label: "협의요청", model: "discussionItem", refFields: ["code"], link: "/dashboard/discussion-items", ops: { delete: true },
    itemRoute: () => import("@/app/api/discussion-items/[id]/route"), itemPath: (id) => `/api/discussion-items/${id}`, fields: [],
  },
];
