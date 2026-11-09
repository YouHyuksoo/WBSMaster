/**
 * @file src/lib/chat-tools/meeting-items.ts
 * @description
 * AI 채팅의 회의록 조회와 회의 내용 항목(내용·담당자·일정·추진현황) 추가·변경·삭제 제안 도구입니다.
 *
 * 초보자 가이드:
 * - 회의록 머리 정보 등록·수정·삭제는 공통 도구(entity meeting_minute)가 한다. 여기서는 내용 항목만 다룬다.
 * - 화면 API 의 PATCH 는 items 를 보내면 내용 항목 전체를 바꾼다. 그래서 현재 항목에 추가·변경·삭제를 적용한
 *   전체 목록을 공통 수정 제안(entity_update)으로 저장하고, 확인하면 화면 API 로 실행된다.
 * - 항목은 내용 문구로 찾는다 (정확히 같은 내용 우선, 없으면 포함하는 항목이 하나일 때만).
 */

import { obj } from "./args";
import { PENDING_ACTION_TTL_MS } from "./proposals";
import type { ChatTool, ToolContext } from "./types";
import { MEETING_ITEM_STATUSES, type MeetingItemStatus } from "@/lib/meeting-minutes";

export const ITEM_STATUS: Record<MeetingItemStatus, string> = { PLANNED: "예정", IN_PROGRESS: "진행중", DONE: "완료", HOLD: "보류" };
const MAX_CHANGES = 20;

type Item = { content: string; assignee: string | null; dueDate: string | null; status: string };
type Minute = { id: string; code: string; title: string; meetingDate: Date; items: Item[] };
type ItemPatch = Partial<{ content: string; assignee: string; dueDate: string; status: MeetingItemStatus }>;
type Args = { minute: string; add: ItemPatch[]; update: (ItemPatch & { match: string })[]; remove: string[] };

function status(v: unknown): MeetingItemStatus | undefined {
  if (v === undefined || v === null || v === "") return undefined;
  const s = String(v).trim();
  if ((MEETING_ITEM_STATUSES as readonly string[]).includes(s)) return s as MeetingItemStatus;
  const byLabel = (Object.entries(ITEM_STATUS) as [MeetingItemStatus, string][]).find(([, l]) => l === s.replace(" ", ""))?.[0];
  if (byLabel) return byLabel;
  throw new Error(`status 는 ${MEETING_ITEM_STATUSES.map((k) => `${k}(${ITEM_STATUS[k]})`).join(" · ")} 중 하나입니다: ${s}`);
}

function itemPatch(raw: unknown): ItemPatch {
  const a = obj(raw);
  const out: ItemPatch = {};
  for (const k of ["content", "assignee", "dueDate"] as const) if (typeof a[k] === "string" && a[k].trim()) out[k] = a[k].trim();
  const st = status(a.status);
  if (st) out.status = st;
  return out;
}

const arr = (v: unknown): unknown[] => (v === undefined || v === null ? [] : Array.isArray(v) ? v : [v]);

export function parseMeetingItemArgs(args: unknown): Args {
  const a = obj(args);
  const minute = typeof a.minute === "string" ? a.minute.trim() : "";
  if (!minute) throw new Error("minute(회의록 문서번호 또는 회의 목적)가 필요합니다.");
  const add = arr(a.add).map(itemPatch);
  if (add.some((x) => !x.content)) throw new Error("add 항목에는 content(내용)가 필요합니다.");
  const update = arr(a.update).map((raw) => {
    const match = typeof obj(raw).match === "string" ? String(obj(raw).match).trim() : "";
    if (!match) throw new Error("update 항목에는 match(바꿀 항목의 내용 문구)가 필요합니다.");
    const p = itemPatch(raw);
    if (!Object.keys(p).length) throw new Error(`"${match}" 에 바꿀 값(content·assignee·dueDate·status)이 없습니다.`);
    return { match, ...p };
  });
  const remove = arr(a.remove).map((x) => (typeof x === "string" ? x.trim() : "")).filter(Boolean);
  const total = add.length + update.length + remove.length;
  if (!total) throw new Error("add · update · remove 중 하나는 있어야 합니다.");
  if (total > MAX_CHANGES) throw new Error(`한 번에 최대 ${MAX_CHANGES}건까지 바꿀 수 있습니다 (요청 ${total}건).`);
  return { minute, add, update, remove };
}

async function findMinute(ctx: ToolContext, ref: string): Promise<Minute | { error: string }> {
  const select = { id: true, code: true, title: true, meetingDate: true, items: { select: { content: true, assignee: true, dueDate: true, status: true }, orderBy: { sortOrder: "asc" as const } } };
  const exact = (await ctx.prisma.meetingMinute.findMany({ where: { projectId: ctx.projectId, OR: [{ code: ref }, { title: ref }] }, select })) as Minute[];
  const hits = exact.length ? exact : ((await ctx.prisma.meetingMinute.findMany({ where: { projectId: ctx.projectId, title: { contains: ref, mode: "insensitive" } }, select, take: 5 })) as Minute[]);
  if (!hits.length) return { error: `현재 프로젝트 회의록에서 "${ref}" 를 찾지 못했습니다. list_meeting_minutes 로 문서번호를 확인하세요.` };
  if (hits.length > 1) return { error: `"${ref}" 와 맞는 회의록이 여러 건입니다 (${hits.map((h) => `${h.code} ${h.title}`).join(", ")}). 문서번호로 말해 주세요.` };
  return hits[0];
}

function indexOf(items: Item[], match: string, taken: Set<number>): number | string {
  const pick = (pred: (i: Item) => boolean) => items.map((it, i) => (pred(it) && !taken.has(i) ? i : -1)).filter((i) => i >= 0);
  const exact = pick((i) => i.content === match);
  const hits = exact.length ? exact : pick((i) => i.content.includes(match));
  if (!hits.length) return `회의 내용에서 "${match}" 항목을 찾지 못했습니다.`;
  if (hits.length > 1) return `"${match}" 와 맞는 내용 항목이 ${hits.length}건입니다. 내용을 더 길게 말해 주세요.`;
  return hits[0];
}

const short = (s: string) => (s.length > 30 ? `${s.slice(0, 30)}…` : s);
const describe = (p: ItemPatch) =>
  [p.content && `내용 ${short(p.content)}`, p.assignee && `담당 ${p.assignee}`, p.dueDate && `일정 ${p.dueDate}`, p.status && `현황 ${ITEM_STATUS[p.status]}`].filter(Boolean).join(", ");

export const proposeUpdateMeetingItemsTool: ChatTool<Args> = {
  name: "propose_update_meeting_items",
  description:
    "회의록의 내용 항목(내용·담당자·일정·추진현황) 추가·변경·삭제를 제안한다 (실행 안 됨, 확인 카드). minute 는 문서번호(YYYYMMDD-NNN) 또는 회의 목적. " +
    "add: [{content*, assignee, dueDate(자유 문구, 예 11/20), status}], update: [{match*(바꿀 항목 내용 문구), content, assignee, dueDate, status}], remove: [내용 문구]. " +
    `status: ${MEETING_ITEM_STATUSES.map((k) => `${k}(${ITEM_STATUS[k]})`).join("|")}. 회의록 머리 정보(목적·일자·장소 등)는 propose_update_record(entity meeting_minute)로 바꾼다.`,
  parameters: {
    type: "object",
    properties: {
      minute: { type: "string" },
      add: { type: "array", items: { type: "object" } },
      update: { type: "array", items: { type: "object" } },
      remove: { type: "array", items: { type: "string" } },
    },
    required: ["minute"],
    additionalProperties: false,
  },
  kind: "write",
  parse: parseMeetingItemArgs,
  async execute(ctx, { minute, add, update, remove }) {
    const m = await findMinute(ctx, minute);
    if ("error" in m) return { kind: "error", message: m.error };
    const items: (Item | null)[] = m.items.map((i) => ({ ...i }));
    const taken = new Set<number>();
    const lines: { label: string; value: string }[] = [{ label: "대상", value: `${m.code} ${m.title}` }];
    for (const u of update) {
      const idx = indexOf(m.items, u.match, taken);
      if (typeof idx === "string") return { kind: "error", message: idx };
      taken.add(idx);
      const { match: _match, ...p } = u;
      items[idx] = { ...items[idx]!, ...p };
      lines.push({ label: "변경", value: `${short(m.items[idx].content)} → ${describe(p)}` });
    }
    for (const r of remove) {
      const idx = indexOf(m.items, r, taken);
      if (typeof idx === "string") return { kind: "error", message: idx };
      taken.add(idx);
      items[idx] = null;
      lines.push({ label: "삭제", value: short(m.items[idx].content) });
    }
    for (const a of add) {
      items.push({ content: a.content!, assignee: a.assignee ?? null, dueDate: a.dueDate ?? null, status: a.status ?? "PLANNED" });
      lines.push({ label: "추가", value: describe(a) });
    }
    const next = items.filter((i): i is Item => i !== null);
    const summary = `회의록 ${m.code} 내용 수정: ${[add.length && `추가 ${add.length}`, update.length && `변경 ${update.length}`, remove.length && `삭제 ${remove.length}`].filter(Boolean).join(" · ")}건`;
    const action = await ctx.prisma.chatPendingAction.create({
      data: {
        userId: ctx.user.id, projectId: ctx.projectId, kind: "entity_update", summary, status: "PENDING", expiresAt: new Date(Date.now() + PENDING_ACTION_TTL_MS),
        args: { entity: "meeting_minute", targetIds: [m.id], labels: [m.code], patch: { items: next } },
      },
    });
    return { kind: "proposal", actionId: action.id, summary, fields: lines, op: "update" };
  },
};

export const listMeetingMinutesTool: ChatTool<{ minute?: string; search?: string }> = {
  name: "list_meeting_minutes",
  description: "현재 프로젝트 회의록을 보여 준다. minute(문서번호·회의 목적)를 주면 그 회의록의 내용 항목까지, search 를 주면 목적·내용에 그 말이 든 회의록만, 없으면 최근 20건.",
  parameters: { type: "object", properties: { minute: { type: "string" }, search: { type: "string" } }, additionalProperties: false },
  kind: "read",
  parse: (args) => {
    const a = obj(args);
    const s = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : undefined);
    return { minute: s(a.minute), search: s(a.search) };
  },
  async execute(ctx, { minute, search }) {
    if (minute) {
      const m = await findMinute(ctx, minute);
      if ("error" in m) return { kind: "error", message: m.error };
      const rows = m.items.map((i, n) => ({ 순번: n + 1, 내용: i.content, 담당: i.assignee ?? "", 일정: i.dueDate ?? "", 현황: ITEM_STATUS[i.status as MeetingItemStatus] ?? i.status }));
      return { kind: "data", summary: `회의록 ${m.code} ${m.title} (${m.meetingDate.toISOString().slice(0, 10)}) 내용 ${rows.length}건`, rows };
    }
    const where = {
      projectId: ctx.projectId,
      ...(search ? { OR: [{ title: { contains: search, mode: "insensitive" as const } }, { items: { some: { content: { contains: search, mode: "insensitive" as const } } } }] } : {}),
    };
    const list = await ctx.prisma.meetingMinute.findMany({
      where, orderBy: [{ meetingDate: "desc" }, { code: "desc" }], take: 20,
      select: { code: true, title: true, meetingDate: true, location: true, _count: { select: { items: true } } },
    });
    const rows = list.map((m) => ({ 문서번호: m.code, 일자: m.meetingDate.toISOString().slice(0, 10), 회의목적: m.title, 장소: m.location ?? "", 내용수: m._count.items }));
    return { kind: "data", summary: `회의록 ${rows.length}건${search ? ` ("${search}")` : ""}`, rows };
  },
};

export const MEETING_TOOLS = [listMeetingMinutesTool, proposeUpdateMeetingItemsTool];
