/**
 * @file src/app/api/chat/actions/[id]/confirm/route.test.ts
 * @description
 * AI 채팅 쓰기 확인 API 테스트입니다. 인증·prisma·서비스는 목입니다.
 *
 * 초보자 가이드:
 * - 본인 제안만(다른 사용자는 404), 프로젝트 멤버만, PENDING 이고 만료 전일 때 한 번만 실행된다.
 * - 이미 처리된 제안은 409, 만료는 410. 서비스가 실패하면 FAILED 로 기록한다.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  action: null as Record<string, unknown> | null,
  claimed: 1,
  denied: null as Response | null,
}));
const db = vi.hoisted(() => ({
  chatPendingAction: {
    findFirst: vi.fn(async () => state.action),
    updateMany: vi.fn(async () => ({ count: state.claimed })),
    update: vi.fn(async (_args: { where: unknown; data: Record<string, unknown> }) => ({})),
  },
}));
const svc = vi.hoisted(() => ({
  createTask: vi.fn(async (_input: Record<string, unknown>) => ({ success: true, task: { id: "t-new" } })),
  updateIssue: vi.fn(async (_id: string, _p: string, _patch: unknown) => ({ success: true, data: { id: "i-11" } }) as Record<string, unknown>),
}));
vi.mock("@/lib/auth", () => ({
  requireAuth: vi.fn(async () => ({ user: { id: "u1", email: "u1@x", name: "유혁수", role: "USER" }, error: null })),
  assertProjectAccess: vi.fn(async () => state.denied),
}));
vi.mock("@/lib/prisma", () => ({ prisma: db }));
vi.mock("@/lib/services/taskService", () => ({ createTask: svc.createTask, updateTask: vi.fn() }));
vi.mock("@/lib/services/issueService", () => ({ createIssue: vi.fn(), updateIssue: svc.updateIssue }));
vi.mock("@/lib/services/fieldIssueService", () => ({ createFieldIssue: vi.fn(), updateFieldIssue: vi.fn() }));
vi.mock("@/lib/services/discussionItemService", () => ({ createDiscussionItem: vi.fn(), updateDiscussionItem: vi.fn() }));
const wbs = vi.hoisted(() => ({ updateWbsItems: vi.fn(async (..._a: unknown[]) => ({ success: true, data: { id: "w11", updated: 2 } })) }));
vi.mock("@/lib/services/wbsService", () => wbs);

import { POST } from "./route";

const call = () => POST(new Request("http://x", { method: "POST" }) as never, { params: Promise.resolve({ id: "act-1" }) });
const future = () => new Date(Date.now() + 10 * 60_000);

beforeEach(() => {
  vi.clearAllMocks();
  state.claimed = 1;
  state.denied = null;
  state.action = { id: "act-1", userId: "u1", projectId: "p1", kind: "create_task", args: { title: "설비점검", assigneeId: "c" }, status: "PENDING", expiresAt: future() };
});

describe("POST /api/chat/actions/[id]/confirm", () => {
  it("executes service once", async () => {
    const res = await call();
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ status: "CONFIRMED", resultRef: "t-new", link: "/dashboard/kanban" });
    expect(svc.createTask).toHaveBeenCalledTimes(1);
    expect(svc.createTask.mock.calls[0][0]).toMatchObject({ title: "설비점검", projectId: "p1", creatorId: "u1", assigneeId: "c", isAiGenerated: true });
    expect((db.chatPendingAction.findFirst.mock.calls[0] as unknown as [{ where: unknown }])[0].where).toEqual({ id: "act-1", userId: "u1" });
  });

  it("rejects double confirm", async () => {
    state.claimed = 0;
    state.action = { ...state.action!, status: "CONFIRMED" };
    const res = await call();
    expect(res.status).toBe(409);
    expect(svc.createTask).not.toHaveBeenCalled();
  });

  it("rejects other user", async () => {
    state.action = null;
    expect((await call()).status).toBe(404);
  });

  it("rejects expired", async () => {
    state.action = { ...state.action!, expiresAt: new Date(Date.now() - 1000) };
    const res = await call();
    expect(res.status).toBe(410);
    expect(db.chatPendingAction.update.mock.calls[0][0]).toMatchObject({ data: { status: "EXPIRED" } });
    expect(svc.createTask).not.toHaveBeenCalled();
  });

  it("checks project access", async () => {
    state.denied = new Response("{}", { status: 403 });
    expect((await call()).status).toBe(403);
    expect(svc.createTask).not.toHaveBeenCalled();
  });

  it("update_wbs assigns to every target with mode", async () => {
    state.action = { ...state.action!, kind: "update_wbs", args: { targetIds: ["w11", "w12"], codes: ["1.1", "1.2"], mode: "add", patch: { assigneeIds: ["k", "h"] } } };
    const res = await call();
    expect(await res.json()).toMatchObject({ status: "CONFIRMED", link: "/dashboard/wbs" });
    expect(wbs.updateWbsItems).toHaveBeenCalledWith(["w11", "w12"], "p1", { assigneeIds: ["k", "h"] }, "add");
  });

  it("service failure marks FAILED", async () => {
    state.action = { ...state.action!, kind: "update_issue", args: { targetId: "i-x", patch: { status: "CLOSED" } } };
    svc.updateIssue.mockResolvedValueOnce({ success: false, error: "이슈를 찾을 수 없습니다.", status: 404 } as never);
    const res = await call();
    expect(res.status).toBe(404);
    expect(svc.updateIssue).toHaveBeenCalledWith("i-x", "p1", { status: "CLOSED" });
    const last = db.chatPendingAction.update.mock.calls.at(-1)![0];
    expect(last.data).toMatchObject({ status: "FAILED", error: "이슈를 찾을 수 없습니다." });
  });
});
