/**
 * @file src/app/api/chat/actions/[id]/cancel/route.test.ts
 * @description
 * AI 채팅 확인 카드 [취소] API 테스트입니다. 인증·prisma 는 목입니다.
 *
 * 초보자 가이드:
 * - 본인 PENDING 제안만 CANCELLED 로. 다른 사용자는 404, 이미 처리된 제안은 409.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({ action: null as Record<string, unknown> | null, count: 1 }));
const db = vi.hoisted(() => ({
  chatPendingAction: {
    findFirst: vi.fn(async (_a: unknown) => state.action),
    updateMany: vi.fn(async (_a: { where: Record<string, unknown>; data: Record<string, unknown> }) => ({ count: state.count })),
  },
}));
vi.mock("@/lib/auth", () => ({
  requireAuth: vi.fn(async () => ({ user: { id: "u1", email: "u1@x", role: "USER" }, error: null })),
  assertProjectAccess: vi.fn(async () => null),
}));
vi.mock("@/lib/prisma", () => ({ prisma: db }));

import { POST } from "./route";

const call = () => POST(new Request("http://x", { method: "POST" }) as never, { params: Promise.resolve({ id: "act-1" }) });

beforeEach(() => {
  vi.clearAllMocks();
  state.action = { id: "act-1", userId: "u1", projectId: "p1", status: "PENDING" };
  state.count = 1;
});

describe("POST /api/chat/actions/[id]/cancel", () => {
  it("PENDING → CANCELLED", async () => {
    const res = await call();
    expect(await res.json()).toEqual({ status: "CANCELLED" });
    expect(db.chatPendingAction.updateMany.mock.calls[0][0]).toMatchObject({ where: { id: "act-1", userId: "u1", status: "PENDING" }, data: { status: "CANCELLED" } });
  });

  it("other user → 404", async () => {
    state.action = null;
    expect((await call()).status).toBe(404);
  });

  it("already processed → 409", async () => {
    state.count = 0;
    expect((await call()).status).toBe(409);
  });
});
