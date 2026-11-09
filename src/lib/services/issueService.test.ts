/**
 * @file src/lib/services/issueService.test.ts
 * @description
 * 이슈 생성·수정 서비스 테스트입니다 (화면 API 와 AI 채팅 확인 카드가 같이 쓴다). prisma 는 목입니다.
 *
 * 초보자 가이드:
 * - 코드: 같은 프로젝트의 마지막 코드 다음 번호 (ISS-012 → ISS-013)
 * - 긴급(CRITICAL) 이슈는 보고자를 뺀 프로젝트 멤버에게 알림
 * - 수정은 같은 프로젝트의 이슈만 (다른 프로젝트 id 면 404)
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

const db = vi.hoisted(() => ({
  project: { findUnique: vi.fn() },
  issue: { findFirst: vi.fn(), create: vi.fn(), update: vi.fn() },
  teamMember: { findMany: vi.fn() },
  notification: { createMany: vi.fn() },
}));
vi.mock("@/lib/prisma", () => ({ prisma: db }));

import { createIssue, updateIssue } from "./issueService";

beforeEach(() => {
  vi.clearAllMocks();
  db.project.findUnique.mockResolvedValue({ id: "p1", name: "오창" });
  db.issue.create.mockImplementation(async ({ data }: { data: Record<string, unknown> }) => ({ id: "i-new", ...data }));
  db.issue.update.mockImplementation(async ({ data }: { data: Record<string, unknown> }) => ({ id: "i1", ...data }));
  db.teamMember.findMany.mockResolvedValue([{ userId: "u1" }, { userId: "u2" }]);
});

describe("createIssue", () => {
  it("next code ISS-013 after ISS-012", async () => {
    db.issue.findFirst.mockResolvedValue({ code: "ISS-012" });
    const r = await createIssue({ title: "로그인 오류", projectId: "p1", reporterId: "u1" });
    expect(r.success).toBe(true);
    expect(db.issue.create.mock.calls[0][0].data).toMatchObject({ code: "ISS-013", status: "OPEN", priority: "MEDIUM", category: "BUG" });
  });

  it("CRITICAL creates notifications for team members except reporter", async () => {
    db.issue.findFirst.mockResolvedValue(null);
    await createIssue({ title: "서버 다운", projectId: "p1", priority: "CRITICAL", reporterId: "u1" });
    const data = db.notification.createMany.mock.calls[0][0].data as { userId: string; type: string }[];
    expect(data.map((d) => d.userId)).toEqual(["u2"]);
    expect(data[0].type).toBe("ISSUE_URGENT");
  });

  it("missing project → 404", async () => {
    db.project.findUnique.mockResolvedValue(null);
    expect(await createIssue({ title: "x", projectId: "nope" })).toMatchObject({ success: false, status: 404 });
  });

  it("missing title → 400", async () => {
    expect(await createIssue({ title: " ", projectId: "p1" })).toMatchObject({ success: false, status: 400 });
  });
});

describe("updateIssue", () => {
  it("updateIssue rejects other project issue", async () => {
    db.issue.findFirst.mockResolvedValue(null);
    expect(await updateIssue("i9", "p1", { status: "CLOSED" })).toMatchObject({ success: false, status: 404 });
    expect(db.issue.findFirst.mock.calls[0][0].where).toEqual({ id: "i9", projectId: "p1" });
    expect(db.issue.update).not.toHaveBeenCalled();
  });

  it("RESOLVED sets resolvedDate, OPEN clears it", async () => {
    db.issue.findFirst.mockResolvedValue({ id: "i1", projectId: "p1", resolvedDate: null });
    await updateIssue("i1", "p1", { status: "RESOLVED" });
    expect(db.issue.update.mock.calls[0][0].data.resolvedDate).toBeInstanceOf(Date);
    db.issue.findFirst.mockResolvedValue({ id: "i1", projectId: "p1", resolvedDate: new Date() });
    await updateIssue("i1", "p1", { status: "OPEN" });
    expect(db.issue.update.mock.calls[1][0].data.resolvedDate).toBeNull();
  });
});
