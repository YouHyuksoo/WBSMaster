/**
 * @file src/lib/session.test.ts
 * @description 세션 만료(401) 시 로그인 화면으로 보내는지 검증합니다.
 *
 * 초보자 가이드:
 * - 회귀: 쿠키가 없으면 주간보고 "인증이 필요합니다", 진도/리스크 "불러오는 중" 에서 멈췄다.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { checkSession, handleUnauthorized, resetSessionRedirectForTest } from "./session";
import { handleResponse, ApiError } from "./api";

const assign = vi.fn();

beforeEach(() => {
  resetSessionRedirectForTest();
  assign.mockReset();
  localStorage.setItem("user", JSON.stringify({ email: "a@b.c" }));
  vi.stubGlobal("location", { ...window.location, pathname: "/dashboard/weekly-report", assign });
});

afterEach(() => {
  vi.unstubAllGlobals();
  localStorage.clear();
});

describe("handleUnauthorized", () => {
  it("저장된 사용자 정보를 지우고 /login 으로 보낸다 (한 번만)", () => {
    handleUnauthorized();
    handleUnauthorized();
    expect(localStorage.getItem("user")).toBeNull();
    expect(assign).toHaveBeenCalledTimes(1);
    expect(assign).toHaveBeenCalledWith("/login");
  });

  it("이미 로그인 화면이면 이동하지 않는다", () => {
    vi.stubGlobal("location", { ...window.location, pathname: "/login", assign });
    handleUnauthorized();
    expect(assign).not.toHaveBeenCalled();
  });
});

describe("checkSession", () => {
  it("/api/auth/me 가 401 이면 로그인 화면으로", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("{}", { status: 401 })));
    await checkSession();
    expect(assign).toHaveBeenCalledWith("/login");
  });

  it("200 이면 그대로 둔다", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("{}", { status: 200 })));
    await checkSession();
    expect(assign).not.toHaveBeenCalled();
    expect(localStorage.getItem("user")).not.toBeNull();
  });
});

describe("api handleResponse", () => {
  it("401 응답은 ApiError 를 던지면서 로그인 화면으로 보낸다", async () => {
    const res = new Response(JSON.stringify({ error: "인증이 필요합니다." }), { status: 401 });
    await expect(handleResponse(res)).rejects.toBeInstanceOf(ApiError);
    expect(assign).toHaveBeenCalledWith("/login");
  });

  it("403 은 로그인 화면으로 보내지 않는다", async () => {
    const res = new Response(JSON.stringify({ error: "권한 없음" }), { status: 403 });
    await expect(handleResponse(res)).rejects.toBeInstanceOf(ApiError);
    expect(assign).not.toHaveBeenCalled();
  });
});
