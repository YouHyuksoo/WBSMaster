/**
 * @file src/app/dashboard/stat-label-size.test.ts
 * @description 상단 통계 카드의 이름(숫자 바로 아래 줄)이 읽기 어려운 9·10px 로 작아지지 않았는지 소스를 읽어 검사합니다.
 *
 * 초보자 가이드:
 * - 회귀: 업무기능추적표 · 이슈 · 현업이슈 · 협의요청 등 통계 카드 이름이 text-[10px] 라 "글자가 너무 작다"는 신고가 나왔다.
 * - 규칙: 굵은 숫자 줄(text-lg/xl/2xl font-bold) 바로 다음 줄의 보조 글자(text-text-secondary)는 text-[9px] · text-[10px] 금지 → text-sm
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";

const DIR = join(process.cwd(), "src", "app", "dashboard");

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (name.endsWith(".tsx")) out.push(full);
  }
  return out;
}

describe("통계 카드 이름 글자 크기", () => {
  it("숫자 바로 아래 이름이 9·10px 가 아니다", () => {
    const bad = walk(DIR).flatMap((file) => {
      const lines = readFileSync(file, "utf8").split(/\r?\n/);
      return lines
        .map((l, i) => ({ l, i }))
        .filter(({ l, i }) => i > 0 && /text-\[(9|10)px\][^"]*text-text-secondary/.test(l) && /text-(lg|xl|2xl) font-bold/.test(lines[i - 1]))
        .map(({ i }) => `${relative(process.cwd(), file).replace(/\\/g, "/")}:${i + 1}`);
    });
    expect(bad, "통계 카드 이름은 text-sm 으로 쓴다").toEqual([]);
  });
});
