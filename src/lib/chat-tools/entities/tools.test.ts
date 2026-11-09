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
import { makeEntityTools } from "./tools";
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
