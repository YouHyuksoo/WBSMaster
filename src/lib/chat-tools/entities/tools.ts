/**
 * @file src/lib/chat-tools/entities/tools.ts
 * @description
 * AI 채팅 공통 등록·수정·삭제 제안 도구입니다: propose_create_record · propose_update_record · propose_delete_records.
 *
 * 초보자 가이드:
 * - entity(메뉴 키)와 fields(화면 API 필드 이름) 로 받는다. 메뉴별 필드는 specs-*.ts 에 있다.
 * - 수정·삭제 대상(refs)은 코드·이름·제목으로 현재 프로젝트 안에서 찾는다. 같은 이름이 여러 개면 코드로 다시 말해 달라고 한다.
 * - 담당자 이름은 프로젝트 구성원으로 찾아 id 로 바꾼다 (애매하면 후보 선택).
 * - 삭제는 한 번에 최대 20건, 확인 카드가 빨간 [삭제] 로 뜨고 함께 지워지는 데이터를 알려 준다.
 * - 저장만 하고 실행은 확인 API 가 화면 API 핸들러로 한다 (execute.ts).
 */

import { obj } from "../args";
import { resolvePerson } from "../people";
import { PENDING_ACTION_TTL_MS } from "../proposals";
import type { ChatTool, ProposalOp, ToolContext, ToolResult } from "../types";
import type { EntityField, EntitySpec } from "./types";

export const MAX_DELETE = 20;
type Db = Record<string, { findMany(a: unknown): Promise<Record<string, unknown>[]> }> & {
  chatPendingAction: { create(a: unknown): Promise<{ id: string }> };
};

function fieldGuide(f: EntityField): string {
  const req = f.required ? "*" : "";
  if (f.type === "enum") return `${f.key}${req}[${f.values!.map((v) => (f.labels?.[v] ? `${v}(${f.labels[v]})` : v)).join("|")}]`;
  if (f.type === "person") return `${f.key}${req}(사람 이름)`;
  if (f.type === "people") return `${f.key}${req}(이름 배열)`;
  if (f.type === "list") return `${f.key}${req}(문자열 배열${f.createOnly ? ", 등록 때만" : ""})`;
  return `${f.key}${req}(${f.type === "date" ? "YYYY-MM-DD" : f.type})`;
}

function parseValue(f: EntityField, v: unknown): unknown {
  if (v === undefined || v === null || v === "") return undefined;
  switch (f.type) {
    case "date": {
      const s = String(v).trim();
      if (!/^\d{4}-\d{2}-\d{2}/.test(s) || Number.isNaN(new Date(s).getTime())) throw new Error(`${f.key} 는 YYYY-MM-DD 형식이어야 합니다.`);
      return s.slice(0, 10);
    }
    case "int":
      if (typeof v !== "number" || !Number.isFinite(v)) throw new Error(`${f.key} 는 숫자여야 합니다.`);
      return Math.round(v);
    case "bool":
      if (typeof v !== "boolean") throw new Error(`${f.key} 는 true/false 여야 합니다.`);
      return v;
    case "enum": {
      // 한글 라벨로 와도 받아 준다 (예: "진행중" → IN_PROGRESS)
      const byLabel = Object.entries(f.labels ?? {}).find(([, label]) => label === String(v).trim())?.[0];
      if (byLabel) return byLabel;
      if (!f.values!.includes(String(v))) throw new Error(`${f.key} 값이 올바르지 않습니다: ${String(v)}. 허용값: ${f.values!.join(", ")}`);
      return String(v);
    }
    case "list":
    case "people": {
      const list = (Array.isArray(v) ? v : [v]).map((x) => String(x).trim()).filter(Boolean);
      return list.length ? list : undefined;
    }
    default:
      return String(v).trim() || undefined;
  }
}

function parseFields(spec: EntitySpec, raw: unknown, forCreate: boolean): Record<string, unknown> {
  const input = obj(raw);
  const allowed = new Map(spec.fields.map((f) => [f.key, f]));
  const unknown = Object.keys(input).filter((k) => !allowed.has(k));
  if (unknown.length) throw new Error(`${spec.label}에 없는 필드: ${unknown.join(", ")}. 쓸 수 있는 필드: ${spec.fields.map((f) => f.key).join(", ")}`);
  const out: Record<string, unknown> = {};
  for (const f of spec.fields) {
    const v = parseValue(f, input[f.key]);
    if (!forCreate && f.createOnly && v !== undefined) throw new Error(`${f.key}(${f.label})는 등록할 때만 넣을 수 있습니다.`);
    if (forCreate && f.required && v === undefined) throw new Error(`${spec.label} 등록에는 ${f.key}(${f.label})가 필요합니다.`);
    if (v !== undefined) out[f.key] = v;
  }
  return out;
}

function getSpec(specs: EntitySpec[], entity: unknown, op: "create" | "update" | "delete"): EntitySpec {
  const spec = specs.find((s) => s.key === entity);
  if (!spec) throw new Error(`entity 는 다음 중 하나입니다: ${specs.map((s) => s.key).join(", ")}`);
  if (!spec.ops[op]) throw new Error(`${spec.label}은(는) 이 도구로 ${op === "create" ? "등록" : op === "update" ? "수정" : "삭제"}할 수 없습니다.`);
  return spec;
}

function parseRefs(v: unknown, max?: number): string[] {
  const refs = [...new Set((Array.isArray(v) ? v : [v]).map((x) => (typeof x === "string" ? x.trim() : "")).filter(Boolean))];
  if (!refs.length) throw new Error("refs(대상 코드·이름 목록)가 필요합니다.");
  if (max && refs.length > max) throw new Error(`한 번에 최대 ${max}건까지 처리할 수 있습니다 (요청 ${refs.length}건).`);
  return refs;
}

/** 대상 코드·이름 → id. 없거나 여러 개면 오류 문구 */
async function resolveRefs(spec: EntitySpec, ctx: ToolContext, refs: string[]): Promise<{ ids: string[]; labels: string[] } | { error: string }> {
  const db = ctx.prisma as unknown as Db;
  const scope = spec.scope ? spec.scope(ctx.projectId) : { projectId: ctx.projectId };
  const rows = await db[spec.model].findMany({
    where: { ...scope, OR: spec.refFields.flatMap((f) => refs.map((r) => ({ [f]: r }))) },
    select: Object.fromEntries([["id", true], ...spec.refFields.map((f) => [f, true])]),
  });
  const ids: string[] = [];
  const labels: string[] = [];
  for (const ref of refs) {
    const hits = rows.filter((row) => spec.refFields.some((f) => row[f] === ref));
    if (hits.length === 0) return { error: `현재 프로젝트의 ${spec.label}에서 "${ref}" 를 찾지 못했습니다. 목록 도구로 코드·이름을 확인하세요.` };
    if (hits.length > 1) return { error: `${spec.label}에 "${ref}" 가 ${hits.length}건 있습니다. 코드처럼 하나로 정해지는 값으로 다시 말해 주세요.` };
    ids.push(String(hits[0].id));
    labels.push(ref);
  }
  return { ids, labels };
}

/** 사람 이름 필드 → id (to 칼럼). 후보·오류면 ToolResult 를 돌려준다 */
async function resolvePeople(spec: EntitySpec, ctx: ToolContext, data: Record<string, unknown>, display: { label: string; value: string }[]): Promise<ToolResult | null> {
  for (const f of spec.fields.filter((x) => x.type === "person" || x.type === "people")) {
    const v = data[f.key];
    if (v === undefined) continue;
    const names = Array.isArray(v) ? (v as string[]) : [String(v)];
    const ids: string[] = [];
    const found: string[] = [];
    for (const n of names) {
      const m = await resolvePerson(ctx, n);
      if (m.status === "ambiguous") return { kind: "candidates", prompt: `"${n}" 를 골라 주세요.`, options: m.matches.map((x) => ({ label: x.name, value: x.name })) };
      if (m.status === "none") return { kind: "error", message: `"${n}" 와 맞는 프로젝트 구성원이 없습니다. find_people 로 확인하세요.` };
      ids.push(m.matches[0].id);
      found.push(m.matches[0].name);
    }
    delete data[f.key];
    data[f.to ?? f.key] = f.type === "people" ? ids : ids[0];
    display.push({ label: f.label, value: found.join(", ") });
  }
  return null;
}

function displayOf(spec: EntitySpec, data: Record<string, unknown>): { label: string; value: string }[] {
  return spec.fields.filter((f) => f.type !== "person" && f.type !== "people" && data[f.key] !== undefined).map((f) => ({ label: f.label, value: Array.isArray(data[f.key]) ? (data[f.key] as string[]).join(" / ") : f.labels?.[String(data[f.key])] ?? String(data[f.key]) }));
}

async function savePending(ctx: ToolContext, kind: string, args: object, summary: string, fields: { label: string; value: string }[], danger = false): Promise<ToolResult> {
  const action = await (ctx.prisma as unknown as Db).chatPendingAction.create({
    data: { userId: ctx.user.id, projectId: ctx.projectId, kind, args, summary, status: "PENDING", expiresAt: new Date(Date.now() + PENDING_ACTION_TTL_MS) },
  });
  const op: ProposalOp = kind === "entity_delete" ? "delete" : kind === "entity_update" ? "update" : "create";
  return { kind: "proposal", actionId: action.id, summary, fields, op, ...(danger ? { danger: true } : {}) };
}

export function makeEntityTools(specs: EntitySpec[]): ChatTool<{ spec: EntitySpec; refs?: string[]; data?: Record<string, unknown> }>[] {
  const guide = (op: "create" | "update" | "delete") =>
    specs.filter((s) => s.ops[op]).map((s) => (op === "delete" ? `${s.key}(${s.label}, 대상: ${s.refFields.join("/")})` : `${s.key}(${s.label}): ${s.fields.map(fieldGuide).join(", ")}`)).join(" / ");
  const entityProp = (op: "create" | "update" | "delete") => ({ type: "string", enum: specs.filter((s) => s.ops[op]).map((s) => s.key) });

  return [
    {
      name: "propose_create_record",
      description: `여러 메뉴의 등록을 제안한다 (실행 안 됨, 확인 카드). * 는 필수. 전용 도구가 있는 TASK·이슈·고객이슈·협의요청·주간보고 항목은 그 도구를 쓴다. ${guide("create")}`,
      parameters: { type: "object", properties: { entity: entityProp("create"), fields: { type: "object" } }, required: ["entity", "fields"], additionalProperties: false },
      kind: "write",
      parse: (args) => {
        const a = obj(args);
        const spec = getSpec(specs, a.entity, "create");
        return { spec, data: parseFields(spec, a.fields, true) };
      },
      async execute(ctx, { spec, data }) {
        const d = { ...data! };
        const display = displayOf(spec, d);
        const stop = await resolvePeople(spec, ctx, d, display);
        if (stop) return stop;
        const prepared = spec.prepareCreate ? await spec.prepareCreate(ctx, d) : d;
        if ("error" in prepared && typeof prepared.error === "string") return { kind: "error", message: prepared.error };
        return savePending(ctx, "entity_create", { entity: spec.key, data: prepared }, `${spec.label} 등록: ${display.map((x) => `${x.label} ${x.value}`).join(" · ")}`, display);
      },
    },
    {
      name: "propose_update_record",
      description: `여러 메뉴의 수정을 제안한다 (실행 안 됨, 확인 카드). refs 는 대상 코드·이름 목록. 사용자가 바꾸라고 한 필드만 넣는다. ${guide("update")}`,
      parameters: { type: "object", properties: { entity: entityProp("update"), refs: { type: "array", items: { type: "string" } }, fields: { type: "object" } }, required: ["entity", "refs", "fields"], additionalProperties: false },
      kind: "write",
      parse: (args) => {
        const a = obj(args);
        const spec = getSpec(specs, a.entity, "update");
        const data = parseFields(spec, a.fields, false);
        if (!Object.keys(data).length) throw new Error("바꿀 필드(fields)가 하나는 있어야 합니다.");
        return { spec, refs: parseRefs(a.refs, MAX_DELETE), data };
      },
      async execute(ctx, { spec, refs, data }) {
        const r = await resolveRefs(spec, ctx, refs!);
        if ("error" in r) return { kind: "error", message: r.error };
        const d = { ...data! };
        const display = [{ label: "대상", value: r.labels.join(", ") }, ...displayOf(spec, d)];
        const stop = await resolvePeople(spec, ctx, d, display);
        if (stop) return stop;
        return savePending(ctx, "entity_update", { entity: spec.key, targetIds: r.ids, labels: r.labels, patch: d }, `${spec.label} ${r.ids.length}건 수정: ${display.slice(1).map((x) => `${x.label} ${x.value}`).join(" · ")}`, display);
      },
    },
    {
      name: "propose_delete_records",
      description: `여러 메뉴의 삭제를 제안한다 (실행 안 됨, 빨간 확인 카드). 한 번에 최대 ${MAX_DELETE}건. refs 는 대상 코드·이름 목록. 사용자가 삭제를 분명히 요청했을 때만 쓴다. ${guide("delete")}`,
      parameters: { type: "object", properties: { entity: entityProp("delete"), refs: { type: "array", items: { type: "string" } } }, required: ["entity", "refs"], additionalProperties: false },
      kind: "write",
      parse: (args) => {
        const a = obj(args);
        return { spec: getSpec(specs, a.entity, "delete"), refs: parseRefs(a.refs, MAX_DELETE) };
      },
      async execute(ctx, { spec, refs }) {
        const r = await resolveRefs(spec, ctx, refs!);
        if ("error" in r) return { kind: "error", message: r.error };
        const fields = [{ label: "대상", value: r.labels.join(", ") }];
        const impact = spec.deleteImpact ? await spec.deleteImpact(ctx, r.ids) : undefined;
        if (impact) fields.push({ label: "함께 삭제", value: impact });
        return savePending(ctx, "entity_delete", { entity: spec.key, targetIds: r.ids, labels: r.labels }, `${spec.label} ${r.ids.length}건 삭제`, fields, true);
      },
    },
  ];
}
