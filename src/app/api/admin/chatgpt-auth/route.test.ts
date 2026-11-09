/**
 * @file src/app/api/admin/chatgpt-auth/route.test.ts
 * @description
 * 관리자 회사 ChatGPT 연결 API 테스트입니다. 인증과 토큰 저장소는 목입니다.
 *
 * 초보자 가이드:
 * - ADMIN 이 아니면 GET/POST/DELETE 모두 403.
 * - 응답에 토큰이 담기면 안 된다 (디바이스 코드·URL·상태만).
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

const auth = vi.hoisted(() => ({ role: "ADMIN" }));
vi.mock("@/lib/auth", () => ({
  requireAuth: vi.fn(async () => ({ user: { id: "u1", email: "a@x", role: auth.role }, error: null })),
}));
const store = vi.hoisted(() => ({
  getChatGptAuthStatus: vi.fn(async () => ({ connected: true, accountEmail: "pm@x", expiresAt: "2026-11-19T00:00:00.000Z" })),
  startDeviceLogin: vi.fn(async () => ({ verificationUri: "https://auth.openai.com/codex/device", userCode: "ABCD-1234", deviceCode: "dc", intervalSec: 5, expiresAt: "x" })),
  pollDeviceLogin: vi.fn(async () => "pending" as const),
  clearChatGptAuth: vi.fn(async () => undefined),
}));
vi.mock("@/lib/llm/chatgpt/token-store", () => store);

import { DELETE, GET, POST } from "./route";

const post = (body: unknown) => POST(new Request("http://x/api/admin/chatgpt-auth", { method: "POST", body: JSON.stringify(body) }) as never);

beforeEach(() => {
  auth.role = "ADMIN";
  vi.clearAllMocks();
});

describe("/api/admin/chatgpt-auth", () => {
  it("403 for non-admin", async () => {
    auth.role = "USER";
    expect((await GET()).status).toBe(403);
    expect((await post({ action: "start" })).status).toBe(403);
    expect((await DELETE()).status).toBe(403);
    expect(store.startDeviceLogin).not.toHaveBeenCalled();
    expect(store.clearChatGptAuth).not.toHaveBeenCalled();
  });

  it("GET returns status", async () => {
    const res = await GET();
    expect(await res.json()).toMatchObject({ connected: true, accountEmail: "pm@x" });
  });

  it("start returns code without tokens", async () => {
    const res = await post({ action: "start" });
    const text = JSON.stringify(await res.json());
    expect(text).toContain("ABCD-1234");
    expect(text).not.toMatch(/access|refresh|token/i);
  });

  it("poll passes through state", async () => {
    store.pollDeviceLogin.mockResolvedValueOnce("connected" as never);
    const res = await post({ action: "poll", deviceCode: "dc" });
    expect(await res.json()).toEqual({ state: "connected" });
    expect(store.pollDeviceLogin).toHaveBeenCalledWith("dc");
  });

  it("bad action → 400", async () => {
    expect((await post({ action: "x" })).status).toBe(400);
  });

  it("DELETE clears auth", async () => {
    expect((await DELETE()).status).toBe(200);
    expect(store.clearChatGptAuth).toHaveBeenCalled();
  });
});
