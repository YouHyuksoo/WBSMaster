/**
 * @file src/lib/chat-tools/wbs.test.ts
 * @description
 * WBS 채팅 도구(list_wbs, wbs_schedule_stats) 테스트입니다. prisma 는 목입니다.
 *
 * 초보자 가이드:
 * - 모든 조회는 ctx.projectId 로 거른다. 지연만 보기(delayedOnly)는 마감일이 지났고 진행률 100 미만인 항목이다.
 */

import { describe, expect, it, vi } from "vitest";
import { listWbsTool, wbsScheduleStatsTool } from "./wbs";
import type { ToolContext } from "./types";

function ctxWith(prismaMock: Record<string, unknown>): ToolContext {
  return { projectId: "p1", user: { id: "u", email: "u@x", role: "USER" }, prisma: prismaMock } as unknown as ToolContext;
}

describe("list_wbs", () => {
  it("filters by project and delayedOnly", async () => {
    const findMany = vi.fn(async () => [
      { code: "1.1", name: "업무 분석", level: "LEVEL2", status: "IN_PROGRESS", progress: 30, startDate: null, endDate: new Date(2026, 10, 1), assignees: [{ user: { name: "유혁수" } }] },
    ]);
    const ctx = ctxWith({ wbsItem: { findMany } });
    const r = await listWbsTool.execute(ctx, listWbsTool.parse({ delayedOnly: true, status: ["IN_PROGRESS"] }));
    const where = (findMany.mock.calls[0] as unknown as [{ where: Record<string, unknown> }])[0].where;
    expect(where.projectId).toBe("p1");
    expect(where.status).toEqual({ in: ["IN_PROGRESS"] });
    expect(where.progress).toEqual({ lt: 100 });
    expect(where.endDate).toHaveProperty("lt");
    expect(r.kind).toBe("data");
    if (r.kind === "data") {
      expect(r.summary).toContain("1건");
      expect(r.summary).toContain("1.1");
      expect(r.rows?.[0]).toMatchObject({ code: "1.1", assignees: "유혁수" });
    }
  });

  it("rejects unknown status", () => {
    expect(() => listWbsTool.parse({ status: ["URGENT"] })).toThrow(/PENDING/);
  });

  it("level number maps to enum", async () => {
    const findMany = vi.fn(async () => []);
    await listWbsTool.execute(ctxWith({ wbsItem: { findMany } }), listWbsTool.parse({ level: 1 }));
    expect((findMany.mock.calls[0] as unknown as [{ where: Record<string, unknown> }])[0].where.level).toBe("LEVEL1");
  });
});

describe("wbs_schedule_stats", () => {
  it("summary contains 계획/실적/지연율", async () => {
    const d = (day: number) => new Date(2026, 10, day);
    const ctx = ctxWith({
      project: { findUnique: vi.fn(async () => ({ id: "p1", name: "오창", startDate: d(2), endDate: d(15) })) },
      holiday: { findMany: vi.fn(async () => []) },
      wbsItem: {
        findMany: vi.fn(async () => [
          { status: "IN_PROGRESS", progress: 50, weight: 100, startDate: d(2), endDate: d(12), actualEndDate: null, children: [] },
        ]),
      },
    });
    const r = await wbsScheduleStatsTool.execute(ctx, wbsScheduleStatsTool.parse({}));
    expect(r.kind).toBe("data");
    if (r.kind === "data") {
      expect(r.summary).toMatch(/계획 진척률 [\d.]+%/);
      expect(r.summary).toMatch(/실적 진척률 50%/);
      expect(r.summary).toMatch(/지연율/);
    }
  });
});
