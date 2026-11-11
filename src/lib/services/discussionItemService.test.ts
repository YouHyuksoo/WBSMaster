/**
 * @file src/lib/services/discussionItemService.test.ts
 * @description
 * 협의요청 생성·수정 서비스 테스트입니다. prisma 는 목입니다.
 *
 * 초보자 가이드:
 * - 코드: 마지막 코드 다음 번호로 DIS-0001 형식, 기한 미지정이면 7일 후
 * - 필수: 제목, 발생 단계(stage), 선택지 2개 이상
 * - 수정은 같은 프로젝트 레코드만, COMPLETED 로 바뀌면 결정 완료일 자동
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

const db = vi.hoisted(() => ({
  $queryRaw: vi.fn(async () => []),
  $transaction: vi.fn<((fn: (tx: unknown) => Promise<unknown>) => Promise<unknown>)>(),
  project: { findUnique: vi.fn() },
  discussionItem: { findFirst: vi.fn(), create: vi.fn(), update: vi.fn() },
  teamMember: { findMany: vi.fn() },
  notification: { createMany: vi.fn() },
}));
vi.mock("@/lib/prisma", () => ({ prisma: db }));

db.$transaction.mockImplementation(async (fn) => fn(db));

import { createDiscussionItem, updateDiscussionItem } from "./discussionItemService";

const valid = { projectId: "p1", title: "라벨 양식", stage: "DESIGN", options: [{ label: "A" }, { label: "B" }] };

beforeEach(() => {
  vi.clearAllMocks();
  db.project.findUnique.mockResolvedValue({ id: "p1", name: "오창" });
  db.discussionItem.create.mockImplementation(async ({ data }: { data: Record<string, unknown> }) => ({ id: "d-new", ...data }));
  db.discussionItem.update.mockImplementation(async ({ data }: { data: Record<string, unknown> }) => ({ id: "d1", ...data }));
  db.teamMember.findMany.mockResolvedValue([{ userId: "u1" }]);
});

describe("createDiscussionItem", () => {
  it("code DIS-0001 format and 7-day default due date", async () => {
    db.discussionItem.findFirst.mockResolvedValue({ code: "DIS-0004" });
    await createDiscussionItem(valid);
    const data = db.discussionItem.create.mock.calls[0][0].data;
    expect(data).toMatchObject({ code: "DIS-0005", priority: "MEDIUM" });
    const days = Math.round(((data.dueDate as Date).getTime() - Date.now()) / 86_400_000);
    expect(days).toBe(7);
  });

  it("notifies team members", async () => {
    db.discussionItem.findFirst.mockResolvedValue(null);
    await createDiscussionItem(valid);
    expect(db.notification.createMany.mock.calls[0][0].data[0]).toMatchObject({ userId: "u1", type: "DISCUSSION_CREATED" });
  });

  it.each([
    [{ ...valid, title: "" }],
    [{ ...valid, stage: "" }],
    [{ ...valid, options: [{ label: "A" }] }],
  ])("invalid input → 400", async (input) => {
    expect(await createDiscussionItem(input)).toMatchObject({ success: false, status: 400 });
  });
});

describe("updateDiscussionItem", () => {
  it("updateDiscussionItem rejects other project", async () => {
    db.discussionItem.findFirst.mockResolvedValue(null);
    expect(await updateDiscussionItem("d9", "p1", { status: "COMPLETED" })).toMatchObject({ success: false, status: 404 });
    expect(db.discussionItem.findFirst.mock.calls[0][0].where).toEqual({ id: "d9", projectId: "p1" });
  });

  it("COMPLETED sets resolvedDate once", async () => {
    db.discussionItem.findFirst.mockResolvedValue({ id: "d1", projectId: "p1", resolvedDate: null });
    await updateDiscussionItem("d1", "p1", { status: "COMPLETED", assigneeId: "u2" });
    const data = db.discussionItem.update.mock.calls[0][0].data;
    expect(data.resolvedDate).toBeInstanceOf(Date);
    expect(data.assigneeId).toBe("u2");
  });
});
