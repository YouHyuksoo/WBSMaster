/**
 * @file src/lib/chat-tools/weekly-report-execute.test.ts
 * @description
 * 확인된 주간보고 항목 제안을 화면 API 핸들러로 실행하는 executeWeeklyAction 테스트입니다. 라우트 모듈은 가짜입니다.
 *
 * 초보자 가이드:
 * - 보고서가 없으면 POST /api/weekly-reports 로 먼저 만들고, 이미 있으면(409) existingId 를 쓴다.
 * - 수정·삭제는 항목마다 부르고, 실패하면 거기서 멈춘다.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

const routes = vi.hoisted(() => ({
  reportPOST: vi.fn(),
  itemPOST: vi.fn(),
  itemPATCH: vi.fn(),
  itemDELETE: vi.fn(),
}));
vi.mock("@/app/api/weekly-reports/route", () => ({ POST: routes.reportPOST }));
vi.mock("@/app/api/weekly-reports/[id]/items/route", () => ({ POST: routes.itemPOST }));
vi.mock("@/app/api/weekly-reports/[id]/items/[itemId]/route", () => ({ PATCH: routes.itemPATCH, DELETE: routes.itemDELETE }));

import { executeWeeklyAction } from "./weekly-report-execute";

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });
const week = { year: 2026, weekNumber: 6, weekStart: "2026-11-09T00:00:00.000Z", weekEnd: "2026-11-15T14:59:59.999Z" };

beforeEach(() => {
  for (const f of Object.values(routes)) f.mockReset();
  routes.itemPOST.mockImplementation(async (_req: Request, { params }: { params: Promise<{ id: string }> }) => json({ id: `item-in-${(await params).id}` }, 201));
});

describe("executeWeeklyAction create", () => {
  it("creates the report first when missing", async () => {
    routes.reportPOST.mockImplementation(async (req: Request) => {
      expect(await req.json()).toEqual({ projectId: "p1", ...week });
      return json({ id: "r-new" }, 201);
    });
    const r = await executeWeeklyAction({ kind: "weekly_item_create", projectId: "p1", args: { week, reportId: null, data: { type: "NEXT_PLAN", category: "OTHER", title: "a" } } });
    expect(r).toEqual({ ok: true, resultRef: "item-in-r-new", link: "/dashboard/weekly-report" });
  });

  it("uses existingId when the report was created meanwhile (409)", async () => {
    routes.reportPOST.mockResolvedValue(json({ error: "이미 해당 주차의 주간보고가 존재합니다.", existingId: "r-old" }, 409));
    const r = await executeWeeklyAction({ kind: "weekly_item_create", projectId: "p1", args: { week, reportId: null, data: { title: "a" } } });
    expect(r).toMatchObject({ ok: true, resultRef: "item-in-r-old" });
  });

  it("skips report creation when reportId is known", async () => {
    await executeWeeklyAction({ kind: "weekly_item_create", projectId: "p1", args: { week, reportId: "r1", data: { title: "a" } } });
    expect(routes.reportPOST).not.toHaveBeenCalled();
  });
});

describe("executeWeeklyAction update/delete", () => {
  it("patches each item with report and item params", async () => {
    routes.itemPATCH.mockImplementation(async (req: Request, { params }: { params: Promise<{ id: string; itemId: string }> }) => {
      expect(await params).toMatchObject({ id: "r1" });
      expect(await req.json()).toEqual({ progress: 100 });
      return json({});
    });
    const r = await executeWeeklyAction({ kind: "weekly_item_update", projectId: "p1", args: { reportId: "r1", itemIds: ["i1", "i2"], patch: { progress: 100 } } });
    expect(r.ok).toBe(true);
    expect(routes.itemPATCH).toHaveBeenCalledTimes(2);
  });

  it("delete stops at the first failure", async () => {
    routes.itemDELETE
      .mockResolvedValueOnce(json({}))
      .mockResolvedValueOnce(json({ error: "본인의 주간보고만 수정할 수 있습니다." }, 403));
    const r = await executeWeeklyAction({ kind: "weekly_item_delete", projectId: "p1", args: { reportId: "r1", itemIds: ["i1", "i2", "i3"] } });
    expect(r).toEqual({ ok: false, error: "본인의 주간보고만 수정할 수 있습니다. (1건 처리 후 중단)", status: 403 });
    expect(routes.itemDELETE).toHaveBeenCalledTimes(2);
  });
});
