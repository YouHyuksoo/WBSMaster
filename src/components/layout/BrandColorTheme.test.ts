/**
 * @file src/components/layout/BrandColorTheme.test.ts
 * @description 브랜드 컬러 테마(jisung-ui 와 같은 기본 · Custom · Orchid)가 빠지지 않았는지 소스로 검사합니다.
 * 초보자 가이드:
 * - 회귀(2026-11-10): jisung-ui 의 컬러 테마 전환 버튼 · 팔레트가 WBS 에 없었다.
 * - 팔레트(globals.css) · 헤더 버튼 · 저장 키 · 순서를 함께 본다.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const css = readFileSync(join(process.cwd(), "src", "app", "globals.css"), "utf8");
const header = readFileSync(join(process.cwd(), "src", "components", "layout", "DashboardHeader.tsx"), "utf8");

describe("브랜드 컬러 테마", () => {
  it("globals.css 에 Custom · Orchid 팔레트(라이트 · 다크)가 있고 .dark 토큰보다 뒤에 있다", () => {
    for (const sel of ['[data-color-theme="custom"] {', '[data-color-theme="orchid"] {', '[data-color-theme="orchid"].dark']) {
      expect(css).toContain(sel);
    }
    expect(css.indexOf('[data-color-theme="custom"] {')).toBeGreaterThan(css.indexOf(".dark {"));
    expect(css).not.toMatch(/\[data-color-theme="orchid"\][^}]*--font-sans/);
  });

  it("헤더에 기본 → Custom → Orchid 순환 버튼이 있고 선택을 저장한다", () => {
    expect(header).toContain('const COLOR_THEME_ORDER: ColorTheme[] = ["default", "custom", "orchid"]');
    expect(header).toContain('localStorage.setItem("colorTheme", next)');
    expect(header).toContain('root.setAttribute("data-color-theme", theme)');
    expect(header).toContain('name="palette"');
  });
});
