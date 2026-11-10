/**
 * @file src/components/layout/MenuAccess.test.tsx
 * @description 일반 사용자(USER) 기준으로 화면 접근 차단(MenuAccessGuard)과 좌측 메뉴 흐림 · 숨김을 검증합니다.
 * 초보자 가이드:
 * - 훅(@/hooks)과 경로(next/navigation)를 목으로 바꿔 로그인 · 서버 없이 검사한다.
 */
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  path: "/dashboard",
  role: "USER",
  allowed: ["DASHBOARD", "WBS", "SETTINGS"] as string[] | null,
  loading: false,
}));

vi.mock("next/navigation", () => ({ usePathname: () => state.path }));
vi.mock("@/hooks", () => ({
  useCurrentUser: () => ({ data: { id: "u1", role: state.role } }),
  useMyMenuAccess: () => ({ data: state.loading ? undefined : { role: state.role, allowedMenus: state.allowed }, isLoading: state.loading }),
  useMenuTree: () => ({ data: undefined }), // 처음 배치로 그린다
  useMenuFavorites: () => ({ favorites: [], toggle: vi.fn() }),
}));

import { MenuAccessGuard } from "./MenuAccessGuard";
import { DashboardSidebar } from "./DashboardSidebar";

afterEach(cleanup);
beforeEach(() => {
  state.path = "/dashboard";
  state.role = "USER";
  state.allowed = ["DASHBOARD", "WBS", "SETTINGS"];
  state.loading = false;
});

const guarded = () => render(<MenuAccessGuard><p>본문</p></MenuAccessGuard>);

describe("화면 접근 차단 (USER)", () => {
  it("허용되지 않은 화면은 본문 대신 권한 없음 안내", () => {
    state.path = "/dashboard/kanban";
    guarded();
    expect(screen.getByRole("alert").textContent).toContain("TASK 관리");
    expect(screen.queryByText("본문")).toBeNull();
  });

  it("허용된 화면 · 권한을 받는 중 · 등록되지 않은 주소는 본문을 보여 준다", () => {
    state.path = "/dashboard/wbs/abc";
    guarded();
    expect(screen.getByText("본문")).toBeTruthy();
    cleanup();
    state.path = "/dashboard/kanban";
    state.loading = true;
    guarded();
    expect(screen.getByText("본문")).toBeTruthy();
    cleanup();
    state.loading = false;
    state.path = "/dashboard/help";
    guarded();
    expect(screen.getByText("본문")).toBeTruthy();
  });

  it("ADMIN 전용 화면은 권한 행이 있어도 USER 에게 막힌다, ADMIN 은 통과", () => {
    state.path = "/dashboard/role-admin";
    state.allowed = ["SYS_ROLE"];
    guarded();
    expect(screen.getByRole("alert")).toBeTruthy();
    cleanup();
    state.role = "ADMIN";
    state.allowed = null;
    guarded();
    expect(screen.getByText("본문")).toBeTruthy();
  });
});

describe("좌측 메뉴 (USER)", () => {
  it("허용되지 않은 메뉴는 링크 없이 흐리게, ADMIN 전용 메뉴는 아예 없다", () => {
    render(<DashboardSidebar isOpen={false} onClose={() => {}} />);
    const nav = screen.getByRole("navigation", { name: "주 메뉴" });
    const links = [...nav.querySelectorAll("a")].map((a) => a.getAttribute("href"));
    expect(links).toEqual(expect.arrayContaining(["/dashboard", "/dashboard/wbs", "/dashboard/settings"]));
    expect(links).not.toContain("/dashboard/kanban");
    const disabled = [...nav.querySelectorAll('[aria-disabled="true"]')].map((el) => el.textContent);
    expect(disabled.some((t) => t?.includes("TASK 관리"))).toBe(true);
    for (const label of ["사용자/프로젝트 관리", "메뉴 관리", "권한 관리"]) expect(nav.textContent).not.toContain(label);
  });
});
