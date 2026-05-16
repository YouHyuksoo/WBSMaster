import { describe, expect, it } from "vitest";
import { getListDisplayItems } from "./listViewMode";

describe("getListDisplayItems", () => {
  it("페이지네이션 모드에서는 현재 페이지 항목만 반환한다", () => {
    const items = Array.from({ length: 30 }, (_, index) => ({ id: `task-${index + 1}` }));

    const result = getListDisplayItems(items, "pagination", 2, 20);

    expect(result.items.map((item) => item.id)).toEqual(
      Array.from({ length: 10 }, (_, index) => `task-${index + 21}`)
    );
    expect(result.showPagination).toBe(true);
  });

  it("스크롤 모드에서는 전체 항목을 반환하고 페이지네이션을 숨긴다", () => {
    const items = Array.from({ length: 30 }, (_, index) => ({ id: `task-${index + 1}` }));

    const result = getListDisplayItems(items, "scroll", 2, 20);

    expect(result.items).toHaveLength(30);
    expect(result.showPagination).toBe(false);
  });
});
