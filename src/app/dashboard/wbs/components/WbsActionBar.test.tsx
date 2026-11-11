/**
 * @file src/app/dashboard/wbs/components/WbsActionBar.test.tsx
 * @description WBS 작업 버튼 줄: 선택 · 레벨에 따라 버튼이 켜지고 꺼지는 규칙, 같은 핸들러 호출, 간트 줌 줄과 높이가 같은지 검사합니다.
 * 초보자 가이드:
 * - 높이 규칙: 버튼 줄(h-8)이 간트 줌 줄(h-8)과 같아야 왼쪽 트리 행과 간트 행이 같은 높이에 놓인다
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { WbsItem } from "@/lib/api";
import { WbsActionBar, findWbsItem } from "./WbsActionBar";

const leaf = { id: "c", code: "1.1.1.1", name: "단위 작업", level: "LEVEL4", levelNumber: 4, children: [] } as unknown as WbsItem;
const tree = [{ id: "a", code: "1", name: "분석", level: "LEVEL1", levelNumber: 1, children: [{ id: "b", code: "1.1", name: "중", level: "LEVEL2", levelNumber: 2, children: [leaf] }] }] as unknown as WbsItem[];

const handlers = () => ({ onAddChild: vi.fn(), onEdit: vi.fn(), onDelete: vi.fn(), onLevelUp: vi.fn(), onLevelDown: vi.fn(), onRegisterTask: vi.fn() });
const disabled = (name: string) => (screen.getByRole("button", { name }) as HTMLButtonElement).disabled;

describe("WBS 작업 버튼 줄", () => {
  it("선택이 없으면 모든 버튼이 보이되 꺼져 있다", () => {
    render(<WbsActionBar item={null} {...handlers()} />);
    for (const name of ["하위 추가", "수정", "레벨 올리기", "레벨 내리기", "Task로 등록", "삭제"]) expect(disabled(name)).toBe(true);
    expect(screen.getByText("행을 선택하면 작업 버튼이 켜집니다")).toBeTruthy();
  });

  it("대분류: 하위(중분류) 추가 · 레벨 내리기 가능, 레벨 올리기 · Task 등록 불가", () => {
    const h = handlers();
    render(<WbsActionBar item={tree[0]} {...h} />);
    expect(disabled("레벨 올리기")).toBe(true);
    expect(disabled("Task로 등록")).toBe(true);
    fireEvent.click(screen.getByRole("button", { name: /추가$/ }));
    expect(h.onAddChild).toHaveBeenCalledWith("a", "LEVEL2");
  });

  it("단위업무: 하위 추가 · 레벨 내리기 불가, Task 등록 · 삭제는 같은 핸들러를 부른다", () => {
    const h = handlers();
    render(<WbsActionBar item={findWbsItem(tree, "c")} {...h} />);
    expect(disabled("하위 추가")).toBe(true);
    expect(disabled("레벨 내리기")).toBe(true);
    fireEvent.click(screen.getByRole("button", { name: "Task로 등록" }));
    fireEvent.click(screen.getByRole("button", { name: "삭제" }));
    expect(h.onRegisterTask).toHaveBeenCalledWith(leaf);
    expect(h.onDelete).toHaveBeenCalledWith("c");
  });

  it("버튼 줄 높이 = 간트 줌 줄 높이 (트리 행과 간트 행 정렬)", () => {
    const dir = join(process.cwd(), "src", "app", "dashboard", "wbs", "components");
    const bar = readFileSync(join(dir, "WbsActionBar.tsx"), "utf8").match(/role="toolbar"[^>]*className="[^"]*?(h-\d+)/)?.[1];
    const zoom = readFileSync(join(dir, "GanttChart.tsx"), "utf8").match(/줌 컨트롤[\s\S]*?className="(h-\d+)/)?.[1];
    expect(bar).toBe("h-8");
    expect(bar).toBe(zoom);
  });
});
