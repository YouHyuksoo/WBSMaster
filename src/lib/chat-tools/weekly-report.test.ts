/**
 * @file src/lib/chat-tools/weekly-report.test.ts
 * @description
 * 주간보고 채팅 도구(조회 · 항목 등록·수정·삭제 제안) 테스트입니다. prisma 는 목입니다.
 *
 * 초보자 가이드:
 * - 주차는 프로젝트 시작일이 속한 주의 월요일이 1주차 (화면 getProjectWeekInfo 와 같다).
 * - 제안은 chat_pending_actions 에만 저장되고 보고서·항목은 바뀌지 않는다.
 */

import { describe, expect, it, vi } from "vitest";
import {
  listWeeklyReportTool, parseItemFields, parseWeek, proposeCreateWeeklyItemTool, proposeDeleteWeeklyItemsTool,
  proposeUpdateWeeklyItemTool, resolveWeek, weekLabel,
} from "./weekly-report";

type Report = { id: string; status: string; items: { id: string; type: string; category: string; title: string; progress: number; isCompleted: boolean; targetDate: Date | null }[] };

function setup(report: Report | null = null) {
  const db = {
    // 2026-10-05(월) 시작 → 2026-11-10(화) 는 6주차
    project: { findUnique: vi.fn(async () => ({ startDate: new Date(2026, 9, 5) })) },
    weeklyReport: { findUnique: vi.fn(async () => report) },
    chatPendingAction: { create: vi.fn(async ({ data }: { data: Record<string, unknown> }) => ({ id: "act-1", ...data })) },
  };
  const ctx = { projectId: "p1", user: { id: "u1", email: "u@x", role: "USER" }, prisma: db } as never;
  return { db, ctx };
}
const item = (id: string, title: string, type = "PREVIOUS_RESULT") => ({ id, title, type, category: "DEVELOPMENT", progress: 50, isCompleted: false, targetDate: null });
const today = new Date();

describe("parseWeek / resolveWeek", () => {
  it("parses keywords and numbers", () => {
    expect(parseWeek(undefined)).toBe("this");
    expect(parseWeek("last")).toBe("last");
    expect(parseWeek("7")).toBe(7);
    expect(() => parseWeek("0")).toThrow(/week/);
  });

  it("counts weeks from the project start Monday", async () => {
    const { ctx } = setup();
    const w = await resolveWeek(ctx, "this", new Date(2026, 10, 10));
    expect(w).toMatchObject({ year: 2026, weekNumber: 6 });
    const last = await resolveWeek(ctx, "last", new Date(2026, 10, 10));
    expect(last).toMatchObject({ weekNumber: 5 });
    expect(await resolveWeek(ctx, 1, new Date(2026, 9, 5))).toMatchObject({ weekNumber: 1 });
  });

  it("label uses local dates (회귀: UTC 로 잘라 월요일이 전날로 보였다)", async () => {
    const { ctx } = setup();
    const w = await resolveWeek(ctx, "this", new Date(2026, 10, 10));
    if ("error" in w) throw new Error(w.error);
    expect(weekLabel(w)).toBe("6주차(11-09~11-15)");
  });
});

describe("parseItemFields", () => {
  it("accepts Korean labels and rejects unknown fields", () => {
    expect(parseItemFields({ type: "차주 계획", category: "개발", title: " 화면 개발 ", progress: 130 })).toEqual({ type: "NEXT_PLAN", category: "DEVELOPMENT", title: "화면 개발", progress: 100 });
    expect(() => parseItemFields({ color: "red" })).toThrow(/color/);
    expect(() => parseItemFields({ type: "DONE" })).toThrow(/PREVIOUS_RESULT/);
  });
});

describe("list_weekly_report", () => {
  it("lists my items for the week", async () => {
    const { ctx, db } = setup({ id: "r1", status: "DRAFT", items: [item("i1", "소스 분석")] });
    const r = await listWeeklyReportTool.execute(ctx, listWeeklyReportTool.parse({}));
    expect(r).toMatchObject({ kind: "data", rows: [{ 구분: "전주 실적", 제목: "소스 분석", 분류: "개발" }] });
    const where = (db.weeklyReport.findUnique.mock.calls[0] as unknown as [{ where: { projectId_userId_year_weekNumber: Record<string, unknown> } }])[0].where;
    expect(where.projectId_userId_year_weekNumber).toMatchObject({ projectId: "p1", userId: "u1", year: today.getFullYear() });
  });
});

describe("propose_create_weekly_item", () => {
  it("no report yet → proposal says it will be created, nothing written", async () => {
    const { ctx, db } = setup(null);
    const t = proposeCreateWeeklyItemTool;
    const r = await t.execute(ctx, t.parse({ fields: { type: "PREVIOUS_RESULT", title: "TAG 초안" } }));
    expect(r).toMatchObject({ kind: "proposal", op: "create" });
    if (r.kind === "proposal") expect(r.fields).toContainEqual({ label: "보고서", value: "없음 → 새로 만듦" });
    const data = db.chatPendingAction.create.mock.calls[0][0].data as { kind: string; args: { reportId: unknown; data: Record<string, unknown>; week: { weekNumber: number } } };
    expect(data.kind).toBe("weekly_item_create");
    expect(data.args.reportId).toBeNull();
    expect(data.args.data).toEqual({ category: "OTHER", type: "PREVIOUS_RESULT", title: "TAG 초안" });
  });

  it("requires type and title", () => {
    expect(() => proposeCreateWeeklyItemTool.parse({ fields: { title: "a" } })).toThrow(/type/);
    expect(() => proposeCreateWeeklyItemTool.parse({ fields: { type: "NEXT_PLAN" } })).toThrow(/title/);
  });
});

describe("propose_update_weekly_item / propose_delete_weekly_items", () => {
  it("update finds item by title in my report", async () => {
    const { ctx, db } = setup({ id: "r1", status: "DRAFT", items: [item("i1", "소스 분석"), item("i2", "TAG 정리")] });
    const t = proposeUpdateWeeklyItemTool;
    const r = await t.execute(ctx, t.parse({ title: "TAG", fields: { progress: 100, isCompleted: true } }));
    expect(r).toMatchObject({ kind: "proposal", op: "update" });
    expect(db.chatPendingAction.create.mock.calls[0][0].data).toMatchObject({ kind: "weekly_item_update", args: { reportId: "r1", itemIds: ["i2"], patch: { progress: 100, isCompleted: true } } });
  });

  it("ambiguous title → error listing matches", async () => {
    const { ctx } = setup({ id: "r1", status: "DRAFT", items: [item("i1", "화면 개발 1"), item("i2", "화면 개발 2")] });
    const t = proposeUpdateWeeklyItemTool;
    const r = await t.execute(ctx, t.parse({ title: "화면 개발", fields: { progress: 10 } }));
    expect(r).toMatchObject({ kind: "error" });
  });

  it("delete is danger, missing report → error, max 20", async () => {
    const { ctx, db } = setup({ id: "r1", status: "DRAFT", items: [item("i1", "소스 분석")] });
    const t = proposeDeleteWeeklyItemsTool;
    expect(await t.execute(ctx, t.parse({ titles: ["소스 분석"] }))).toMatchObject({ kind: "proposal", op: "delete", danger: true });
    expect(db.chatPendingAction.create.mock.calls[0][0].data).toMatchObject({ kind: "weekly_item_delete", args: { reportId: "r1", itemIds: ["i1"] } });
    const none = setup(null);
    expect(await t.execute(none.ctx, t.parse({ titles: ["x"] }))).toMatchObject({ kind: "error" });
    expect(() => t.parse({ titles: Array.from({ length: 21 }, (_, i) => `t${i}`) })).toThrow(/20/);
  });
});
