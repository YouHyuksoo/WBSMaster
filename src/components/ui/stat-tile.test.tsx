/**
 * @file src/components/ui/stat-tile.test.tsx
 * @description 정보카드(통계 카드)가 공용 StatTile 한 줄(36px)로만 만들어지는지 검사합니다.
 *
 * 초보자 가이드:
 * - 회귀: 화면마다 "아이콘 상자 + 큰 숫자 + 아래 이름" 두 줄 카드를 복사해 만들어, 높이가 크다는 지적이 여러 화면에서 반복됐다
 * - 규칙 1: StatTile 높이는 h-9(36px), 값 글자는 text-base, 이름은 text-sm
 * - 규칙 2: 대시보드 화면에서 큰 숫자 줄과 이름 줄을 위아래로 쌓은 카드를 직접 만들지 않는다 → StatStrip · StatTile
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { StatStrip, StatTile } from "./StatTile";

const DIR = join(process.cwd(), "src", "app", "dashboard");

/** 직접 만들어도 되는 곳 (파일: 이유) */
const ALLOWED: Record<string, string> = {
  "src/app/dashboard/components/WbsScheduleOverviewSection.tsx": "대시보드 WBS 현황 칸 (DESIGN.md 의 낮은 높이 규칙을 따로 따른다, 정보카드 줄이 아님)",
  "src/app/dashboard/chat/components/ChartRenderer.tsx": "채팅 답변 안의 차트 값 표시",
  "src/app/dashboard/holidays/components/WeeklyCalendar.tsx": "달력의 날짜 숫자와 요일",
  "src/app/dashboard/progress-risk/components/DiagnosisTab/index.tsx": "진단 결론 문장 배너 (숫자 카드가 아님)",
};

const BIG = String.raw`<(?:p|span|div) className=(?:"[^"]*|\{\`[^\`]*)text-(?:lg|xl|2xl|3xl) font-bold[^>]*>`;
const SMALL = String.raw`<(?:p|span|div) className="[^"]*text-(?:\[\d+px\]|xs|sm)[^"]*(?:text-text-secondary|text-muted-foreground|font-semibold|font-medium)[^"]*">`;
const CLOSE = String.raw`</(?:p|span|div)>\s*`;
const STACKED = [new RegExp(`${BIG}\\s*\\{[^<]*${CLOSE}${SMALL}`), new RegExp(`${SMALL}[^<]*${CLOSE}${BIG}\\s*\\{`)];

/** 큰 숫자({값}) 줄과 작은 이름 줄을 위아래로 쌓은 카드가 있는가 */
export const hasStackedCard = (src: string): boolean => STACKED.some((re) => re.test(src));

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (name.endsWith(".tsx") && !name.endsWith(".test.tsx")) out.push(full);
  }
  return out;
}

describe("정보카드", () => {
  it("한 줄 높이 36px 로 이름과 값을 보여 준다", () => {
    const { container } = render(<StatStrip><StatTile icon="list_alt" label="전체" value={4} /></StatStrip>);
    const tile = container.querySelector('[role="group"] > div')!;
    expect(tile.className.split(" ")).toContain("h-9");
    expect(tile.className).not.toMatch(/(^| )p-\d|py-\d|flex-col/);
    expect(screen.getByText("4").className).toContain("text-base");
    expect(screen.getByText("전체").className).toContain("text-sm");
  });

  it("비율은 같은 높이에 진행 막대로, 값 여러 개는 한 줄에 나란히", () => {
    const { container } = render(<StatStrip><StatTile icon="speed" label="완료율" rate={40} /><StatTile icon="warning" label="긴급" items={[{ label: "건수", value: 3 }, { label: "해결", value: 1 }]} /></StatStrip>);
    expect(screen.getByText("40%")).toBeTruthy();
    expect(screen.getByRole("progressbar").getAttribute("aria-valuenow")).toBe("40");
    for (const tile of container.querySelectorAll('[role="group"] > div')) expect(tile.className.split(" ")).toContain("h-9");
  });

  it("고치기 전 두 줄 카드를 잡아낸다 (검사가 실제로 막는지)", () => {
    expect(hasStackedCard('<p className="text-xl font-bold text-text dark:text-white">{stats.total}</p>\n  <p className="text-sm text-text-secondary">전체</p>')).toBe(true);
    expect(hasStackedCard('<p className="text-xs text-muted-foreground">작성 중</p>\n <p className="text-2xl font-bold text-amber-500">{n}</p>')).toBe(true);
    expect(hasStackedCard('<h2 className="text-lg font-bold">제목</h2><p className="text-sm text-text-secondary">설명</p>')).toBe(false);
  });

  it("대시보드 화면은 두 줄 정보카드를 직접 만들지 않는다", () => {
    const bad = walk(DIR)
      .map((f) => relative(process.cwd(), f).replace(/\\/g, "/"))
      .filter((f) => !ALLOWED[f] && hasStackedCard(readFileSync(join(process.cwd(), f), "utf8")));
    expect(bad, "정보카드는 @/components/ui 의 StatStrip · StatTile 을 쓴다 (높이 36px 한 줄)").toEqual([]);
  });
});
