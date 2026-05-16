import { describe, expect, it } from "vitest";
import { getPageForTask, paginateList } from "./listPagination";

describe("paginateList", () => {
  it("요청 페이지에 해당하는 항목만 반환한다", () => {
    const items = Array.from({ length: 45 }, (_, index) => ({ id: `task-${index + 1}` }));

    const result = paginateList(items, 2, 20);

    expect(result.totalPages).toBe(3);
    expect(result.page).toBe(2);
    expect(result.items.map((item) => item.id)).toEqual(
      Array.from({ length: 20 }, (_, index) => `task-${index + 21}`)
    );
  });

  it("요청 페이지가 범위를 벗어나면 마지막 페이지로 보정한다", () => {
    const items = Array.from({ length: 21 }, (_, index) => ({ id: `task-${index + 1}` }));

    const result = paginateList(items, 99, 20);

    expect(result.totalPages).toBe(2);
    expect(result.page).toBe(2);
    expect(result.items.map((item) => item.id)).toEqual(["task-21"]);
  });
});

describe("getPageForTask", () => {
  it("대상 task가 속한 페이지 번호를 반환한다", () => {
    const items = Array.from({ length: 45 }, (_, index) => ({ id: `task-${index + 1}` }));

    expect(getPageForTask(items, "task-41", 20)).toBe(3);
  });
});
