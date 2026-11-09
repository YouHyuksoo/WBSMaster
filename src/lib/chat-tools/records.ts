/**
 * @file src/lib/chat-tools/records.ts
 * @description
 * 업무 레코드 조회 채팅 도구입니다: list_tasks, list_issues, list_field_issues, list_customer_requirements,
 * list_discussion_items, list_milestones, list_as_is_items, get_record. 코드 해석기 resolveRecordByCode 도 제공합니다.
 *
 * 초보자 가이드:
 * - 모든 조회는 ctx.projectId 안에서만 한다 (AS-IS 항목은 overview.projectId).
 * - 공통 인자: status · priority(Enum, term-dictionary), assigneeId(find_people 의 id) 또는 assigneeName(문자열 담당자 칼럼),
 *   keyword(제목·내용 부분 일치), dateFrom/dateTo(YYYY-MM-DD), limit(기본 50, 최대 200)
 * - 결과 summary 는 "이슈 6건: ISS-008, ..." 형식이다. 다음 질문("그중 ...")의 맥락으로 쓰인다.
 * - 코드 접두사: ISS-(이슈) → DIS-(협의요청) → RQIT_(고객요구사항) → IS+숫자(고객이슈). ISS- 를 IS 보다 먼저 본다.
 */

import { enumList, limit, obj, optDate, optString, summarize } from "./args";
import { termGuide, type TermDictionaryKey } from "./term-dictionary";
import type { ChatTool, ToolContext } from "./types";

type Delegate = {
  findMany(args: unknown): Promise<Record<string, unknown>[]>;
  findFirst(args: unknown): Promise<Record<string, unknown> | null>;
  count(args: unknown): Promise<number>;
};
const delegate = (ctx: ToolContext, model: string) => (ctx.prisma as unknown as Record<string, Delegate>)[model];

interface ListSpec {
  name: string;
  label: string;
  model: string;
  what: string;
  status?: { field: string; key: TermDictionaryKey };
  priority?: TermDictionaryKey;
  textFields: string[];
  assignee: "relation" | "text" | null;
  dateField?: string;
  asIs?: boolean;
  select: Record<string, unknown>;
}

const NAME = { select: { name: true } };

const SPECS: ListSpec[] = [
  { name: "list_tasks", label: "TASK", model: "task", what: "TASK 관리(칸반) 태스크. 수정 제안에 쓸 id 를 함께 돌려준다", status: { field: "status", key: "taskStatus" }, priority: "taskPriority", textFields: ["title", "description"], assignee: "relation", dateField: "dueDate",
    select: { id: true, title: true, status: true, priority: true, progress: true, startDate: true, dueDate: true, assignee: NAME } },
  { name: "list_issues", label: "이슈", model: "issue", what: "이슈사항(내부 이슈·버그·개선)", status: { field: "status", key: "issueStatus" }, priority: "issuePriority", textFields: ["title", "description"], assignee: "relation", dateField: "reportDate",
    select: { id: true, code: true, title: true, status: true, priority: true, category: true, reportDate: true, dueDate: true, assignee: NAME } },
  { name: "list_field_issues", label: "고객이슈", model: "fieldIssue", what: "고객이슈(현장·고객이 제기한 이슈)", status: { field: "status", key: "fieldIssueStatus" }, textFields: ["title", "description"], assignee: "text", dateField: "registeredDate",
    select: { id: true, code: true, title: true, status: true, category: true, issuer: true, assignee: true, registeredDate: true, targetDate: true } },
  { name: "list_customer_requirements", label: "고객요구사항", model: "customerRequirement", what: "고객요구사항(기능 요청)", status: { field: "applyStatus", key: "applyStatus" }, textFields: ["functionName", "content"], assignee: null, dateField: "requestDate",
    select: { id: true, code: true, functionName: true, content: true, applyStatus: true, category: true, requester: true, requestDate: true } },
  { name: "list_discussion_items", label: "협의요청", model: "discussionItem", what: "협의요청(고객과 협의할 사항)", status: { field: "status", key: "discussionStatus" }, priority: "discussionPriority", textFields: ["title", "description"], assignee: "relation", dateField: "reportDate",
    select: { id: true, code: true, title: true, status: true, stage: true, priority: true, reportDate: true, dueDate: true, assignee: NAME } },
  { name: "list_milestones", label: "마일스톤", model: "milestone", what: "마일스톤(주요 일정)", status: { field: "status", key: "milestoneStatus" }, textFields: ["name", "description"], assignee: null, dateField: "startDate",
    select: { id: true, name: true, status: true, startDate: true, endDate: true } },
  { name: "list_as_is_items", label: "AS-IS 항목", model: "asIsOverviewItem", what: "AS-IS 분석 총괄의 현행 업무 항목", textFields: ["taskName", "middleCategory", "issueSummary", "details"], assignee: null, asIs: true,
    select: { id: true, asIsManagementNo: true, majorCategory: true, middleCategory: true, taskName: true, currentMethod: true, issueSummary: true } },
];

type ListArgs = { status?: string[]; priority?: string[]; assigneeId?: string; assigneeName?: string; keyword?: string; dateFrom?: Date; dateTo?: Date; limit: number };

/** 날짜는 YYYY-MM-DD, 담당자 객체는 이름, 긴 글은 300자로 */
function toRow(r: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(r)) {
    if (v instanceof Date) out[k] = v.toISOString().slice(0, 10);
    else if (v && typeof v === "object" && "name" in (v as object)) out[k] = (v as { name: unknown }).name;
    else if (typeof v === "string" && v.length > 300) out[k] = `${v.slice(0, 300)}…`;
    else out[k] = v;
  }
  return out;
}

function listTool(spec: ListSpec): ChatTool<ListArgs> {
  const props: Record<string, unknown> = { keyword: { type: "string" }, dateFrom: { type: "string" }, dateTo: { type: "string" }, limit: { type: "integer" } };
  const guide: string[] = [];
  if (spec.status) { props.status = { type: "array", items: { type: "string" } }; guide.push(`상태: ${termGuide(spec.status.key)}`); }
  if (spec.priority) { props.priority = { type: "array", items: { type: "string" } }; guide.push(`우선순위: ${termGuide(spec.priority)}`); }
  if (spec.assignee === "relation") props.assigneeId = { type: "string", description: "find_people 로 찾은 사용자 id" };
  if (spec.assignee === "text") props.assigneeName = { type: "string", description: "담당자 이름(부분 일치)" };
  return {
    name: spec.name,
    description: `${spec.what}를 조회한다. ${guide.join(" / ")}`.trim(),
    parameters: { type: "object", properties: props, additionalProperties: false },
    kind: "read",
    parse(args) {
      const a = obj(args);
      return {
        status: spec.status ? enumList(a.status, spec.status.key, "status") : undefined,
        priority: spec.priority ? enumList(a.priority, spec.priority, "priority") : undefined,
        assigneeId: spec.assignee === "relation" ? optString(a.assigneeId) : undefined,
        assigneeName: spec.assignee === "text" ? optString(a.assigneeName) : undefined,
        keyword: optString(a.keyword),
        dateFrom: optDate(a.dateFrom, "dateFrom"),
        dateTo: optDate(a.dateTo, "dateTo"),
        limit: limit(a.limit),
      };
    },
    async execute(ctx, a) {
      const where: Record<string, unknown> = spec.asIs ? { overview: { projectId: ctx.projectId } } : { projectId: ctx.projectId };
      if (spec.status && a.status) where[spec.status.field] = { in: a.status };
      if (a.priority) where.priority = { in: a.priority };
      if (a.assigneeId) where.assigneeId = a.assigneeId;
      if (a.assigneeName) where.assignee = { contains: a.assigneeName, mode: "insensitive" };
      if (a.keyword) where.OR = spec.textFields.map((f) => ({ [f]: { contains: a.keyword, mode: "insensitive" } }));
      if (spec.dateField && (a.dateFrom || a.dateTo)) where[spec.dateField] = { ...(a.dateFrom ? { gte: a.dateFrom } : {}), ...(a.dateTo ? { lte: a.dateTo } : {}) };
      const d = delegate(ctx, spec.model);
      const [rows, total] = await Promise.all([
        d.findMany({ where, select: spec.select, orderBy: spec.asIs ? { order: "asc" } : { createdAt: "desc" }, take: a.limit }),
        d.count({ where }),
      ]);
      const out = rows.map(toRow);
      return { kind: "data", summary: summarize(spec.label, out as { code?: string; title?: string; name?: string }[], total), rows: out };
    },
  };
}

export const LIST_TOOLS: Record<string, ChatTool<ListArgs>> = Object.fromEntries(SPECS.map((s) => [s.name, listTool(s)]));

/** 코드 접두사 → 모델·테이블 */
const CODE_RULES: { test: RegExp; model: string; table: "issues" | "field_issues" | "discussion_items" | "customer_requirements" }[] = [
  { test: /^ISS-/i, model: "issue", table: "issues" },
  { test: /^DIS-/i, model: "discussionItem", table: "discussion_items" },
  { test: /^RQIT_/i, model: "customerRequirement", table: "customer_requirements" },
  { test: /^IS\d/i, model: "fieldIssue", table: "field_issues" },
];

/** 현재 프로젝트 안에서 코드로 레코드를 찾는다. 없거나 다른 프로젝트면 null */
export async function resolveRecordByCode(ctx: ToolContext, code: string): Promise<{ table: (typeof CODE_RULES)[number]["table"]; id: string } | null> {
  const rule = CODE_RULES.find((r) => r.test.test(code.trim()));
  if (!rule) return null;
  const row = await delegate(ctx, rule.model).findFirst({ where: { projectId: ctx.projectId, code: code.trim() }, select: { id: true } });
  return row ? { table: rule.table, id: String(row.id) } : null;
}

export const getRecordTool: ChatTool<{ code: string }> = {
  name: "get_record",
  description: "코드로 레코드 하나를 상세 조회한다. 이슈 ISS-001, 협의요청 DIS-0001, 고객요구사항 RQIT_00001, 고객이슈 IS0001 형식.",
  parameters: { type: "object", properties: { code: { type: "string" } }, required: ["code"], additionalProperties: false },
  kind: "read",
  parse(args) {
    const code = optString(obj(args).code);
    if (!code) throw new Error("code 가 필요합니다.");
    return { code };
  },
  async execute(ctx, { code }) {
    const rule = CODE_RULES.find((r) => r.test.test(code));
    if (!rule) return { kind: "error", message: `알 수 없는 코드 형식입니다: ${code}` };
    const row = await delegate(ctx, rule.model).findFirst({ where: { projectId: ctx.projectId, code } });
    if (!row) return { kind: "error", message: `현재 프로젝트에 ${code} 가 없습니다.` };
    return { kind: "data", summary: `${code} 상세`, rows: [toRow(row)] };
  },
};
