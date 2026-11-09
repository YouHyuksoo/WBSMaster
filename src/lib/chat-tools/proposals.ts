/**
 * @file src/lib/chat-tools/proposals.ts
 * @description
 * AI 채팅 쓰기 제안 도구(propose_*)입니다. TASK·이슈·고객이슈·협의요청의 등록·수정을 "제안"으로만 저장하고
 * 확인 카드로 돌려줍니다. 실제 DB 변경은 사용자가 [등록]을 눌렀을 때 /api/chat/actions/[id]/confirm 이 한다.
 *
 * 초보자 가이드:
 * - 담당자는 이름(assigneeName)으로 받아 resolvePerson 으로 찾는다. 애매하면 후보 선택, 없으면 오류.
 * - 수정 대상은 코드(ISS-011, IS0003, DIS-0002)를 현재 프로젝트 안에서 찾는다. TASK 는 list_tasks 의 id.
 * - 제안은 chat_pending_actions 에 30분 만료로 저장된다 (args 는 서비스 입력 그대로).
 */

import { enumList, obj, optDate, optString } from "./args";
import { resolvePerson } from "./people";
import { resolveRecordByCode } from "./records";
import { termGuide, termLabel, type TermDictionaryKey } from "./term-dictionary";
import type { ChatTool, ToolContext, ToolResult } from "./types";

export const PENDING_ACTION_TTL_MS = 30 * 60_000;

type FieldSpec = { key: string; label: string; type: "string" | "date" | "enum" | "person" | "int" | "options"; enumKey?: TermDictionaryKey; required?: boolean };
type Target = null | { by: "code"; table: string } | { by: "task" };
type Spec = { name: string; kind: string; what: string; target: Target; fields: FieldSpec[] };

const S = (key: string, label: string, required = false): FieldSpec => ({ key, label, type: "string", required });
const D = (key: string, label: string): FieldSpec => ({ key, label, type: "date" });
const E = (key: string, label: string, enumKey: TermDictionaryKey, required = false): FieldSpec => ({ key, label, type: "enum", enumKey, required });
const PERSON: FieldSpec = { key: "assigneeName", label: "담당", type: "person" };

const SPECS: Spec[] = [
  { name: "propose_create_task", kind: "create_task", what: "TASK(칸반) 등록", target: null,
    fields: [S("title", "제목", true), S("description", "설명"), PERSON, E("priority", "우선순위", "taskPriority"), D("startDate", "시작일"), D("dueDate", "마감일")] },
  { name: "propose_update_task", kind: "update_task", what: "TASK 수정 (taskId 는 list_tasks 결과의 id)", target: { by: "task" },
    fields: [S("title", "제목"), E("status", "상태", "taskStatus"), E("priority", "우선순위", "taskPriority"), { key: "progress", label: "진행률", type: "int" }, PERSON, D("dueDate", "마감일")] },
  { name: "propose_create_issue", kind: "create_issue", what: "이슈사항 등록", target: null,
    fields: [S("title", "제목", true), S("description", "설명"), E("priority", "우선순위", "issuePriority"), E("category", "유형", "issueCategory"), PERSON, D("dueDate", "기한")] },
  { name: "propose_update_issue", kind: "update_issue", what: "이슈사항 수정 (code 예: ISS-011)", target: { by: "code", table: "issues" },
    fields: [S("title", "제목"), E("status", "상태", "issueStatus"), E("priority", "우선순위", "issuePriority"), PERSON, D("dueDate", "기한")] },
  { name: "propose_create_field_issue", kind: "create_field_issue", what: "고객이슈 등록 (담당자는 이름 문자열)", target: null,
    fields: [S("title", "이슈관리명", true), S("description", "내용"), S("issuer", "제기자"), S("assignee", "담당"), D("targetDate", "목표일")] },
  { name: "propose_update_field_issue", kind: "update_field_issue", what: "고객이슈 수정 (code 예: IS0003)", target: { by: "code", table: "field_issues" },
    fields: [E("status", "상태", "fieldIssueStatus"), S("assignee", "담당"), S("finalSolution", "최종 조치"), D("targetDate", "목표일")] },
  { name: "propose_create_discussion_item", kind: "create_discussion_item", what: "협의요청 등록 (선택지 2개 이상 필수)", target: null,
    fields: [S("title", "협의 주제", true), S("description", "내용"), E("stage", "발생 단계", "discussionStage", true), E("priority", "우선순위", "discussionPriority"), { key: "options", label: "선택지", type: "options", required: true }, PERSON, D("dueDate", "기한")] },
  { name: "propose_update_discussion_item", kind: "update_discussion_item", what: "협의요청 수정 (code 예: DIS-0002)", target: { by: "code", table: "discussion_items" },
    fields: [E("status", "상태", "discussionStatus"), S("decision", "결정 내용"), PERSON, D("dueDate", "기한")] },
];

type Parsed = { code?: string; taskId?: string; values: Record<string, unknown> };

function parseField(f: FieldSpec, v: unknown): unknown {
  if (f.type === "enum") return enumList(v, f.enumKey!, f.key)?.[0];
  if (f.type === "date") return optDate(v, f.key)?.toISOString().slice(0, 10);
  if (f.type === "int") return typeof v === "number" ? Math.min(Math.max(Math.round(v), 0), 100) : undefined;
  if (f.type === "options") {
    if (v === undefined) return undefined;
    const list = (Array.isArray(v) ? v : []).map((x) => (typeof x === "string" ? x.trim() : "")).filter(Boolean);
    if (list.length < 2) throw new Error("선택지(options)는 2개 이상이어야 합니다.");
    return list;
  }
  return optString(v);
}

function proposalTool(spec: Spec): ChatTool<Parsed> {
  const props: Record<string, unknown> = {};
  const guide: string[] = [];
  if (spec.target?.by === "code") props.code = { type: "string" };
  if (spec.target?.by === "task") props.taskId = { type: "string" };
  for (const f of spec.fields) {
    props[f.key] = f.type === "options" ? { type: "array", items: { type: "string" } } : f.type === "int" ? { type: "integer" } : { type: "string" };
    if (f.enumKey) guide.push(`${f.key}: ${termGuide(f.enumKey)}`);
  }
  const required = [...(spec.target?.by === "code" ? ["code"] : spec.target?.by === "task" ? ["taskId"] : []), ...spec.fields.filter((f) => f.required).map((f) => f.key)];
  return {
    name: spec.name,
    description:
      `${spec.what}을 제안한다. 실행되지 않고 사용자 확인 카드가 뜬다. 날짜는 YYYY-MM-DD. ` +
      `${spec.target ? "수정은 사용자가 바꾸라고 말한 항목만 넣는다 (현재 값을 다시 넣지 않는다). " : ""}${guide.join(" / ")}`,
    parameters: { type: "object", properties: props, required, additionalProperties: false },
    kind: "write",
    parse(args) {
      const a = obj(args);
      const values: Record<string, unknown> = {};
      for (const f of spec.fields) {
        const v = parseField(f, a[f.key]);
        if (f.required && (v === undefined || v === "")) throw new Error(`${f.label}(${f.key})는 필수입니다.`);
        if (v !== undefined) values[f.key] = v;
      }
      const code = optString(a.code);
      const taskId = optString(a.taskId);
      if (spec.target?.by === "code" && !code) throw new Error("code 가 필요합니다.");
      if (spec.target?.by === "task" && !taskId) throw new Error("taskId 가 필요합니다.");
      return { code, taskId, values };
    },
    execute: (ctx, parsed) => executeProposal(spec, ctx, parsed),
  };
}

async function executeProposal(spec: Spec, ctx: ToolContext, { code, taskId, values }: Parsed): Promise<ToolResult> {
  // 1) 수정 대상을 현재 프로젝트 안에서 찾는다
  let targetId: string | undefined;
  if (spec.target?.by === "code") {
    const found = await resolveRecordByCode(ctx, code!);
    if (!found || found.table !== spec.target.table) return { kind: "error", message: `현재 프로젝트에 ${code} 가 없습니다.` };
    targetId = found.id;
  } else if (spec.target?.by === "task") {
    const task = await ctx.prisma.task.findFirst({ where: { id: taskId!, projectId: ctx.projectId }, select: { id: true } });
    if (!task) return { kind: "error", message: "현재 프로젝트에 그 TASK 가 없습니다. list_tasks 로 id 를 확인하세요." };
    targetId = task.id;
  }

  // 2) 담당자 이름 → 사용자 id
  const data: Record<string, unknown> = { ...values };
  const display: { label: string; value: string }[] = [];
  if (typeof values.assigneeName === "string") {
    const m = await resolvePerson(ctx, values.assigneeName);
    if (m.status === "ambiguous") {
      return { kind: "candidates", prompt: `"${values.assigneeName}" 담당자를 골라 주세요.`, options: m.matches.map((x) => ({ label: x.name, value: x.name })) };
    }
    if (m.status === "none") return { kind: "error", message: `"${values.assigneeName}" 와 맞는 프로젝트 구성원이 없습니다. find_people 로 확인하세요.` };
    delete data.assigneeName;
    data.assigneeId = m.matches[0].id;
    display.push({ label: "담당", value: m.matches[0].name });
  }
  for (const f of spec.fields) {
    if (f.type === "person" || values[f.key] === undefined) continue;
    const v = values[f.key];
    display.push({ label: f.label, value: Array.isArray(v) ? (v as string[]).join(" / ") : f.type === "enum" ? termLabel(f.enumKey!, String(v)) : String(v) });
  }
  if (!display.length && targetId) return { kind: "error", message: "바꿀 내용이 없습니다." };

  // 3) 제안 저장 (실행은 확인 API 가 한다)
  const head = `${spec.what.split(" (")[0]}${code ? ` ${code}` : ""}`;
  const summary = `${head}: ${display.map((d) => `${d.label} ${d.value}`).join(" · ")}`;
  const action = await ctx.prisma.chatPendingAction.create({
    data: {
      userId: ctx.user.id,
      projectId: ctx.projectId,
      kind: spec.kind,
      args: (targetId ? { targetId, patch: data } : data) as object,
      summary,
      status: "PENDING",
      expiresAt: new Date(Date.now() + PENDING_ACTION_TTL_MS),
    },
  });
  return { kind: "proposal", actionId: action.id, summary, fields: display, op: targetId ? "update" : "create" };
}

type WbsArgs = { codes: string[]; assigneeNames?: string[]; mode: "add" | "replace"; status?: string; progress?: number; startDate?: string; endDate?: string };

/**
 * WBS 일괄 수정 제안: 코드 여러 개에 담당자(여러 명)·상태·진행률·기간을 한 번에.
 * 예) "지연된 레벨2 전체에 강승훈·허민 공동 배정" → codes 7개 + assigneeNames 2명, mode add
 */
const proposeUpdateWbsTool: ChatTool<WbsArgs> = {
  name: "propose_update_wbs",
  description:
    "WBS 항목 수정(담당자 배정·상태·진행률·기간)을 제안한다. 실행되지 않고 확인 카드가 뜬다. " +
    "codes 는 WBS 코드 목록(예: 1.1, 2.3), 앞서 list_wbs 로 조회한 코드를 그대로 쓴다. assigneeNames 는 여러 명 가능(공동 배정). " +
    `mode: add(기존 담당자에 추가, 기본) / replace(담당자 교체). 날짜는 YYYY-MM-DD. status: ${termGuide("taskStatus")}. ` +
    "status·progress·startDate·endDate 는 사용자가 그 값을 바꾸라고 말했을 때만 넣는다 (담당자 배정만 요청하면 assigneeNames 만).",
  parameters: {
    type: "object",
    properties: {
      codes: { type: "array", items: { type: "string" } },
      assigneeNames: { type: "array", items: { type: "string" } },
      mode: { type: "string", enum: ["add", "replace"] },
      status: { type: "string" },
      progress: { type: "integer" },
      startDate: { type: "string" },
      endDate: { type: "string" },
    },
    required: ["codes"],
    additionalProperties: false,
  },
  kind: "write",
  parse(args) {
    const a = obj(args);
    const codes = (Array.isArray(a.codes) ? a.codes : [a.codes]).map((c) => (typeof c === "string" ? c.trim() : "")).filter(Boolean);
    if (!codes.length) throw new Error("codes(WBS 코드 목록)가 필요합니다.");
    const names = Array.isArray(a.assigneeNames) ? a.assigneeNames.map((n) => (typeof n === "string" ? n.trim() : "")).filter(Boolean) : undefined;
    const out: WbsArgs = {
      codes: [...new Set(codes)],
      assigneeNames: names?.length ? names : undefined,
      mode: a.mode === "replace" ? "replace" : "add",
      status: enumList(a.status, "taskStatus", "status")?.[0],
      progress: parseField({ key: "progress", label: "진행률", type: "int" }, a.progress) as number | undefined,
      startDate: parseField(D("startDate", "시작일"), a.startDate) as string | undefined,
      endDate: parseField(D("endDate", "종료일"), a.endDate) as string | undefined,
    };
    if (!out.assigneeNames && !out.status && out.progress === undefined && !out.startDate && !out.endDate) {
      throw new Error("바꿀 내용(assigneeNames·status·progress·startDate·endDate)이 하나는 있어야 합니다.");
    }
    return out;
  },
  async execute(ctx, a) {
    // 1) 코드 → 현재 프로젝트의 WBS 항목
    const items = await ctx.prisma.wbsItem.findMany({
      where: { projectId: ctx.projectId, code: { in: a.codes } },
      select: { id: true, code: true, status: true, progress: true, startDate: true, endDate: true },
    });
    const found = new Map(items.map((i) => [i.code, i.id]));
    const missing = a.codes.filter((c) => !found.has(c));
    if (missing.length) return { kind: "error", message: `현재 프로젝트에 없는 WBS 코드: ${missing.join(", ")}. list_wbs 로 코드를 확인하세요.` };

    // 2) 담당자 이름들 → 사용자 id
    const patch: Record<string, unknown> = {};
    const display: { label: string; value: string }[] = [{ label: "대상", value: a.codes.join(", ") }];
    if (a.assigneeNames) {
      const ids: string[] = [];
      const names: string[] = [];
      for (const n of a.assigneeNames) {
        const m = await resolvePerson(ctx, n);
        if (m.status === "ambiguous") return { kind: "candidates", prompt: `"${n}" 담당자를 골라 주세요.`, options: m.matches.map((x) => ({ label: x.name, value: x.name })) };
        if (m.status === "none") return { kind: "error", message: `"${n}" 와 맞는 프로젝트 구성원이 없습니다. find_people 로 확인하세요.` };
        ids.push(m.matches[0].id);
        names.push(m.matches[0].name);
      }
      patch.assigneeIds = [...new Set(ids)];
      display.push({ label: "담당", value: names.join(", ") }, { label: "방식", value: a.mode === "add" ? "기존 담당자에 추가" : "담당자 교체" });
    }
    // 모든 대상이 이미 그 값이면 뺀다 (LLM 이 묻지 않은 현재 값을 다시 넣어 진행 중 항목을 되돌리는 일 방지)
    const sameAsNow = (k: "status" | "progress" | "startDate" | "endDate") =>
      items.every((i) => {
        const cur = i[k] instanceof Date ? (i[k] as Date).toISOString().slice(0, 10) : i[k];
        return cur === a[k];
      });
    for (const [k, label] of [["status", "상태"], ["progress", "진행률"], ["startDate", "시작일"], ["endDate", "종료일"]] as const) {
      if (a[k] !== undefined && !sameAsNow(k)) {
        patch[k] = a[k];
        display.push({ label, value: k === "status" ? termLabel("taskStatus", String(a[k])) : String(a[k]) });
      }
    }

    // 3) 제안 저장
    const summary = `WBS ${a.codes.length}건 수정: ${display.slice(1).map((d) => `${d.label} ${d.value}`).join(" · ")}`;
    const action = await ctx.prisma.chatPendingAction.create({
      data: {
        userId: ctx.user.id,
        projectId: ctx.projectId,
        kind: "update_wbs",
        args: { targetIds: a.codes.map((c) => found.get(c)!), codes: a.codes, mode: a.mode, patch } as object,
        summary,
        status: "PENDING",
        expiresAt: new Date(Date.now() + PENDING_ACTION_TTL_MS),
      },
    });
    return { kind: "proposal", actionId: action.id, summary, fields: display, op: "update" };
  },
};

export const PROPOSAL_TOOLS: Record<string, ChatTool<Parsed>> = {
  ...Object.fromEntries(SPECS.map((s) => [s.name, proposalTool(s)])),
  propose_update_wbs: proposeUpdateWbsTool as unknown as ChatTool<Parsed>,
};
