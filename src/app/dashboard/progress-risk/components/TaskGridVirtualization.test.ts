import { describe, expect, it } from "vitest";
import { getVirtualTaskRange } from "./TaskGridVirtualization";

describe("getVirtualTaskRange", () => {
  it("스크롤 위치에 맞는 행 범위만 반환하고 overscan을 적용한다", () => {
    const range = getVirtualTaskRange({
      totalItems: 1625,
      scrollTop: 900,
      viewportHeight: 450,
      rowHeight: 45,
      overscan: 5,
    });

    expect(range).toEqual({
      start: 15,
      end: 35,
      topPadding: 675,
      bottomPadding: 71550,
    });
  });
});
