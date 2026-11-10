/**
 * @file src/components/layout/DashboardSidebar.test.ts
 * @description
 * src/app/dashboard/<기능>/page.tsx 마다 사이드바 메뉴가 있는지 소스를 읽어 검사합니다.
 *
 * 초보자 가이드:
 * - 새 기능 페이지를 만들고 메뉴 등록을 빠뜨리면 이 테스트가 실패한다.
 * - 메뉴에 두지 않는 페이지는 아래 NOT_IN_MENU 에 이유와 함께 적는다.
 */

import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const DASHBOARD_DIR = join(process.cwd(), "src", "app", "dashboard");
const sidebar = readFileSync(join(process.cwd(), "src", "components", "layout", "DashboardSidebar.tsx"), "utf8");

/** 메뉴에 두지 않는 페이지: 이유 */
const NOT_IN_MENU: Record<string, string> = {
  help: "사이드바 하단 도움말 링크로 연다",
  guide: "헤더(DashboardHeader) 가이드 링크로 연다",
  members: "메뉴에 없던 기존 페이지 (2026-11-09 현재 이 페이지로 가는 링크 없음)",
  projects: "헤더 프로젝트 선택 · 대시보드 홈 링크로 연다",
};

const featureDirs = readdirSync(DASHBOARD_DIR, { withFileTypes: true })
  .filter((d) => d.isDirectory() && existsSync(join(DASHBOARD_DIR, d.name, "page.tsx")))
  .map((d) => d.name);

describe("사이드바 메뉴 등록", () => {
  it("메뉴의 다크 호버는 밝은 상태 토큰을 공유한다", () => {
    expect(sidebar).not.toContain("dark:hover:bg-surface-dark");
    expect(sidebar).toContain("dark:hover:bg-surface-hover");
    expect(sidebar).toContain("focus-visible:ring-2");
    // 일반 메뉴 · 관리 펼침 버튼 · 관리 서브메뉴 · 도움말
    expect(sidebar.match(/\$\{menuInteractionClassName\}/g)).toHaveLength(4);
  });

  it("로그아웃은 헤더 사용자 메뉴에만 있고 사이드바에는 없다", () => {
    expect(sidebar).not.toContain("/api/auth/logout");
    expect(sidebar).not.toContain(">로그아웃<");
  });

  it("관리 메뉴는 접고 펼치는 서브메뉴이고 관리 화면에서는 펼쳐진다", () => {
    expect(sidebar).toContain('aria-controls="sidebar-management-menu"');
    expect(sidebar).toContain("aria-expanded={isManagementOpen}");
    expect(sidebar).toContain("useState(isInManagement)");
    expect(sidebar).toMatch(/>\s*시스템관리\s*<\/p>/);
    expect(sidebar).not.toMatch(/>\s*Management\s*<\/p>/);
  });

  it("모든 기능 페이지가 메뉴에 있다 (예외 목록 제외)", () => {
    const missing = featureDirs.filter((name) => !NOT_IN_MENU[name] && !sidebar.includes(`"/dashboard/${name}"`));
    expect(missing).toEqual([]);
  });

  it("예외 목록의 페이지가 실제로 있다", () => {
    expect(Object.keys(NOT_IN_MENU).filter((name) => !featureDirs.includes(name))).toEqual([]);
  });
});
