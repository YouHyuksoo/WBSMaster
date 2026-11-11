/**
 * @file src/app/dashboard/wbs/hooks/useScrollSync.test.ts
 * @description WBS 트리 · 간트 세로 스크롤 맞추기 규칙과 선택 행 가운데 정렬 계산을 검사합니다.
 * 초보자 가이드:
 * - 회귀(2026-11-11): 행이 많아지자 트리만 스크롤되고 간트는 그대로라 행이 어긋났다
 */
import { describe, expect, it } from "vitest";
import { centerScrollTop, syncScrollTop } from "./useScrollSync";

const box = (scrollTop: number, top = 0, clientHeight = 400) =>
  ({ scrollTop, clientHeight, getBoundingClientRect: () => ({ top, height: clientHeight }) }) as unknown as HTMLElement;

describe("트리 · 간트 세로 스크롤", () => {
  it("한쪽 scrollTop 을 다른 쪽에 그대로 맞추고, 이미 같으면 건드리지 않는다", () => {
    const tree = box(520);
    const gantt = box(0);
    expect(syncScrollTop(tree, gantt)).toBe(520);
    expect(gantt.scrollTop).toBe(520);
    expect(syncScrollTop(gantt, tree)).toBeNull();
  });

  it("선택 행은 컨테이너 가운데로 (화면 좌표 기준, 위로 넘치면 0)", () => {
    const container = box(200, 100, 400);
    const row = { getBoundingClientRect: () => ({ top: 700, height: 40 }) } as unknown as HTMLElement;
    expect(centerScrollTop(container, row)).toBe(200 + (700 - 100) - 200 + 20);
    const nearTop = { getBoundingClientRect: () => ({ top: 110, height: 40 }) } as unknown as HTMLElement;
    expect(centerScrollTop(box(0, 100, 400), nearTop)).toBe(0);
  });
});
