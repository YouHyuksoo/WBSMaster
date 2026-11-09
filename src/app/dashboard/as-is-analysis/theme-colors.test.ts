/**
 * @file src/app/dashboard/as-is-analysis/theme-colors.test.ts
 * @description AS-IS 화면 소스에서 다크 짝 없이 밝은 색만 쓴 클래스를 찾아냅니다.
 *
 * 초보자 가이드:
 * - 회귀: 배지 · 플로차트 노드 · 스윔레인이 bg-*-50, text-*-600 만 써서 다크 테마에서 흰 면 · 흐린 글자로 보였다.
 * - 규칙(docs/design/list-page-style.md 7-1): 같은 줄에 dark: 짝(dark:bg- / dark:border- / dark:text-)을 함께 쓰거나,
 *   반투명 토큰(bg-{색}-500/10, border-{색}-500/30)을 쓴다.
 * - hover:, focus: 등 상태 접두사가 붙은 클래스와 /투명도 클래스는 검사하지 않는다.
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";

const DIR = join(process.cwd(), "src", "app", "dashboard", "as-is-analysis");
const COLORS = "slate|gray|red|orange|amber|yellow|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|pink|rose";
const RULES: Record<string, RegExp> = {
  bg: new RegExp(`(?<![\\w:-])!?bg-(?:white|(?:${COLORS})-(?:50|100|200))(?![\\w/-])`, "g"),
  border: new RegExp(`(?<![\\w:-])!?border-(?:${COLORS})-(?:100|200|300|400)(?![\\w/-])`, "g"),
  text: new RegExp(`(?<![\\w:-])text-(?:${COLORS})-(?:600|700|800|900)(?![\\w/-])`, "g"),
};

function tsxFiles(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) tsxFiles(full, out);
    else if (/\.(tsx|ts)$/.test(name) && !/\.test\./.test(name)) out.push(full);
  }
  return out;
}

describe("AS-IS 화면 색: 다크 짝 필수", () => {
  it("밝은 색 클래스는 같은 줄에 dark: 짝이 있다", () => {
    const hits: string[] = [];
    for (const file of tsxFiles(DIR)) {
      readFileSync(file, "utf8").split(/\r?\n/).forEach((line, i) => {
        for (const [kind, re] of Object.entries(RULES)) {
          const found = line.match(re);
          if (found && !new RegExp(`dark:!?${kind}-`).test(line)) {
            hits.push(`${relative(process.cwd(), file)}:${i + 1}: ${[...new Set(found)].join(" ")}`);
          }
        }
      });
    }
    expect(hits).toEqual([]);
  });

  it("다크 모드 글자색을 진한 색(dark:text-slate-700~900)으로 두지 않는다", () => {
    // 회귀: 스윔레인 레인 이름이 dark:text-slate-800 이라 어두운 레인 배경에서 보이지 않았다
    const darkOnDark = /dark:text-(?:slate|gray|zinc|neutral)-(?:700|800|900)\b/g;
    const hits: string[] = [];
    for (const file of tsxFiles(DIR)) {
      readFileSync(file, "utf8").split(/\r?\n/).forEach((line, i) => {
        if (darkOnDark.test(line)) hits.push(`${relative(process.cwd(), file)}:${i + 1}`);
        darkOnDark.lastIndex = 0;
      });
    }
    expect(hits).toEqual([]);
  });
});
