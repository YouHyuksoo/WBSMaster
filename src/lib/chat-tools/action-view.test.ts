/**
 * @file src/lib/chat-tools/action-view.test.ts
 * @description
 * 채팅 기록을 다시 불러올 때 확인 카드가 처리 상태와 함께 되살아나는지 확인합니다. prisma 는 목입니다.
 *
 * 초보자 가이드:
 * - 회귀: 등록하고 나서 채팅 화면을 다시 열면 카드가 사라지고 "아래 내용으로 진행할까요?" 만 남았다 (2026-11-19).
 * - 본인 제안만 읽는다(userId 조건). 시간이 지난 PENDING 은 EXPIRED, 처리한 카드는 결과 화면 주소를 준다.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

const db = vi.hoisted(() => ({ chatPendingAction: { findMany: vi.fn() } }));
vi.mock("@/lib/prisma", () => ({ prisma: db }));

import { actionLink, pendingActionViews } from "./action-view";

const now = new Date("2026-11-19T04:00:00Z");
const row = (over: Record<string, unknown>) => ({
  id: "a1",
  userId: "u1",
  projectId: "p1",
  kind: "entity_create",
  args: { entity: "holiday", data: {} },
  summary: "일정 등록: 제목 오창 상주",
  status: "PENDING",
  resultRef: null,
  error: null,
  expiresAt: new Date("2026-11-19T05:00:00Z"),
  createdAt: now,
  ...over,
});

beforeEach(() => vi.clearAllMocks());

describe("pendingActionViews", () => {
  it("본인 제안만 읽고, 처리한 일정 등록 카드는 일정 관리 주소를 준다", async () => {
    db.chatPendingAction.findMany.mockResolvedValue([row({ status: "CONFIRMED" })]);
    const views = await pendingActionViews(["a1"], "u1", now);
    expect(db.chatPendingAction.findMany).toHaveBeenCalledWith({ where: { id: { in: ["a1"] }, userId: "u1" } });
    expect(views.get("a1")).toMatchObject({ status: "CONFIRMED", link: "/dashboard/holidays", op: "create", summary: "일정 등록: 제목 오창 상주" });
  });

  it("시간이 지난 PENDING 은 EXPIRED, 지나지 않았으면 PENDING", async () => {
    db.chatPendingAction.findMany.mockResolvedValue([
      row({ id: "old", expiresAt: new Date("2026-11-19T03:00:00Z") }),
      row({ id: "live" }),
    ]);
    const views = await pendingActionViews(["old", "live"], "u1", now);
    expect(views.get("old")?.status).toBe("EXPIRED");
    expect(views.get("live")?.status).toBe("PENDING");
    expect(views.get("live")?.link).toBeUndefined();
  });

  it("삭제 제안은 빨간 카드, 실패는 오류를 붙이고, 업무 접수 카드는 뺀다", async () => {
    db.chatPendingAction.findMany.mockResolvedValue([
      row({ id: "del", kind: "entity_delete", status: "CANCELLED" }),
      row({ id: "fail", status: "FAILED", error: "제목이 필요합니다" }),
      row({ id: "intake", kind: "intake_commit" }),
    ]);
    const views = await pendingActionViews(["del", "fail", "intake"], "u1", now);
    expect(views.get("del")).toMatchObject({ op: "delete", danger: true, status: "CANCELLED" });
    expect(views.get("fail")).toMatchObject({ status: "FAILED", error: "제목이 필요합니다" });
    expect(views.has("intake")).toBe(false);
  });

  it("id 가 없으면 DB 를 읽지 않는다", async () => {
    expect((await pendingActionViews([], "u1")).size).toBe(0);
    expect(db.chatPendingAction.findMany).not.toHaveBeenCalled();
  });
});

describe("actionLink", () => {
  it("예전 종류 · 주간보고 · 공통 메뉴 주소", () => {
    expect(actionLink("create_task", {})).toBe("/dashboard/kanban");
    expect(actionLink("update_wbs", {})).toBe("/dashboard/wbs");
    expect(actionLink("weekly_item_create", {})).toBe("/dashboard/weekly-report");
    expect(actionLink("entity_update", { entity: "milestone" })).toBe("/dashboard/milestones");
    expect(actionLink("entity_create", { entity: "없는메뉴" })).toBe("/dashboard");
  });
});
