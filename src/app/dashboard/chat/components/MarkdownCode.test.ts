/**
 * @file src/app/dashboard/chat/components/MarkdownCode.test.ts
 * @description 마크다운 코드 표시(백틱 글자 · 진한 배경)가 되살아나지 않는지 소스로 검사합니다.
 * 초보자 가이드:
 * - 회귀(2026-11-23): 채팅 답의 출처(`WBS as_is_overview_items/…`)에 백틱이 글자로 보이고,
 *   진한 배경이 줄바꿈마다 끊겨 보였다. @tailwindcss/typography 가 code 앞뒤에 백틱을 붙이기 때문이다.
 * - 전역 규칙(globals.css)은 @layer 밖에 있어야 플러그인 규칙을 이긴다.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

// 주석 안의 중괄호가 깊이 계산을 흐리지 않게 주석을 지운다.
const css = readFileSync(join(process.cwd(), "src", "app", "globals.css"), "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
const chat = readFileSync(
  join(process.cwd(), "src", "app", "dashboard", "chat", "components", "ChatMessageItem.tsx"),
  "utf8",
);

/** 규칙 위치까지 열린 @layer 블록이 있는지 (중괄호 깊이로 판정) */
function insideLayer(source: string, index: number): boolean {
  const stack: boolean[] = [];
  const re = /@layer[^{;]*\{|\{|\}/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(source)) && m.index < index) {
    if (m[0] === "}") stack.pop();
    else stack.push(m[0].startsWith("@layer"));
  }
  return stack.some(Boolean);
}

describe("마크다운 코드 표시", () => {
  it("prose 안 code 의 앞뒤 백틱 글자를 @layer 밖 전역 규칙으로 지운다", () => {
    const rule = /\.prose code::before,\s*\.prose code::after\s*\{\s*content:\s*none;?\s*\}/;
    const found = rule.exec(css);
    expect(found).not.toBeNull();
    expect(insideLayer(css, found!.index)).toBe(false);
  });

  it("채팅 인라인 코드는 줄이 바뀌어도 칸마다 배경이 이어지고 진한 배경을 쓰지 않는다", () => {
    const inline = chat.match(/isInline \? \(\s*<code\s+className="([^"]+)"/);
    expect(inline).not.toBeNull();
    expect(inline![1]).toContain("box-decoration-clone");
    expect(inline![1]).not.toContain("bg-background-dark");
  });
});
