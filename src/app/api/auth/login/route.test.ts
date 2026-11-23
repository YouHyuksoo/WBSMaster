/**
 * @file src/app/api/auth/login/route.test.ts
 * @description
 * 로그인 라우트가 해시로 비밀번호를 확인하고 서명된 세션 쿠키를 심는지 검사합니다.
 *
 * 초보자 가이드:
 * - 맞는 비밀번호: 200 + 서명된 wbs_session 쿠키 (값이 userId 그대로가 아니다)
 * - 예전 평문 행으로 로그인하면 그 자리에서 해시로 바꿔 저장한다. 이미 해시면 다시 쓰지 않는다.
 * - 틀린 비밀번호 · 없는 사용자 · 문자열이 아닌 입력: 쿠키를 심지 않는다.
 * - 계속 틀리면 429 로 막고, 그동안은 맞는 비밀번호도 받지 않는다 (src/lib/login-throttle.ts).
 * @vitest-environment node
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const jar = new Map<string, string>();
vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) => (jar.has(name) ? { name, value: jar.get(name)! } : undefined),
    set: (name: string, value: string) => void jar.set(name, value),
    delete: (name: string) => void jar.delete(name),
  }),
}));
const findUnique = vi.fn();
const update = vi.fn();
vi.mock("@/lib/prisma", () => ({ prisma: { user: { findUnique, update } } }));

const { POST } = await import("./route");
const { hashPassword, isPasswordHash, verifyPassword } = await import("@/lib/password");
const { SESSION_COOKIE, verifySessionToken } = await import("@/lib/session-cookie");
const { resetLoginThrottleForTest } = await import("@/lib/login-throttle");

const row = { id: "u-1", email: "user@example.invalid", name: "사용자", avatar: null, role: "USER", createdAt: new Date(0) };
const login = (body: unknown) =>
  POST(new NextRequest("http://localhost/api/auth/login", { method: "POST", body: JSON.stringify(body) }));

beforeEach(() => {
  jar.clear();
  findUnique.mockReset();
  update.mockReset();
  resetLoginThrottleForTest();
  process.env.SESSION_SECRET = "test-only-session-secret-0123456789abcdef";
});

describe("POST /api/auth/login", () => {
  it("해시로 저장된 비밀번호가 맞으면 서명된 세션 쿠키를 심고 비밀번호는 응답에 넣지 않는다", async () => {
    findUnique.mockResolvedValue({ ...row, password: await hashPassword("pw-123456") });
    const res = await login({ email: row.email, password: "pw-123456" });
    expect(res.status).toBe(200);
    expect(JSON.stringify(await res.json())).not.toMatch(/password|scrypt/);
    const cookie = jar.get(SESSION_COOKIE)!;
    expect(cookie).not.toBe(row.id);
    expect(verifySessionToken(cookie)).toBe(row.id);
    expect(update).not.toHaveBeenCalled();
  });

  it("예전 평문 행은 로그인에 성공하면 해시로 바꿔 저장한다", async () => {
    findUnique.mockResolvedValue({ ...row, password: "admin123" });
    const res = await login({ email: row.email, password: "admin123" });
    expect(res.status).toBe(200);
    expect(update).toHaveBeenCalledTimes(1);
    const saved = update.mock.calls[0][0].data.password as string;
    expect(isPasswordHash(saved)).toBe(true);
    expect((await verifyPassword("admin123", saved)).ok).toBe(true);
  });

  it("틀린 비밀번호 · 없는 사용자 · 문자열이 아닌 입력은 쿠키를 심지 않는다", async () => {
    findUnique.mockResolvedValue({ ...row, password: await hashPassword("pw-123456") });
    expect((await login({ email: row.email, password: "wrong" })).status).toBe(401);
    findUnique.mockResolvedValue(null);
    expect((await login({ email: "nobody@example.invalid", password: "pw-123456" })).status).toBe(401);
    expect((await login({ email: row.email, password: { not: "" } })).status).toBe(400);
    expect((await login({ email: { contains: "" }, password: "pw-123456" })).status).toBe(400);
    expect(jar.size).toBe(0);
    expect(update).not.toHaveBeenCalled();
  });

  it("5번 틀리면 429 로 막고, 막힌 동안은 맞는 비밀번호도 받지 않는다", async () => {
    findUnique.mockResolvedValue({ ...row, password: await hashPassword("pw-123456") });
    for (let i = 0; i < 5; i++) expect((await login({ email: row.email, password: `wrong-${i}` })).status).toBe(401);
    const blocked = await login({ email: row.email, password: "pw-123456" });
    expect(blocked.status).toBe(429);
    expect(Number(blocked.headers.get("Retry-After"))).toBeGreaterThan(0);
    expect(jar.size).toBe(0);
  });

  it("SESSION_SECRET 이 없으면 로그인되지 않는다", async () => {
    delete process.env.SESSION_SECRET;
    findUnique.mockResolvedValue({ ...row, password: await hashPassword("pw-123456") });
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    expect((await login({ email: row.email, password: "pw-123456" })).status).toBe(500);
    expect(jar.size).toBe(0);
    log.mockRestore();
  });
});
