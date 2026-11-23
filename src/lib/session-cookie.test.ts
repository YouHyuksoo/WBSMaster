/**
 * @file src/lib/session-cookie.test.ts
 * @description
 * 로그인 세션 쿠키가 위조되지 않는지, 그리고 쿠키를 다루는 길이 session-cookie.ts 하나뿐인지 검사합니다.
 *
 * 초보자 가이드:
 * - 회귀: 쿠키 값이 userId 그대로여서, 사용자 목록(GET /api/users)에서 본 ADMIN 의 id 를 쿠키에 적으면 관리자가 됐다.
 * - 동작 검사: 예전 모양(userId 쿠키) · 서명을 고친 토큰 · 만료된 토큰으로는 getUser() 가 null 을 돌려준다.
 * - 구조 검사: src 에서 next/headers 를 import 하는 파일은 session-cookie.ts 뿐이어야 한다.
 *   실패하면 쿠키를 직접 읽지 말고 @/lib/auth 의 requireAuth · getUser 를 쓴다.
 * @vitest-environment node
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";

const jar = new Map<string, string>();
vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) => (jar.has(name) ? { name, value: jar.get(name)! } : undefined),
    set: (name: string, value: string) => void jar.set(name, value),
    delete: (name: string) => void jar.delete(name),
  }),
}));
const findUnique = vi.fn();
vi.mock("@/lib/prisma", () => ({ prisma: { user: { findUnique }, teamMember: { findUnique: vi.fn() } } }));

const { SESSION_COOKIE, createSessionToken, verifySessionToken, setSessionCookie, clearSessionCookie } = await import("./session-cookie");
const { getUser } = await import("./auth");

const SECRET = "test-only-session-secret-0123456789abcdef";
const admin = { id: "11111111-2222-3333-4444-555555555555", email: "admin@example.invalid", name: "관리자", avatar: null, role: "ADMIN" };

beforeEach(() => {
  jar.clear();
  findUnique.mockReset();
  findUnique.mockResolvedValue(admin);
  process.env.SESSION_SECRET = SECRET;
});

describe("세션 토큰", () => {
  it("만든 토큰은 같은 userId 로 확인된다", () => {
    expect(verifySessionToken(createSessionToken(admin.id))).toBe(admin.id);
  });

  it("userId 만 적은 값 · 서명 없는 값은 거절한다", () => {
    expect(verifySessionToken(admin.id)).toBeNull();
    expect(verifySessionToken(`v1.${Buffer.from(admin.id).toString("base64url")}.${Date.now() + 1000}.`)).toBeNull();
    expect(verifySessionToken("")).toBeNull();
  });

  it("다른 사용자의 id 로 바꿔 끼운 토큰은 거절한다", () => {
    const [v, , exp, sig] = createSessionToken("normal-user").split(".");
    expect(verifySessionToken([v, Buffer.from(admin.id).toString("base64url"), exp, sig].join("."))).toBeNull();
  });

  it("만료 시각을 늘린 토큰 · 만료된 토큰은 거절한다", () => {
    const past = Date.now() - 8 * 24 * 60 * 60 * 1000;
    const expired = createSessionToken(admin.id, past);
    expect(verifySessionToken(expired)).toBeNull();
    const [v, id, , sig] = expired.split(".");
    expect(verifySessionToken([v, id, String(Date.now() + 1000), sig].join("."))).toBeNull();
  });

  it("다른 비밀키로 만든 토큰은 거절한다", () => {
    const token = createSessionToken(admin.id);
    process.env.SESSION_SECRET = "another-secret-another-secret-another-secret";
    expect(verifySessionToken(token)).toBeNull();
  });

  it("SESSION_SECRET 이 없거나 짧으면 토큰을 만들지 않는다 (임시 기본값 없음)", () => {
    delete process.env.SESSION_SECRET;
    expect(() => createSessionToken(admin.id)).toThrow(/SESSION_SECRET/);
    process.env.SESSION_SECRET = "short";
    expect(() => createSessionToken(admin.id)).toThrow(/SESSION_SECRET/);
  });
});

describe("getUser 는 서명된 세션 쿠키만 믿는다", () => {
  it("예전 모양(userId 쿠키에 ADMIN 의 id)으로는 로그인되지 않는다", async () => {
    jar.set("userId", admin.id);
    expect(await getUser()).toBeNull();
    expect(findUnique).not.toHaveBeenCalled();
  });

  it("세션 쿠키에 userId 를 그대로 적어도 로그인되지 않는다", async () => {
    jar.set(SESSION_COOKIE, admin.id);
    expect(await getUser()).toBeNull();
    expect(findUnique).not.toHaveBeenCalled();
  });

  it("로그인으로 심은 쿠키는 그 사용자로 확인되고, 로그아웃하면 풀린다", async () => {
    jar.set("userId", "legacy");
    await setSessionCookie(admin.id, false);
    expect(jar.has("userId")).toBe(false);
    expect(await getUser()).toEqual(admin);
    expect(findUnique).toHaveBeenCalledWith(expect.objectContaining({ where: { id: admin.id } }));
    await clearSessionCookie();
    expect(await getUser()).toBeNull();
  });

  it("SESSION_SECRET 이 없으면 쿠키가 있어도 로그인되지 않는다", async () => {
    await setSessionCookie(admin.id, false);
    delete process.env.SESSION_SECRET;
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(await getUser()).toBeNull();
    expect(log).toHaveBeenCalled();
    log.mockRestore();
  });
});

/** src 아래 소스 파일 (테스트 제외) */
export function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) return name === "generated" ? [] : sourceFiles(full);
    return /\.(ts|tsx)$/.test(name) && !/\.test\.(ts|tsx)$/.test(name) ? [full] : [];
  });
}

/** 요청 쿠키 · 헤더를 직접 읽는 import */
export const NEXT_HEADERS_IMPORT = /from\s+["']next\/headers["']/;

describe("구조: 쿠키를 다루는 곳은 하나", () => {
  it("src 에서 next/headers 를 import 하는 파일은 src/lib/session-cookie.ts 뿐이다", () => {
    const src = join(process.cwd(), "src");
    const hits = sourceFiles(src)
      .filter((file) => NEXT_HEADERS_IMPORT.test(readFileSync(file, "utf8")))
      .map((file) => relative(src, file).split(sep).join("/"));
    expect(hits, "쿠키를 직접 읽지 말고 @/lib/auth 의 requireAuth · getUser 를 쓰세요").toEqual(["lib/session-cookie.ts"]);
  });
});
