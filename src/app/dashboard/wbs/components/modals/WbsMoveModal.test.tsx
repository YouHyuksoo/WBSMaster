/**
 * @file src/app/dashboard/wbs/components/modals/WbsMoveModal.test.tsx
 * @description WBS 이동 창: 위치를 고르기 전에는 옮기지 않고, 고른 상위 · 순서를 그대로 넘기며, 못 가는 곳은 이유와 함께 꺼지는지 검사합니다.
 * 초보자 가이드:
 * - 회귀: 올리기 · 내리기를 누르면 어디로 갈지 보이지 않은 채 바로 옮겨졌다 → 이제 위치만 미리 골라 둔다 (presetTarget)
 */
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { WbsItem } from "@/lib/api";
import { presetTarget } from "../../hooks/useWbsMove";
import { wbsPath, pathLabel } from "../../utils/wbsPath";
import { WbsMoveModal } from "./WbsMoveModal";

const w = (code: string, name: string, children: WbsItem[] = [], order = 0): WbsItem =>
  ({ id: code, code, name, order, level: `LEVEL${code.split(".").length}`, levelNumber: code.split(".").length, progress: 0, children,
    parentId: code.includes(".") ? code.slice(0, code.lastIndexOf(".")) : null }) as unknown as WbsItem;
const tree = [
  w("1", "분석", [w("1.1", "준비", [], 0), w("1.2", "환경", [w("1.2.1", "서버", [w("1.2.1.1", "계정")])], 1), w("1.3", "점검", [], 2)], 0),
  w("2", "연계", [w("2.1", "협의", [], 0)], 1),
];
const open = (id: string, kind: "free" | "up" | "down" = "free") => {
  const onSubmit = vi.fn();
  render(<WbsMoveModal items={tree} item={wbsPath(tree, id).at(-1)!} preset={presetTarget(tree, id, kind)} isSaving={false} onSubmit={onSubmit} onClose={vi.fn()} />);
  return { onSubmit, button: screen.getByRole("button", { name: /여기로 이동/ }) as HTMLButtonElement };
};
const radio = (name: RegExp) => screen.getByRole("radio", { name }) as HTMLInputElement;

describe("WBS 이동 창", () => {
  it("열면 지금 위치가 보이고, 제자리면 옮기기 버튼이 꺼져 있다", () => {
    const { button } = open("1.2");
    expect(screen.getByText("지금 위치: 1 분석")).toBeTruthy();
    expect(radio(/분석/).checked).toBe(true);
    expect(button.disabled).toBe(true);
  });

  it("고른 상위 항목 · 순서를 그대로 넘긴다", () => {
    const { onSubmit, button } = open("1.1");
    fireEvent.click(radio(/연계/));
    fireEvent.click(button);
    expect(onSubmit).toHaveBeenLastCalledWith({ parentId: "2", afterId: undefined });
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "__first" } });
    expect(screen.getByText(/번호가 바뀝니다: 2\.1 → 2\.2/)).toBeTruthy();
    fireEvent.click(button);
    expect(onSubmit).toHaveBeenLastCalledWith({ parentId: "2", afterId: null });
  });

  it("옮길 수 없는 곳은 이유와 함께 꺼진다", () => {
    open("1.2");
    expect(radio(/1\.2\.1 ?서버/).disabled).toBe(true);
    expect(radio(/협의/).disabled).toBe(true);
    expect(screen.getAllByText("옮기는 항목")).toHaveLength(2);
    expect(screen.getAllByText("4레벨 초과", { selector: '[title*="하위가 2단계 있어"] *' }).length).toBeGreaterThan(0);
  });

  it("올리기 · 내리기는 위치만 미리 고른다 (올리기 = 상위 바로 다음, 내리기 = 바로 앞 형제 맨 뒤)", () => {
    expect(presetTarget(tree, "1.2.1", "up")).toEqual({ parentId: "1", afterId: "1.2" });
    expect(presetTarget(tree, "1.2", "down")).toEqual({ parentId: "1.1" });
    expect(presetTarget(tree, "1.1", "down")).toEqual({ parentId: "1", afterId: null });
    const { onSubmit, button } = open("1.3", "down");
    expect(radio(/1\.2 ?환경/).checked).toBe(true);
    expect(onSubmit).not.toHaveBeenCalled();
    fireEvent.click(button);
    expect(onSubmit).toHaveBeenCalledWith({ parentId: "1.2", afterId: undefined });
  });

  it("찾기로 목록을 좁힌다", () => {
    open("1.1");
    fireEvent.change(screen.getByRole("searchbox"), { target: { value: "협의" } });
    expect(screen.getAllByRole("radio")).toHaveLength(1);
  });

  it("경로 글자", () => {
    expect(pathLabel(wbsPath(tree, "1.2.1"))).toBe("1 분석 › 1.2 환경 › 1.2.1 서버");
    expect(wbsPath(tree, "없음")).toEqual([]);
  });
});
