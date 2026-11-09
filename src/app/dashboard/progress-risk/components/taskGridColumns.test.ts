import { describe, expect, it } from "vitest";
import {
  buildGridTemplateColumns,
  DEFAULT_TASK_GRID_COLUMNS,
  deserializeColumnWidths,
  serializeColumnWidths,
} from "./taskGridColumns";

describe("taskGridColumns", () => {
  it("상태 컬럼은 목표일자 앞에 위치한다", () => {
    const ids = DEFAULT_TASK_GRID_COLUMNS.map((column) => column.id);

    expect(ids.indexOf("status")).toBeLessThan(ids.indexOf("targetDate"));
  });

  it("사업부 컬럼은 그리드에 없다", () => {
    const ids: string[] = DEFAULT_TASK_GRID_COLUMNS.map((column) => column.id);

    expect(ids).not.toContain("businessUnit");
    expect(DEFAULT_TASK_GRID_COLUMNS.some((column) => column.label === "사업부")).toBe(false);
  });

  it("수정/삭제 컬럼은 그리드 맨 앞에 위치한다", () => {
    expect(DEFAULT_TASK_GRID_COLUMNS[0]?.id).toBe("actions");
    expect(DEFAULT_TASK_GRID_COLUMNS[0]?.width).toBeGreaterThanOrEqual(72);
  });

  it("컬럼 폭으로 grid template을 만든다", () => {
    const template = buildGridTemplateColumns(
      DEFAULT_TASK_GRID_COLUMNS,
      new Map([
        ["majorCategory", 125],
        ["name", 260],
      ])
    );

    expect(template).toContain("125px");
    expect(template).toContain("260px");
  });

  it("컬럼 폭 저장값을 직렬화하고 유효한 값만 복원한다", () => {
    const serialized = serializeColumnWidths(new Map([
      ["majorCategory", 120],
      ["name", 260],
    ]));

    expect(serialized).toBe(JSON.stringify({ majorCategory: 120, name: 260 }));

    const restored = deserializeColumnWidths(
      JSON.stringify({ majorCategory: 130, name: 80, unknown: 999, status: "wide" }),
      DEFAULT_TASK_GRID_COLUMNS
    );

    expect(restored.get("majorCategory")).toBe(130);
    expect(restored.has("name")).toBe(false);
    expect(restored.has("status")).toBe(false);
  });

  it("예전에 저장된 사업부 컬럼 폭은 무시하고 나머지 폭만 복원한다", () => {
    const restored = deserializeColumnWidths(
      JSON.stringify({ businessUnit: 130, name: 300 }),
      DEFAULT_TASK_GRID_COLUMNS
    );

    expect([...restored.keys()]).toEqual(["name"]);
    expect(restored.get("name")).toBe(300);
  });
});
