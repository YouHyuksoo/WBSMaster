/**
 * @file src/lib/services/wbsService.test.ts
 * @description
 * WBS 항목 수정 서비스 테스트입니다 (화면 PATCH /api/wbs/:id 와 AI 채팅 확인 카드가 같이 쓴다). prisma 는 목입니다.
 *
 * 초보자 가이드:
 * - 같은 프로젝트 항목만 수정 (아니면 404)
 * - 진행률만 바꾸면 상태 자동 (0 → 대기, 1~99 → 진행, 100 → 완료)
 * - assigneeIds 는 담당자 전체 교체, 상위 항목 진행률은 다시 계산한다
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

const db = vi.hoisted(() => ({
  wbsItem: { findFirst: vi.fn(), update: vi.fn(), findMany: vi.fn(), findUnique: vi.fn() },
}));
vi.mock("@/lib/prisma", () => ({ prisma: db }));

import { updateWbsItem, updateWbsItems } from "./wbsService";

beforeEach(() => {
  vi.clearAllMocks();
  // 실제 Prisma 처럼 응답의 assignees 는 include 결과(배열). 입력 data.assignees(중첩 쓰기)로 덮지 않는다
  db.wbsItem.update.mockImplementation(async ({ data }: { data: Record<string, unknown> }) => ({
    id: "w1", level: "LEVEL2", _count: { children: 0 }, ...data, assignees: [{ user: { id: "u2", name: "강승훈" } }],
  }));
  db.wbsItem.findMany.mockResolvedValue([{ progress: 50, weight: 1 }, { progress: 0, weight: 1 }]);
  db.wbsItem.findUnique.mockResolvedValue({ parentId: null });
});

describe("updateWbsItem", () => {
  it("rejects other project item", async () => {
    db.wbsItem.findFirst.mockResolvedValue(null);
    expect(await updateWbsItem("w9", "p1", { progress: 10 })).toMatchObject({ success: false, status: 404 });
    expect(db.wbsItem.findFirst.mock.calls[0][0].where).toEqual({ id: "w9", projectId: "p1" });
    expect(db.wbsItem.update).not.toHaveBeenCalled();
  });

  it("progress only → auto status", async () => {
    db.wbsItem.findFirst.mockResolvedValue({ id: "w1", projectId: "p1", status: "PENDING", parentId: null });
    await updateWbsItem("w1", "p1", { progress: 100 });
    expect(db.wbsItem.update.mock.calls[0][0].data).toMatchObject({ progress: 100, status: "COMPLETED" });
  });

  it("assigneeIds replaces assignees and flattens response", async () => {
    db.wbsItem.findFirst.mockResolvedValue({ id: "w1", projectId: "p1", status: "PENDING", parentId: null });
    const r = await updateWbsItem("w1", "p1", { assigneeIds: ["u2", "u3"] });
    expect(db.wbsItem.update.mock.calls[0][0].data.assignees).toEqual({ deleteMany: {}, create: [{ userId: "u2" }, { userId: "u3" }] });
    if (r.success) expect(r.data.assignees).toEqual([{ id: "u2", name: "강승훈" }]);
  });

  it("recalculates parent progress", async () => {
    db.wbsItem.findFirst.mockResolvedValue({ id: "w1", projectId: "p1", status: "PENDING", parentId: "w0" });
    await updateWbsItem("w1", "p1", { progress: 50 });
    const parentUpdate = db.wbsItem.update.mock.calls.find((c) => (c[0] as { where: { id: string } }).where.id === "w0");
    expect(parentUpdate?.[0]).toMatchObject({ data: { progress: 25, status: "IN_PROGRESS" } });
  });

  it("updateWbsItems add mode keeps existing assignees", async () => {
    db.wbsItem.findFirst.mockImplementation(async ({ where }: { where: { id: string } }) => ({
      id: where.id, projectId: "p1", status: "PENDING", parentId: null, assignees: [{ userId: "u1" }],
    }));
    const r = await updateWbsItems(["w1", "w2"], "p1", { assigneeIds: ["u2", "u1"] }, "add");
    expect(r).toMatchObject({ success: true, data: { updated: 2 } });
    expect(db.wbsItem.update.mock.calls[0][0].data.assignees.create).toEqual([{ userId: "u1" }, { userId: "u2" }]);
  });

  it("updateWbsItems stops on first failure", async () => {
    db.wbsItem.findFirst.mockResolvedValue(null);
    expect(await updateWbsItems(["w9"], "p1", { progress: 10 }, "replace")).toMatchObject({ success: false, status: 404 });
  });

  it("invalid progress → 400", async () => {
    db.wbsItem.findFirst.mockResolvedValue({ id: "w1", projectId: "p1", status: "PENDING", parentId: null });
    expect(await updateWbsItem("w1", "p1", { progress: 120 })).toMatchObject({ success: false, status: 400 });
  });
});
