/**
 * @file src/lib/chat-tools/meeting-items.test.ts
 * @description
 * 회의록 조회 · 내용 항목 추가·변경·삭제 제안 도구와 회의록 공통 메뉴 정의(등록 시 contents → items) 테스트입니다. prisma 는 목입니다.
 *
 * 초보자 가이드:
 * - 내용 항목 제안은 현재 항목에 변경을 적용한 전체 목록을 entity_update(patch.items)로 저장한다. 업무 데이터는 바뀌지 않는다.
 */

import { describe, expect, it, vi } from "vitest";
import { listMeetingMinutesTool, parseMeetingItemArgs, proposeUpdateMeetingItemsTool } from "./meeting-items";
import { MEETING_SPECS } from "./entities/specs-meeting";
import { makeEntityTools } from "./entities/tools";

const minute = {
  id: "mm1", code: "20261105-001", title: "MES 착수 회의", meetingDate: new Date("2026-11-05T00:00:00Z"),
  items: [
    { content: "설비 TAG 목록 정리", assignee: "강승훈", dueDate: "11/20", status: "PLANNED" },
    { content: "VPN 계정 신청", assignee: null, dueDate: null, status: "IN_PROGRESS" },
  ],
};

function setup(found: unknown[] = [minute]) {
  const db = {
    meetingMinute: { findMany: vi.fn(async () => found) },
    meetingMinuteItem: { count: vi.fn(async () => 2) },
    chatPendingAction: { create: vi.fn(async ({ data }: { data: Record<string, unknown> }) => ({ id: "act-1", ...data })) },
  };
  const ctx = { projectId: "p1", user: { id: "u1", email: "u@x", role: "USER" }, prisma: db } as never;
  return { db, ctx };
}

describe("propose_update_meeting_items", () => {
  it("applies add/update/remove to the full item list", async () => {
    const { db, ctx } = setup();
    const t = proposeUpdateMeetingItemsTool;
    const r = await t.execute(ctx, t.parse({
      minute: "20261105-001",
      update: [{ match: "TAG", status: "완료" }],
      remove: ["VPN"],
      add: [{ content: "현업 인터뷰 일정 확정", assignee: "허민", dueDate: "11/25" }],
    }));
    expect(r).toMatchObject({ kind: "proposal", op: "update" });
    const data = db.chatPendingAction.create.mock.calls[0][0].data as { kind: string; args: { entity: string; targetIds: string[]; patch: { items: unknown[] } } };
    expect(data.kind).toBe("entity_update");
    expect(data.args).toMatchObject({ entity: "meeting_minute", targetIds: ["mm1"] });
    expect(data.args.patch.items).toEqual([
      { content: "설비 TAG 목록 정리", assignee: "강승훈", dueDate: "11/20", status: "DONE" },
      { content: "현업 인터뷰 일정 확정", assignee: "허민", dueDate: "11/25", status: "PLANNED" },
    ]);
    const where = (db.meetingMinute.findMany.mock.calls[0] as unknown as [{ where: Record<string, unknown> }])[0].where;
    expect(where).toMatchObject({ projectId: "p1" });
  });

  it("unknown item or minute → error", async () => {
    const t = proposeUpdateMeetingItemsTool;
    const { ctx } = setup();
    expect(await t.execute(ctx, t.parse({ minute: "20261105-001", remove: ["없는 항목"] }))).toMatchObject({ kind: "error" });
    const none = setup([]);
    expect(await t.execute(none.ctx, t.parse({ minute: "x", remove: ["a"] }))).toMatchObject({ kind: "error" });
  });

  it("parse validates", () => {
    expect(() => parseMeetingItemArgs({ minute: "a" })).toThrow(/add/);
    expect(() => parseMeetingItemArgs({ minute: "a", add: [{ assignee: "x" }] })).toThrow(/content/);
    expect(() => parseMeetingItemArgs({ minute: "a", update: [{ match: "x", status: "끝" }] })).toThrow(/PLANNED/);
    expect(() => parseMeetingItemArgs({ minute: "a", remove: Array.from({ length: 21 }, (_, i) => `r${i}`) })).toThrow(/20/);
  });
});

describe("list_meeting_minutes", () => {
  it("shows items of one minute", async () => {
    const { ctx } = setup();
    const r = await listMeetingMinutesTool.execute(ctx, listMeetingMinutesTool.parse({ minute: "MES 착수 회의" }));
    expect(r).toMatchObject({ kind: "data", rows: [{ 내용: "설비 TAG 목록 정리", 현황: "예정" }, { 현황: "진행중" }] });
  });
});

describe("meeting_minute entity spec", () => {
  it("create turns contents into items; update rejects contents", async () => {
    const { db, ctx } = setup();
    const tools = makeEntityTools(MEETING_SPECS);
    const create = tools.find((x) => x.name === "propose_create_record")!;
    await create.execute(ctx, create.parse({ entity: "meeting_minute", fields: { title: "주간 회의", meetingDate: "2026-11-10", contents: ["A 확인", "B 정리"] } }));
    expect(db.chatPendingAction.create.mock.calls[0][0].data).toMatchObject({
      kind: "entity_create",
      args: { data: { title: "주간 회의", meetingDate: "2026-11-10", items: [{ content: "A 확인", status: "PLANNED" }, { content: "B 정리", status: "PLANNED" }] } },
    });
    const update = tools.find((x) => x.name === "propose_update_record")!;
    expect(() => update.parse({ entity: "meeting_minute", refs: ["x"], fields: { contents: ["a"] } })).toThrow(/등록할 때만/);
  });

  it("delete tells how many items go with it", async () => {
    const { ctx } = setup([{ id: "mm1", code: "20261105-001", title: "MES 착수 회의" }]);
    const del = makeEntityTools(MEETING_SPECS).find((x) => x.name === "propose_delete_records")!;
    const r = await del.execute(ctx, del.parse({ entity: "meeting_minute", refs: ["20261105-001"] }));
    if (r.kind !== "proposal") throw new Error(JSON.stringify(r));
    expect(r.fields).toContainEqual({ label: "함께 삭제", value: "회의 내용 항목 2건" });
  });
});
