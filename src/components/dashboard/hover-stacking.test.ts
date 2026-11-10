/**
 * @file src/components/dashboard/hover-stacking.test.ts
 * @description 넘침 표시(overflow-visible) 영역에 마우스를 올렸을 때 새 쌓임 맥락(stacking context)을 만드는 효과가 없는지 소스를 읽어 검사합니다.
 *
 * 초보자 가이드:
 * - 회귀: 마일스톤 타임라인 행이 hover:brightness-95 였다. filter 는 새 쌓임 맥락을 만들어,
 *   행 밖으로 넘친 핀포인트 설명 상자(z-40)가 아래 행 뒤로 숨는다 → 마우스가 아래 행으로 넘어가 hover 해제
 *   → 상자가 다시 위로 → 다시 hover … 가 반복돼 화면이 계속 깜빡였다.
 * - 규칙: overflow-visible 인 요소에는 hover:/group-hover: 로 filter(brightness·blur·drop-shadow 등)·transform(scale·rotate·translate)·opacity 를 걸지 않는다.
 *   눈에 보이는 hover 표시가 필요하면 안쪽 그림자(shadow-[inset_...])나 배경색을 쓴다.
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";

const SRC = join(process.cwd(), "src");
const STACKING_HOVER =
  /(?:^|\s|["'`])(?:dark:)?(?:group-)?hover:(?:brightness|contrast|saturate|grayscale|invert|sepia|hue-rotate|blur|drop-shadow|backdrop-|scale|rotate|-?translate|skew|transform|opacity)/;

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (name.endsWith(".tsx")) out.push(full);
  }
  return out;
}

describe("넘침 영역 hover 쌓임 맥락", () => {
  it("overflow-visible 요소에 쌓임 맥락을 만드는 hover 효과가 없다", () => {
    const bad = walk(SRC).flatMap((file) =>
      readFileSync(file, "utf8")
        .split(/\r?\n/)
        .map((l, i) => ({ l, i }))
        .filter(({ l }) => l.includes("overflow-visible") && STACKING_HOVER.test(l))
        .map(({ i }) => `${relative(process.cwd(), file).replace(/\\/g, "/")}:${i + 1}`),
    );
    expect(bad, "넘친 자식이 다른 요소 뒤로 숨어 hover 가 깜빡인다").toEqual([]);
  });
});
