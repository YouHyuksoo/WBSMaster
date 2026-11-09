/**
 * @file src/lib/services/fieldIssueService.test.ts
 * @description
 * 고객이슈 생성·수정 서비스 테스트입니다. prisma 는 목입니다.
 *
 * 초보자 가이드:
 * - 코드: 프로젝트별 sequence 다음 번호로 IS0001 형식
 * - 생성하면 프로젝트 멤버 전원에게 FIELD_ISSUE_CREATED 알림
 * - 수정은 같은 프로젝트 레코드만 (다른 프로젝트면 404)
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

const db = vi.hoisted(() => ({
  project: { findUnique: vi.fn() },
  fieldIssue: { findFirst: vi.fn(), create: vi.fn(), update: vi.fn() },
  teamMember: { findMany: vi.fn() },
  notification: { createMany: vi.fn() },
}));
vi.mock("@/lib/prisma", () => ({ prisma: db }));

import { createFieldIssue, updateFieldIssue } from "./fieldIssueService";

beforeEach(() => {
  vi.clearAllMocks();
  db.project.findUnique.mockResolvedValue({ id: "p1", name: "오창" });
  db.fieldIssue.create.mockImplementation(async ({ data }: { data: Record<string, unknown> }) => ({ id: "f-new", ...data }));
  db.fieldIssue.update.mockImplementation(async ({ data }: { data: Record<string, unknown> }) => ({ id: "f1", ...data }));
  db.teamMember.findMany.mockResolvedValue([{ userId: "u1" }, { userId: "u2" }]);
});

describe("createFieldIssue", () => {
  it("code IS0001 format from next sequence", async () => {
    db.fieldIssue.findFirst.mockResolvedValue({ sequence: 7 });
    await createFieldIssue({ projectId: "p1", title: "라벨 오인쇄" });
    expect(db.fieldIssue.create.mock.calls[0][0].data).toMatchObject({ sequence: 8, code: "IS0008", status: "OPEN" });
  });

  it("notifies all team members", async () => {
    db.fieldIssue.findFirst.mockResolvedValue(null);
    await createFieldIssue({ projectId: "p1", title: "라벨 오인쇄" });
    const data = db.notification.createMany.mock.calls[0][0].data as { userId: string; type: string }[];
    expect(data.map((d) => d.userId)).toEqual(["u1", "u2"]);
    expect(data[0].type).toBe("FIELD_ISSUE_CREATED");
  });

  it("missing title → 400", async () => {
    expect(await createFieldIssue({ projectId: "p1", title: "" })).toMatchObject({ success: false, status: 400 });
  });
});

describe("updateFieldIssue", () => {
  it("updateFieldIssue rejects other project", async () => {
    db.fieldIssue.findFirst.mockResolvedValue(null);
    expect(await updateFieldIssue("f9", "p1", { status: "CLOSED" })).toMatchObject({ success: false, status: 404 });
    expect(db.fieldIssue.findFirst.mock.calls[0][0].where).toEqual({ id: "f9", projectId: "p1" });
    expect(db.fieldIssue.update).not.toHaveBeenCalled();
  });

  it("only given fields are updated", async () => {
    db.fieldIssue.findFirst.mockResolvedValue({ id: "f1", projectId: "p1" });
    await updateFieldIssue("f1", "p1", { status: "RESOLVED", assignee: "" });
    expect(db.fieldIssue.update.mock.calls[0][0].data).toEqual({ status: "RESOLVED", assignee: null });
  });
});
