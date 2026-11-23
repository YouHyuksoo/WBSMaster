/**
 * @file src/lib/login-throttle.test.ts
 * @description
 * 로그인 시도 제한(login-throttle.ts)의 횟수 · 시간 규칙을 검사합니다.
 *
 * 초보자 가이드:
 * - 같은 주소 · 같은 이메일로 5번 틀리면 막히고, 15분이 지나면 풀린다.
 * - 주소를 바꿔 가며 시도해도 같은 이메일로 20번이면 막힌다.
 * - 주소는 X-Forwarded-For 의 마지막 값만 믿는다 (맨 앞 값은 요청자가 적을 수 있다).
 */
import { beforeEach, describe, expect, it } from "vitest";
import { clearLoginFailures, clientIp, loginBlockedSeconds, recordLoginFailure, resetLoginThrottleForTest } from "./login-throttle";

const T0 = 1_800_000_000_000;
const MIN = 60 * 1000;

beforeEach(() => resetLoginThrottleForTest());

describe("로그인 시도 제한", () => {
  it("같은 주소 · 이메일로 5번 틀리면 막고 15분 뒤에 푼다", () => {
    for (let i = 0; i < 4; i++) recordLoginFailure("1.1.1.1", "a@example.invalid", T0 + i);
    expect(loginBlockedSeconds("1.1.1.1", "a@example.invalid", T0 + 10)).toBe(0);
    recordLoginFailure("1.1.1.1", "a@example.invalid", T0 + 4);
    expect(loginBlockedSeconds("1.1.1.1", "A@Example.invalid ", T0 + 10)).toBeGreaterThan(14 * 60);
    expect(loginBlockedSeconds("1.1.1.1", "a@example.invalid", T0 + 15 * MIN + 5)).toBe(0);
  });

  it("다른 이메일 · 다른 주소는 막지 않는다", () => {
    for (let i = 0; i < 5; i++) recordLoginFailure("1.1.1.1", "a@example.invalid", T0);
    expect(loginBlockedSeconds("1.1.1.1", "b@example.invalid", T0)).toBe(0);
    expect(loginBlockedSeconds("2.2.2.2", "a@example.invalid", T0)).toBe(0);
  });

  it("주소를 바꿔 가며 시도해도 같은 이메일로 20번이면 막는다", () => {
    for (let i = 0; i < 20; i++) recordLoginFailure(`10.0.0.${i}`, "a@example.invalid", T0);
    expect(loginBlockedSeconds("9.9.9.9", "a@example.invalid", T0)).toBeGreaterThan(0);
  });

  it("이메일을 바꿔 가며 시도해도 같은 주소에서 50번이면 막는다", () => {
    for (let i = 0; i < 50; i++) recordLoginFailure("1.1.1.1", `u${i}@example.invalid`, T0);
    expect(loginBlockedSeconds("1.1.1.1", "new@example.invalid", T0)).toBeGreaterThan(0);
  });

  it("로그인에 성공하면 그 주소 · 이메일의 횟수를 지운다", () => {
    for (let i = 0; i < 4; i++) recordLoginFailure("1.1.1.1", "a@example.invalid", T0);
    clearLoginFailures("1.1.1.1", "a@example.invalid");
    recordLoginFailure("1.1.1.1", "a@example.invalid", T0);
    expect(loginBlockedSeconds("1.1.1.1", "a@example.invalid", T0)).toBe(0);
  });

  it("주소는 X-Forwarded-For 의 마지막 값을 쓴다", () => {
    const request = (value?: string) => new Request("http://localhost/", { headers: value ? { "x-forwarded-for": value } : {} });
    expect(clientIp(request("6.6.6.6, 203.0.113.7"))).toBe("203.0.113.7");
    expect(clientIp(request("203.0.113.7"))).toBe("203.0.113.7");
    expect(clientIp(request())).toBe("unknown");
  });
});
