/**
 * @file src/lib/chat-tools/records.test.ts
 * @description
 * 레코드 조회 도구(TASK·이슈·고객이슈·고객요구사항·협의요청·마일스톤·AS-IS)와 코드 해석기 테스트입니다. prisma 는 목입니다.
 *
 * 초보자 가이드:
 * - 모든 조회는 ctx.projectId 로 거른다 (AS-IS 항목은 overview.projectId).
 * - 코드 접두사: ISS-(이슈) → DIS-(협의요청) → RQIT_(고객요구사항) → IS+숫자(고객이슈). ISS- 를 IS 보다 먼저 본다.
 */

import { describe, expect, it, vi } from "vitest";
import { getRecordTool, LIST_TOOLS, resolveRecordByCode } from "./records";
import type { ToolContext } from "./types";

const MODELS = ["task", "issue", "fieldIssue", "customerRequirement", "discussionItem", "milestone", "asIsOverviewItem"] as const;

function makeCtx(rows: Record<string, unknown>[] = []) {
  const mocks: Record<string, { findMany: ReturnType<typeof vi.fn>; findFirst: ReturnType<typeof vi.fn>; count: ReturnType<typeof vi.fn> }> = {};
  for (const m of MODELS) {
    mocks[m] = { findMany: vi.fn(async () => rows), findFirst: vi.fn(async () => rows[0] ?? null), count: vi.fn(async () => rows.length) };
  }
  const ctx = { projectId: "p1", user: { id: "u", email: "u@x", role: "USER" }, prisma: mocks } as unknown as ToolContext;
  return { ctx, mocks };
}

const whereOf = (fn: ReturnType<typeof vi.fn>) => (fn.mock.calls[0] as unknown as [{ where: Record<string, unknown> }])[0].where;

describe("list tools", () => {
  it.each(Object.keys(LIST_TOOLS))("always scopes by ctx.projectId: %s", async (name) => {
    const { ctx, mocks } = makeCtx();
    const tool = LIST_TOOLS[name];
    await tool.execute(ctx, tool.parse({}));
    const model = Object.values(mocks).find((m) => m.findMany.mock.calls.length)!;
    const where = whereOf(model.findMany);
    if (name === "list_as_is_items") expect(where.overview).toEqual({ projectId: "p1" });
    else expect(where.projectId).toBe("p1");
  });

  it("rejects unknown enum value", () => {
    expect(() => LIST_TOOLS.list_issues.parse({ status: ["URGENT"] })).toThrow(/OPEN/);
    expect(() => LIST_TOOLS.list_issues.parse({ priority: ["URGENT"] })).toThrow(/CRITICAL/);
  });

  it("keyword searches title and description insensitive", async () => {
    const { ctx, mocks } = makeCtx();
    await LIST_TOOLS.list_issues.execute(ctx, LIST_TOOLS.list_issues.parse({ keyword: "로그인", priority: ["CRITICAL"] }));
    const where = whereOf(mocks.issue.findMany);
    expect(where.OR).toEqual([
      { title: { contains: "로그인", mode: "insensitive" } },
      { description: { contains: "로그인", mode: "insensitive" } },
    ]);
    expect(where.priority).toEqual({ in: ["CRITICAL"] });
  });

  it("summary has count and codes", async () => {
    const { ctx } = makeCtx([{ id: "1", code: "ISS-011", title: "회원가입 메일", status: "OPEN" }]);
    const r = await LIST_TOOLS.list_issues.execute(ctx, LIST_TOOLS.list_issues.parse({}));
    expect(r.kind === "data" && r.summary).toContain("1건: ISS-011");
  });
});

describe("resolveRecordByCode / get_record", () => {
  it.each([
    ["ISS-011", "issue", "issues"],
    ["IS0001", "fieldIssue", "field_issues"],
    ["DIS-0002", "discussionItem", "discussion_items"],
    ["RQIT_00001", "customerRequirement", "customer_requirements"],
  ])("%s resolves to %s", async (code, model, table) => {
    const { ctx, mocks } = makeCtx([{ id: "r1", code }]);
    const r = await resolveRecordByCode(ctx, code);
    expect(r).toEqual({ table, id: "r1" });
    expect(whereOf(mocks[model].findFirst)).toEqual({ projectId: "p1", code });
  });

  it("code of another project returns null", async () => {
    const { ctx } = makeCtx([]);
    expect(await resolveRecordByCode(ctx, "ISS-999")).toBeNull();
  });

  it("unknown prefix returns null", async () => {
    const { ctx } = makeCtx([{ id: "x" }]);
    expect(await resolveRecordByCode(ctx, "ABC-1")).toBeNull();
  });

  it("get_record returns detail row", async () => {
    const { ctx } = makeCtx([{ id: "r1", code: "ISS-011", title: "회원가입 메일" }]);
    const r = await getRecordTool.execute(ctx, getRecordTool.parse({ code: "ISS-011" }));
    expect(r.kind).toBe("data");
    if (r.kind === "data") expect(r.rows?.[0]).toMatchObject({ code: "ISS-011" });
  });
});
