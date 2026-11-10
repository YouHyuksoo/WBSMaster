/**
 * @file src/components/layout/DashboardSidebar.test.ts
 * @description
 * 좌측 메뉴 등록 규칙을 소스로 검사합니다 (HANES 방식: 화면 등록부 menu-config.ts + DB 배치).
 *
 * 초보자 가이드:
 * - 새 기능 페이지를 만들고 MENU_REGISTRY 등록을 빠뜨리면 실패한다. 메뉴에 두지 않는 페이지는 NOT_IN_MENU 에 이유와 함께 적는다.
 * - 처음 배치(DEFAULT_MENU_LAYOUT)에 모든 메뉴가 한 번씩 있어야 하고, 마이그레이션 SQL 도 같은 배치를 넣어야 한다.
 */

import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { DEFAULT_MENU_LAYOUT, MENU_REGISTRY, menuForPath } from "@/lib/menu/menu-config";

const ROOT = process.cwd();
const DASHBOARD_DIR = join(ROOT, "src", "app", "dashboard");
const read = (...p: string[]) => readFileSync(join(ROOT, ...p), "utf8");
const sidebar = read("src", "components", "layout", "DashboardSidebar.tsx");
const row = read("src", "components", "layout", "SidebarMenuRow.tsx");

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

describe("좌측 메뉴 등록 (menu-config.ts)", () => {
  it("모든 기능 페이지가 등록부에 있다 (예외 목록 제외)", () => {
    const hrefs = new Set(MENU_REGISTRY.map((m) => m.href));
    expect(featureDirs.filter((name) => !NOT_IN_MENU[name] && !hrefs.has(`/dashboard/${name}`))).toEqual([]);
  });

  it("예외 목록의 페이지가 실제로 있다", () => {
    expect(Object.keys(NOT_IN_MENU).filter((name) => !featureDirs.includes(name))).toEqual([]);
  });

  it("등록부의 주소마다 실제 페이지가 있고 코드는 겹치지 않는다", () => {
    const missing = MENU_REGISTRY.filter((m) => !existsSync(join(ROOT, "src", "app", ...m.href.split("/").filter(Boolean), "page.tsx")));
    expect(missing.map((m) => m.href)).toEqual([]);
    const codes = MENU_REGISTRY.map((m) => m.code);
    expect(new Set(codes).size).toBe(codes.length);
    expect(codes.every((c) => /^[A-Z][A-Z0-9_]*$/.test(c))).toBe(true);
  });

  it("처음 배치에 모든 메뉴가 정확히 한 번 있고, 마이그레이션 SQL 이 같은 배치 · 권한을 넣는다", () => {
    const placed = DEFAULT_MENU_LAYOUT.flatMap((c) => c.menus);
    expect([...placed].sort()).toEqual(MENU_REGISTRY.map((m) => m.code).sort());
    // 메뉴 배치 · 권한은 여러 마이그레이션에 나뉘어 있을 수 있다 (처음 배치 + 이후 추가 메뉴)
    const migDir = join(ROOT, "prisma", "migrations");
    const migration = readdirSync(migDir, { withFileTypes: true })
      .filter((d) => d.isDirectory() && existsSync(join(migDir, d.name, "migration.sql")))
      .map((d) => readFileSync(join(migDir, d.name, "migration.sql"), "utf8"))
      .join(String.fromCharCode(10));
    for (const c of DEFAULT_MENU_LAYOUT) {
      for (const m of c.menus) expect(migration).toContain(`VALUES ('${m}','${c.code}',`);
    }
    for (const m of MENU_REGISTRY.filter((x) => !x.systemOnly)) {
      expect(migration).toContain(`VALUES ('USER','${m.code}')`);
      expect(migration).not.toContain(`'GUEST','${MENU_REGISTRY.find((x) => x.systemOnly)!.code}'`);
    }
  });

  it("주소 → 메뉴는 가장 긴 주소가 이긴다 (채팅 분석 · 대시보드 정확히 일치)", () => {
    expect(menuForPath("/dashboard/chat/history")?.code).toBe("CHAT_ANALYTICS");
    expect(menuForPath("/dashboard/chat")?.code).toBe("AI_CHAT");
    expect(menuForPath("/dashboard")?.code).toBe("DASHBOARD");
    expect(menuForPath("/dashboard/wbs/123")?.code).toBe("WBS");
    expect(menuForPath("/dashboard/help")).toBeUndefined();
  });
});

describe("좌측 메뉴 화면 규칙", () => {
  it("메뉴의 다크 호버 · 키보드 포커스는 밝은 상태 토큰을 공유한다", () => {
    expect(row).not.toContain("dark:hover:bg-surface-dark");
    expect(row).toContain("dark:hover:bg-surface-hover");
    expect(row).toContain("focus-visible:ring-2");
    expect(sidebar).toContain("menuInteractionClassName");
  });

  it("그룹은 접고 펼치는 상위 메뉴이고 현재 화면이 든 그룹은 펼쳐진다", () => {
    expect(sidebar).toContain("aria-controls={panelId}");
    expect(sidebar).toContain("aria-expanded={open}");
    expect(sidebar).toMatch(/useState<Record<string, boolean>>\(\(\) => \(activeGroup/);
  });

  it("권한 없는 메뉴는 흐리게 · 누를 수 없게, 즐겨찾기 별은 링크 밖 형제 버튼", () => {
    expect(row).toContain('aria-disabled="true"');
    expect(row).toContain("cursor-not-allowed");
    expect(row).toMatch(/<\/Link>\s*\)\}\s*\{onToggleFavorite/);
  });

  it("즐겨찾기 별은 display:none 으로 숨기지 않는다 (Tab 으로 닿아야 한다)", () => {
    expect(row).not.toContain("hidden group-hover");
    expect(row).toContain("opacity-0 pointer-events-none");
    expect(row).toContain("focus-visible:opacity-100");
  });

  it("로그아웃은 헤더 사용자 메뉴에만 있고 사이드바에는 없다", () => {
    expect(sidebar).not.toContain("/api/auth/logout");
    expect(sidebar).not.toContain(">로그아웃<");
  });
});
