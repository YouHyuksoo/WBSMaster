/**
 * @file src/lib/password.test.ts
 * @description
 * 비밀번호 해시 · 확인 동작과, 서버 코드가 비밀번호를 평문으로 저장 · 비교하지 않는지 검사합니다.
 *
 * 초보자 가이드:
 * - 회귀: users.password 에 평문을 저장하고 로그인에서 `user.password !== password` 로 비교했다.
 * - 동작 검사: 해시는 매번 다르고, 맞는 비밀번호만 통과한다. 예전 평문 행은 통과하되 needsRehash 로 표시된다.
 * - 구조 검사 (src/app/api · src/lib, 테스트 제외):
 *   1. `.password ===` / `.password !==` 직접 비교 금지 → verifyPassword 를 쓴다
 *   2. `password: <값>` 으로 저장할 때는 같은 줄에 hashPassword( 가 있어야 한다 (`password: true` 조회 선택은 허용)
 * @vitest-environment node
 */
import { readFileSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { describe, expect, it } from "vitest";
import { hashPassword, isPasswordHash, verifyPassword } from "./password";
import { sourceFiles } from "./session-cookie.test";

describe("hashPassword · verifyPassword", () => {
  it("해시는 평문을 담지 않고 매번 다르다", async () => {
    const a = await hashPassword("correct horse");
    const b = await hashPassword("correct horse");
    expect(isPasswordHash(a)).toBe(true);
    expect(a).not.toContain("correct horse");
    expect(a).not.toBe(b);
  });

  it("맞는 비밀번호만 통과한다", async () => {
    const stored = await hashPassword("비밀번호-1234");
    expect(await verifyPassword("비밀번호-1234", stored)).toEqual({ ok: true, needsRehash: false });
    expect(await verifyPassword("비밀번호-12345", stored)).toEqual({ ok: false, needsRehash: false });
  });

  it("해시 문자열 자체를 비밀번호로 넣어도 통과하지 않는다 (DB 덤프를 본 사람이 그대로 로그인하지 못한다)", async () => {
    const stored = await hashPassword("pw-abcdef");
    expect((await verifyPassword(stored, stored)).ok).toBe(false);
  });

  it("예전 평문 행은 통과하고 다시 해시해야 한다고 알린다", async () => {
    expect(await verifyPassword("admin123", "admin123")).toEqual({ ok: true, needsRehash: true });
    expect(await verifyPassword("admin124", "admin123")).toEqual({ ok: false, needsRehash: false });
  });

  it("문자열이 아니거나 빈 입력은 거절한다", async () => {
    const stored = await hashPassword("pw-abcdef");
    for (const input of [undefined, null, "", 0, {}, ["pw-abcdef"]]) {
      expect((await verifyPassword(input, stored)).ok).toBe(false);
      expect((await verifyPassword(input, "")).ok).toBe(false);
    }
  });

  it("깨진 해시 값은 오류 없이 거절한다", async () => {
    expect((await verifyPassword("x", "scrypt$abc$8$1$c2FsdA==$")).ok).toBe(false);
    expect((await verifyPassword("x", "scrypt$16384$8$1$c2FsdA==$")).ok).toBe(false);
  });
});

/** 직접 비교: user.password !== password */
export const PLAIN_COMPARE = /\.password\s*[!=]==?/;
/** 저장: password: <값> 인데 hashPassword 를 거치지 않음 (조회 선택 `password: true`, 응답에서 빼는 `password: _` 는 허용) */
export const PLAIN_STORE = /\bpassword\s*:(?!\s*(true|_)\b)(?!.*hashPassword\()/;

/** 주석 줄을 빼고 규칙에 걸리는 "줄번호: 규칙" 목록 */
export function findPlainPasswordUse(source: string): string[] {
  return source.split(/\r?\n/).flatMap((line, i) => {
    if (/^\s*(\*|\/\/|\/\*)/.test(line)) return [];
    return [
      ...(PLAIN_COMPARE.test(line) ? [`${i + 1}: 직접 비교`] : []),
      ...(PLAIN_STORE.test(line) ? [`${i + 1}: 해시 없이 저장`] : []),
    ];
  });
}

describe("구조: 서버 코드는 비밀번호를 평문으로 저장 · 비교하지 않는다", () => {
  it("검사 규칙이 예전 코드 모양을 잡는다", () => {
    expect(findPlainPasswordUse("    if (!user || user.password !== password) {")).toEqual(["1: 직접 비교"]);
    expect(findPlainPasswordUse('        password: password || "admin123", // 기본 비밀번호')).toEqual(["1: 해시 없이 저장"]);
    expect(findPlainPasswordUse("        ...(password !== undefined && password.trim() !== \"\" && { password }),")).toEqual([]);
    expect(findPlainPasswordUse("        password: true,")).toEqual([]);
    expect(findPlainPasswordUse('        password: await hashPassword(password || "admin123"),')).toEqual([]);
  });

  it("src/app/api · src/lib 에 평문 비교 · 저장이 없다", () => {
    const src = join(process.cwd(), "src");
    const hits = [join(src, "app", "api"), join(src, "lib")]
      .flatMap(sourceFiles)
      .filter((file) => !file.endsWith(join("lib", "password.ts")))
      .flatMap((file) => findPlainPasswordUse(readFileSync(file, "utf8")).map((hit) => `${relative(src, file).split(sep).join("/")}:${hit}`));
    expect(hits, "@/lib/password 의 hashPassword · verifyPassword 를 쓰세요").toEqual([]);
  });
});
