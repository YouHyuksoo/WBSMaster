/**
 * @file src/lib/chat-tools/weekly-report.ts
 * @description
 * AI 채팅의 주간 업무보고 도구입니다. 내 주간보고 조회와 항목(실적·계획) 등록·수정·삭제 제안을 만듭니다.
 *
 * 초보자 가이드:
 * - 주간보고는 사용자 · 주차마다 하나다. 주차는 화면처럼 프로젝트 시작일이 속한 주의 월요일을 1주차로 센다.
 * - week: "this"(이번 주, 기본) · "last"(지난주) · "next"(다음 주) · 숫자(프로젝트 N주차).
 * - 항목 구분: PREVIOUS_RESULT(화면 "전주 실적") · NEXT_PLAN(화면 "차주 계획").
 * - 그 주 보고서가 없으면 등록 확인 시 보고서를 먼저 만든다 (weekly-report-execute.ts). 제안 단계에서는 아무것도 바꾸지 않는다.
 */

import type { ReportItemType, WorkCategory } from "@prisma/client";
import { getProjectWeekDateRange, getProjectWeekInfo } from "@/app/dashboard/weekly-report/constants";
import { obj } from "./args";
import { PENDING_ACTION_TTL_MS } from "./proposals";
import type { ChatTool, ProposalOp, ToolContext, ToolResult } from "./types";

export const ITEM_TYPE: Record<ReportItemType, string> = { PREVIOUS_RESULT: "전주 실적", NEXT_PLAN: "차주 계획" };
export const WORK_CATEGORY: Record<WorkCategory, string> = {
  DOCUMENT: "문서작업", ANALYSIS: "분석", DEVELOPMENT: "개발", DESIGN: "설계", SUPPORT: "지원", MEETING: "회의", REVIEW: "검토", OTHER: "기타",
};
const MAX_ITEMS = 20;

export type WeekArg = "this" | "last" | "next" | number;
export type WeekInfo = { year: number; weekNumber: number; weekStart: string; weekEnd: string };
type ItemRow = { id: string; type: string; category: string; title: string; progress: number; isCompleted: boolean; targetDate: Date | null };
type ReportRow = { id: string; status: string; items: ItemRow[] };

export function parseWeek(v: unknown): WeekArg {
  if (v === undefined || v === null || v === "" || v === "this") return "this";
  if (v === "last" || v === "next") return v;
  const n = typeof v === "number" ? v : /^\d+$/.test(String(v).trim()) ? Number(String(v).trim()) : NaN;
  if (!Number.isInteger(n) || n < 1) throw new Error(`week 는 this · last · next 또는 1 이상의 주차 숫자여야 합니다: ${String(v)}`);
  return n;
}

/** 프로젝트 시작일 기준 주차 (화면 getProjectWeekInfo 와 같은 계산, 연도는 화면처럼 오늘 연도) */
export async function resolveWeek(ctx: ToolContext, week: WeekArg, today = new Date()): Promise<WeekInfo | { error: string }> {
  const project = await ctx.prisma.project.findUnique({ where: { id: ctx.projectId }, select: { startDate: true } });
  if (!project?.startDate) return { error: "프로젝트 시작일이 없어 주차를 정할 수 없습니다. 프로젝트 설정에서 시작일을 넣어 주세요." };
  const start = new Date(project.startDate);
  const current = getProjectWeekInfo(today, start).week;
  const n = typeof week === "number" ? week : current + (week === "last" ? -1 : week === "next" ? 1 : 0);
  if (n < 1) return { error: "프로젝트 시작 전 주차입니다." };
  const range = getProjectWeekDateRange(start, n);
  return { year: today.getFullYear(), weekNumber: n, weekStart: range.start.toISOString(), weekEnd: range.end.toISOString() };
}

/** 서버 현지 날짜로 MM-DD (ISO 문자열을 자르면 UTC 라 한국 월요일이 전날로 보인다) */
const md = (iso: string) => {
  const d = new Date(iso);
  return `${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
export const weekLabel = (w: WeekInfo) => `${w.weekNumber}주차(${md(w.weekStart)}~${md(w.weekEnd)})`;

async function findMyReport(ctx: ToolContext, w: WeekInfo): Promise<ReportRow | null> {
  return (await ctx.prisma.weeklyReport.findUnique({
    where: { projectId_userId_year_weekNumber: { projectId: ctx.projectId, userId: ctx.user.id, year: w.year, weekNumber: w.weekNumber } },
    select: {
      id: true, status: true,
      items: { select: { id: true, type: true, category: true, title: true, progress: true, isCompleted: true, targetDate: true }, orderBy: [{ type: "asc" }, { order: "asc" }] },
    },
  })) as ReportRow | null;
}

/** 제목 → 항목. 정확히 같은 제목이 우선, 없으면 포함하는 항목이 하나일 때만 */
function pickItems(report: ReportRow, titles: string[]): { ids: string[]; labels: string[] } | { error: string } {
  const ids: string[] = [];
  const labels: string[] = [];
  for (const t of titles) {
    const exact = report.items.filter((i) => i.title === t);
    const hits = exact.length ? exact : report.items.filter((i) => i.title.includes(t));
    if (!hits.length) return { error: `이 주 보고서에서 "${t}" 항목을 찾지 못했습니다. list_weekly_report 로 제목을 확인하세요.` };
    if (hits.length > 1) return { error: `"${t}" 와 맞는 항목이 ${hits.length}건입니다 (${hits.map((h) => h.title).join(", ")}). 제목을 정확히 말해 주세요.` };
    ids.push(hits[0].id);
    labels.push(hits[0].title);
  }
  return { ids, labels };
}

type ItemFields = Partial<{ type: ReportItemType; category: WorkCategory; title: string; description: string; targetDate: string; remarks: string; progress: number; isCompleted: boolean }>;

function enumValue<T extends string>(labels: Record<T, string>, v: unknown, key: string): T | undefined {
  if (v === undefined || v === null || v === "") return undefined;
  const s = String(v).trim();
  if (s in labels) return s as T;
  const byLabel = (Object.entries(labels) as [T, string][]).find(([, l]) => l === s || l.replace(" ", "") === s.replace(" ", ""))?.[0];
  if (byLabel) return byLabel;
  throw new Error(`${key} 값이 올바르지 않습니다: ${s}. 허용값: ${Object.keys(labels).join(", ")}`);
}

export function parseItemFields(raw: unknown): ItemFields {
  const a = obj(raw);
  const allowed = ["type", "category", "title", "description", "targetDate", "remarks", "progress", "isCompleted"];
  const unknown = Object.keys(a).filter((k) => !allowed.includes(k));
  if (unknown.length) throw new Error(`주간보고 항목에 없는 필드: ${unknown.join(", ")}. 쓸 수 있는 필드: ${allowed.join(", ")}`);
  const out: ItemFields = {};
  const type = enumValue(ITEM_TYPE, a.type, "type");
  const category = enumValue(WORK_CATEGORY, a.category, "category");
  if (type) out.type = type;
  if (category) out.category = category;
  for (const k of ["title", "description", "remarks"] as const) if (typeof a[k] === "string" && a[k].trim()) out[k] = a[k].trim();
  if (a.targetDate !== undefined && a.targetDate !== null && a.targetDate !== "") {
    const s = String(a.targetDate).trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(s) || Number.isNaN(new Date(s).getTime())) throw new Error("targetDate 는 YYYY-MM-DD 형식이어야 합니다.");
    out.targetDate = s;
  }
  if (a.progress !== undefined && a.progress !== null) {
    if (typeof a.progress !== "number" || !Number.isFinite(a.progress)) throw new Error("progress 는 0~100 숫자여야 합니다.");
    out.progress = Math.min(Math.max(Math.round(a.progress), 0), 100);
  }
  if (a.isCompleted !== undefined && a.isCompleted !== null) {
    if (typeof a.isCompleted !== "boolean") throw new Error("isCompleted 는 true/false 여야 합니다.");
    out.isCompleted = a.isCompleted;
  }
  return out;
}

function displayOf(f: ItemFields): { label: string; value: string }[] {
  const d: { label: string; value: string }[] = [];
  if (f.type) d.push({ label: "구분", value: ITEM_TYPE[f.type] });
  if (f.title) d.push({ label: "제목", value: f.title });
  if (f.category) d.push({ label: "분류", value: WORK_CATEGORY[f.category] });
  if (f.description) d.push({ label: "내용", value: f.description });
  if (f.targetDate) d.push({ label: "목표일", value: f.targetDate });
  if (f.progress !== undefined) d.push({ label: "진행률", value: `${f.progress}%` });
  if (f.isCompleted !== undefined) d.push({ label: "완료", value: f.isCompleted ? "예" : "아니오" });
  if (f.remarks) d.push({ label: "비고", value: f.remarks });
  return d;
}

async function savePending(ctx: ToolContext, kind: string, args: object, summary: string, fields: { label: string; value: string }[], op: ProposalOp): Promise<ToolResult> {
  const action = await ctx.prisma.chatPendingAction.create({
    data: { userId: ctx.user.id, projectId: ctx.projectId, kind, args, summary, status: "PENDING", expiresAt: new Date(Date.now() + PENDING_ACTION_TTL_MS) },
  });
  return { kind: "proposal", actionId: action.id, summary, fields, op, ...(op === "delete" ? { danger: true } : {}) };
}

const WEEK_PROP = { type: "string", description: "this(이번 주, 기본) · last(지난주) · next(다음 주) · 프로젝트 주차 숫자" };
const FIELD_GUIDE =
  `type[PREVIOUS_RESULT(전주 실적)|NEXT_PLAN(차주 계획)], category[${Object.entries(WORK_CATEGORY).map(([k, v]) => `${k}(${v})`).join("|")}], ` +
  "title, description, targetDate(YYYY-MM-DD), progress(0~100), isCompleted(true/false), remarks";

type WeekOnly = { week: WeekArg };
type CreateArgs = { week: WeekArg; fields: ItemFields };
type UpdateArgs = { week: WeekArg; title: string; fields: ItemFields };
type DeleteArgs = { week: WeekArg; titles: string[] };

export const listWeeklyReportTool: ChatTool<WeekOnly> = {
  name: "list_weekly_report",
  description: "내 주간 업무보고(그 주의 실적·계획 항목)를 보여 준다. 주간보고 항목을 수정·삭제하기 전에 제목을 확인할 때도 쓴다.",
  parameters: { type: "object", properties: { week: WEEK_PROP }, additionalProperties: false },
  kind: "read",
  parse: (args) => ({ week: parseWeek(obj(args).week) }),
  async execute(ctx, { week }) {
    const w = await resolveWeek(ctx, week);
    if ("error" in w) return { kind: "error", message: w.error };
    const report = await findMyReport(ctx, w);
    if (!report) return { kind: "data", summary: `${weekLabel(w)} 내 주간보고가 아직 없습니다. 항목을 등록하면 함께 만들어집니다.`, rows: [] };
    const rows = report.items.map((i) => ({
      구분: ITEM_TYPE[i.type as ReportItemType] ?? i.type, 제목: i.title, 분류: WORK_CATEGORY[i.category as WorkCategory] ?? i.category,
      진행률: i.progress, 완료: i.isCompleted ? "예" : "", 목표일: i.targetDate ? i.targetDate.toISOString().slice(0, 10) : "",
    }));
    return { kind: "data", summary: `${weekLabel(w)} 내 주간보고 (${report.status === "SUBMITTED" ? "제출 완료" : "작성 중"}) 항목 ${rows.length}건`, rows };
  },
};

export const proposeCreateWeeklyItemTool: ChatTool<CreateArgs> = {
  name: "propose_create_weekly_item",
  description: `내 주간 업무보고에 항목(실적·계획) 추가를 제안한다 (실행 안 됨, 확인 카드). 그 주 보고서가 없으면 확인 시 함께 만든다. 필수: type, title. 분류를 말하지 않으면 OTHER. 필드: ${FIELD_GUIDE}`,
  parameters: { type: "object", properties: { week: WEEK_PROP, fields: { type: "object" } }, required: ["fields"], additionalProperties: false },
  kind: "write",
  parse: (args) => {
    const a = obj(args);
    const fields = parseItemFields(a.fields);
    if (!fields.type) throw new Error("type(PREVIOUS_RESULT 전주 실적 / NEXT_PLAN 차주 계획)이 필요합니다.");
    if (!fields.title) throw new Error("title(업무 제목)이 필요합니다.");
    return { week: parseWeek(a.week), fields: { category: "OTHER", ...fields } };
  },
  async execute(ctx, { week, fields }) {
    const w = await resolveWeek(ctx, week);
    if ("error" in w) return { kind: "error", message: w.error };
    const report = await findMyReport(ctx, w);
    const display = [{ label: "주차", value: weekLabel(w) }, ...displayOf(fields), ...(report ? [] : [{ label: "보고서", value: "없음 → 새로 만듦" }])];
    return savePending(ctx, "weekly_item_create", { week: w, reportId: report?.id ?? null, data: fields },
      `주간보고 ${weekLabel(w)} 항목 추가: ${displayOf(fields).map((x) => `${x.label} ${x.value}`).join(" · ")}`, display, "create");
  },
};

export const proposeUpdateWeeklyItemTool: ChatTool<UpdateArgs> = {
  name: "propose_update_weekly_item",
  description: `내 주간 업무보고 항목 수정을 제안한다 (실행 안 됨, 확인 카드). title 은 대상 항목 제목. 사용자가 바꾸라고 한 필드만 넣는다. 필드: ${FIELD_GUIDE}`,
  parameters: { type: "object", properties: { week: WEEK_PROP, title: { type: "string" }, fields: { type: "object" } }, required: ["title", "fields"], additionalProperties: false },
  kind: "write",
  parse: (args) => {
    const a = obj(args);
    const title = typeof a.title === "string" ? a.title.trim() : "";
    if (!title) throw new Error("title(대상 항목 제목)이 필요합니다.");
    const fields = parseItemFields(a.fields);
    if (!Object.keys(fields).length) throw new Error("바꿀 필드(fields)가 하나는 있어야 합니다.");
    return { week: parseWeek(a.week), title, fields };
  },
  async execute(ctx, { week, title, fields }) {
    const w = await resolveWeek(ctx, week);
    if ("error" in w) return { kind: "error", message: w.error };
    const report = await findMyReport(ctx, w);
    if (!report) return { kind: "error", message: `${weekLabel(w)} 내 주간보고가 없습니다.` };
    const r = pickItems(report, [title]);
    if ("error" in r) return { kind: "error", message: r.error };
    const display = [{ label: "주차", value: weekLabel(w) }, { label: "대상", value: r.labels[0] }, ...displayOf(fields)];
    return savePending(ctx, "weekly_item_update", { reportId: report.id, itemIds: r.ids, labels: r.labels, patch: fields },
      `주간보고 ${weekLabel(w)} 항목 수정: ${displayOf(fields).map((x) => `${x.label} ${x.value}`).join(" · ")}`, display, "update");
  },
};

export const proposeDeleteWeeklyItemsTool: ChatTool<DeleteArgs> = {
  name: "propose_delete_weekly_items",
  description: `내 주간 업무보고 항목 삭제를 제안한다 (실행 안 됨, 빨간 확인 카드). titles 는 대상 항목 제목 목록, 한 번에 최대 ${MAX_ITEMS}건. 사용자가 삭제를 분명히 요청했을 때만 쓴다.`,
  parameters: { type: "object", properties: { week: WEEK_PROP, titles: { type: "array", items: { type: "string" } } }, required: ["titles"], additionalProperties: false },
  kind: "write",
  parse: (args) => {
    const a = obj(args);
    const titles = [...new Set((Array.isArray(a.titles) ? a.titles : [a.titles]).map((x) => (typeof x === "string" ? x.trim() : "")).filter(Boolean))];
    if (!titles.length) throw new Error("titles(삭제할 항목 제목 목록)가 필요합니다.");
    if (titles.length > MAX_ITEMS) throw new Error(`한 번에 최대 ${MAX_ITEMS}건까지 삭제할 수 있습니다 (요청 ${titles.length}건).`);
    return { week: parseWeek(a.week), titles };
  },
  async execute(ctx, { week, titles }) {
    const w = await resolveWeek(ctx, week);
    if ("error" in w) return { kind: "error", message: w.error };
    const report = await findMyReport(ctx, w);
    if (!report) return { kind: "error", message: `${weekLabel(w)} 내 주간보고가 없습니다.` };
    const r = pickItems(report, titles);
    if ("error" in r) return { kind: "error", message: r.error };
    return savePending(ctx, "weekly_item_delete", { reportId: report.id, itemIds: r.ids, labels: r.labels },
      `주간보고 ${weekLabel(w)} 항목 ${r.ids.length}건 삭제`, [{ label: "주차", value: weekLabel(w) }, { label: "대상", value: r.labels.join(", ") }], "delete");
  },
};

export const WEEKLY_REPORT_TOOLS = [listWeeklyReportTool, proposeCreateWeeklyItemTool, proposeUpdateWeeklyItemTool, proposeDeleteWeeklyItemsTool];
