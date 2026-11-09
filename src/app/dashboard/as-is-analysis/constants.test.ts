/**
 * @file src/app/dashboard/as-is-analysis/constants.test.ts
 * @description AS-IS 배지 · 섹션 색이 라이트 · 다크 테마 모두에 맞는지 검사합니다.
 *
 * 초보자 가이드:
 * - 회귀: bg-*-50 · text-*-600 만 써서 다크 테마에서 배지가 흰 칩으로 튀었다.
 * - 규칙(docs/design/list-page-style.md 7-1): 배경은 반투명(bg-{색}-500/10),
 *   글자색은 dark: 짝을 함께, 섹션 테두리는 border-{색}-500/30.
 */
import { describe, expect, it } from "vitest";
import { MAJOR_CATEGORIES, CURRENT_METHODS, ISSUE_TYPES, PRIORITIES, SECTION_STYLES } from "./constants";

const badgeGroups = { MAJOR_CATEGORIES, CURRENT_METHODS, ISSUE_TYPES, PRIORITIES };

describe("AS-IS 배지 색: 라이트 · 다크 공용", () => {
  for (const [group, configs] of Object.entries(badgeGroups)) {
    it.each(Object.entries(configs as Record<string, { color: string; bgColor: string }>))(`${group}.%s`, (_key, config) => {
      expect(config.bgColor).toMatch(/^bg-[a-z]+-500\/10$/);
      expect(config.color).toMatch(/^text-([a-z]+)-600 dark:text-\1-400$/);
    });
  }

  it.each(Object.entries(SECTION_STYLES))("SECTION_STYLES.%s", (_key, style) => {
    expect(style.bgColor).toMatch(/^bg-[a-z]+-500\/10$/);
    expect(style.borderColor).toMatch(/^border-[a-z]+-500\/30$/);
  });
});
