/**
 * @file src/lib/chat-tools/entities/tools.test.ts
 * @description
 * 공통 등록·수정·삭제 제안 도구 테스트입니다. 가짜 메뉴 정의와 prisma 목을 씁니다.
 *
 * 초보자 가이드:
 * - 제안은 chat_pending_actions 에만 저장되고 업무 데이터는 바뀌지 않는다.
 * - 삭제는 최대 20건, 위험 표시(danger)와 함께 지워지는 데이터 안내가 붙는다.
 */

import { describe, expect, it, vi } from "vitest";
import { makeEntityTools, MAX_CREATE } from "./tools";
import type { EntitySpec } from "./types";

const spec: EntitySpec = {
  key: "milestone", label: "마일스톤", model: "milestone", refFields: ["name"], link: "/m", ops: { create: true, update: true, delete: true },
  fields: [
    { key: "name", label: "이름", type: "string", required: true },
    { key: "startDate", label: "시작일", type: "date", required: true },
    { key: "status", label: "상태", type: "enum", values: ["PENDING", "COMPLETED"], labels: { PENDING: "대기중", COMPLETED: "완료" } },
    { key: "assigneeName", label: "담당", type: "person", to: "assigneeId" },
  ],
  deleteImpact: async () => "하위 2건도 함께 삭제됩니다",
};
const readOnly: EntitySpec = { ...spec, key: "issue", label: "이슈", ops: { delete: true }, fields: [] };

function setup(rows: { id: string; name: string }[] = [], members = [{ id: "k", name: "강승훈" }]) {
  const db = {
    milestone: { findMany: vi.fn(async () => rows) },
    issue: { findMany: vi.fn(async () => rows) },
    teamMember: { findMany: vi.fn(async () => members.map((m) => ({ user: { id: m.id, name: m.name, email: "x" } }))) },
    chatPendingAction: { create: vi.fn(async ({ data }: { data: Record<string, unknown> }) => ({ id: "act-1", ...data })) },
  };
  const ctx = { projectId: "p1", user: { id: "u1", email: "u@x", role: "USER" }, prisma: db } as never;
  const tools = makeEntityTools([spec, readOnly]);
  return { db, ctx, tools };
}
const t = (tools: ReturnType<typeof makeEntityTools>, name: string) => tools.find((x) => x.name === name)!;

describe("propose_create_record", () => {
  it("validates, resolves person, saves pending action", async () => {
    const { db, ctx, tools } = setup();
    const tool = t(tools, "propose_create_record");
    const r = await tool.execute(ctx, tool.parse({ entity: "milestone", fields: { name: "킥오프", startDate: "2026-11-20", status: "PENDING", assigneeName: "강승훈" } }));
    expect(r.kind).toBe("proposal");
    expect(db.chatPendingAction.create.mock.calls[0][0].data).toMatchObject({
      kind: "entity_create", args: { entity: "milestone", data: { name: "킥오프", startDate: "2026-11-20", status: "PENDING", assigneeId: "k" } },
    });
  });

  it("rejects unknown field, missing required, bad enum, unsupported op", () => {
    const { tools } = setup();
    const tool = t(tools, "propose_create_record");
    expect(() => tool.parse({ entity: "milestone", fields: { name: "a", startDate: "2026-11-20", color: "red" } })).toThrow(/color/);
    expect(() => tool.parse({ entity: "milestone", fields: { name: "a" } })).toThrow(/startDate/);
    expect(() => tool.parse({ entity: "milestone", fields: { name: "a", startDate: "2026-11-20", status: "DONE" } })).toThrow(/PENDING/);
    expect(() => tool.parse({ entity: "issue", fields: { name: "a" } })).toThrow(/등록/);
    expect(() => tool.parse({ entity: "nope", fields: {} })).toThrow(/milestone/);
  });
});

describe("propose_create_record 여러 건 (회귀: 12월 한 달 요청에 첫 주 한 건만 제안됐다)", () => {
  it("records 를 카드 한 장으로 저장하고 한 줄에 한 건씩 보여 준다", async () => {
    const { db, ctx, tools } = setup();
    const tool = t(tools, "propose_create_record");
    const r = await tool.execute(
      ctx,
      tool.parse({
        entity: "milestone",
        records: [
          { name: "오창 상주 1주", startDate: "2026-12-01" },
          { name: "오창 상주 2주", startDate: "2026-12-07" },
          { name: "오창 상주 3주", startDate: "2026-12-14", assigneeName: "강승훈" },
        ],
      })
    );
    expect(r).toMatchObject({ kind: "proposal", op: "create" });
    const saved = db.chatPendingAction.create.mock.calls[0][0].data as { args: { items: Record<string, unknown>[] }; summary: string };
    expect(saved.args.items).toHaveLength(3);
    expect(saved.args.items[2]).toMatchObject({ name: "오창 상주 3주", assigneeId: "k" });
    expect(saved.summary.startsWith("마일스톤 3건 등록: 오창 상주 1주 2026-12-01 / 오창 상주 2주")).toBe(true);
    if (r.kind !== "proposal") throw new Error("proposal 이어야 한다");
    expect(r.fields.map((f) => f.label)).toEqual(["1", "2", "3"]);
    expect(r.fields[2].value).toContain("담당 강승훈");
  });

  it("한 건짜리 records 는 예전과 같은 { entity, data } 로 저장한다", async () => {
    const { db, ctx, tools } = setup();
    const tool = t(tools, "propose_create_record");
    await tool.execute(ctx, tool.parse({ entity: "milestone", records: [{ name: "킥오프", startDate: "2026-11-20" }] }));
    expect(db.chatPendingAction.create.mock.calls[0][0].data).toMatchObject({ args: { entity: "milestone", data: { name: "킥오프" } } });
  });

  it("어느 건이 틀렸는지 알려 주고, 최대 건수 · fields 와 records 동시 입력을 막는다", () => {
    const { tools } = setup();
    const tool = t(tools, "propose_create_record");
    expect(() => tool.parse({ entity: "milestone", records: [{ name: "a", startDate: "2026-12-01" }, { name: "b" }] })).toThrow(/records\[1\].*startDate/);
    const many = Array.from({ length: MAX_CREATE + 1 }, (_, i) => ({ name: `n${i}`, startDate: "2026-12-01" }));
    expect(() => tool.parse({ entity: "milestone", records: many })).toThrow(/최대/);
    expect(() => tool.parse({ entity: "milestone", fields: { name: "a", startDate: "2026-12-01" }, records: [] })).toThrow(/하나만/);
    expect(() => tool.parse({ entity: "milestone" })).toThrow(/fields 또는 records/);
    expect(tool.description).toContain("records");
  });
});

describe("propose_update_record", () => {
  it("resolves refs in project and saves patch", async () => {
    const { db, ctx, tools } = setup([{ id: "m1", name: "킥오프" }]);
    const tool = t(tools, "propose_update_record");
    const r = await tool.execute(ctx, tool.parse({ entity: "milestone", refs: ["킥오프"], fields: { status: "COMPLETED" } }));
    expect(r).toMatchObject({ kind: "proposal", op: "update", fields: [{ label: "대상", value: "킥오프" }, { label: "상태", value: "완료" }] });
    expect((db.milestone.findMany.mock.calls[0] as unknown as [{ where: Record<string, unknown> }])[0].where).toMatchObject({ projectId: "p1" });
    expect(db.chatPendingAction.create.mock.calls[0][0].data).toMatchObject({ kind: "entity_update", args: { entity: "milestone", targetIds: ["m1"], patch: { status: "COMPLETED" } } });
  });

  it("한글 라벨 입력을 Enum 값으로 받는다 (회귀: 카드에 IN_PROGRESS 같은 영문 값이 보였다)", async () => {
    const { db, ctx, tools } = setup([{ id: "m1", name: "킥오프" }]);
    const tool = t(tools, "propose_update_record");
    await tool.execute(ctx, tool.parse({ entity: "milestone", refs: ["킥오프"], fields: { status: "완료" } }));
    expect(db.chatPendingAction.create.mock.calls[0][0].data).toMatchObject({ args: { patch: { status: "COMPLETED" } } });
    expect(tool.description).toContain("COMPLETED(완료)");
  });

  it("missing ref → error", async () => {
    const { ctx, tools } = setup([]);
    const tool = t(tools, "propose_update_record");
    const r = await tool.execute(ctx, tool.parse({ entity: "milestone", refs: ["없는것"], fields: { status: "COMPLETED" } }));
    expect(r).toMatchObject({ kind: "error" });
  });

  it("duplicate name → error asking to be specific", async () => {
    const { ctx, tools } = setup([{ id: "m1", name: "점검" }, { id: "m2", name: "점검" }]);
    const tool = t(tools, "propose_update_record");
    const r = await tool.execute(ctx, tool.parse({ entity: "milestone", refs: ["점검"], fields: { status: "COMPLETED" } }));
    expect(r.kind).toBe("error");
    if (r.kind === "error") expect(r.message).toContain("2건");
  });
});

describe("propose_delete_records", () => {
  it("danger proposal with impact", async () => {
    const { db, ctx, tools } = setup([{ id: "m1", name: "킥오프" }]);
    const tool = t(tools, "propose_delete_records");
    const r = await tool.execute(ctx, tool.parse({ entity: "milestone", refs: ["킥오프"] }));
    expect(r).toMatchObject({ kind: "proposal", danger: true });
    if (r.kind === "proposal") expect(r.fields).toEqual(expect.arrayContaining([{ label: "함께 삭제", value: "하위 2건도 함께 삭제됩니다" }]));
    expect(db.chatPendingAction.create.mock.calls[0][0].data).toMatchObject({ kind: "entity_delete", args: { entity: "milestone", targetIds: ["m1"] } });
  });

  it("more than 20 → error", () => {
    const { tools } = setup();
    const tool = t(tools, "propose_delete_records");
    expect(() => tool.parse({ entity: "milestone", refs: Array.from({ length: 21 }, (_, i) => `m${i}`) })).toThrow(/20/);
  });
});
