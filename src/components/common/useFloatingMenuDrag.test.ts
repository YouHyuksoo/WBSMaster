/**
 * @file src/components/common/useFloatingMenuDrag.test.ts
 * @description 이동 임계값·클릭 구분·저장·화면 경계 처리를 검증합니다.
 * 초보자 가이드: jsdom의 가상 화면과 저장소를 사용하며 실제 브라우저 설정은 바꾸지 않습니다.
 */
import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { useFloatingMenuDrag } from "./useFloatingMenuDrag";

const target = { setPointerCapture: vi.fn(), hasPointerCapture: () => true, releasePointerCapture: vi.fn() };
const pointer = (x: number, y: number, type = "pointermove") => ({ pointerId: 1, button: 0, isPrimary: true, clientX: x, clientY: y, type, currentTarget: target, preventDefault: vi.fn() }) as never;
beforeEach(() => { localStorage.clear(); vi.clearAllMocks(); vi.stubGlobal("innerWidth", 800); vi.stubGlobal("innerHeight", 600); });
afterEach(() => vi.unstubAllGlobals());

it("작은 움직임은 클릭으로 유지하고 드래그는 위치를 저장한 뒤 클릭을 막는다", () => {
  const onDrag = vi.fn();
  const { result } = renderHook(() => useFloatingMenuDrag(onDrag));
  act(() => { result.current.bind.onPointerDown(pointer(750, 550, "pointerdown")); result.current.bind.onPointerMove(pointer(752, 552)); });
  expect(onDrag).not.toHaveBeenCalled();
  act(() => result.current.bind.onPointerMove(pointer(100, 90)));
  expect(result.current.position).toEqual({ x: 70, y: 60 });
  expect(result.current.isDragging).toBe(true);
  act(() => result.current.bind.onPointerUp(pointer(100, 90, "pointerup")));
  expect(JSON.parse(localStorage.getItem("floating-menu-position")!)).toEqual({ x: 70, y: 60 });
  const click = { preventDefault: vi.fn(), stopPropagation: vi.fn() };
  act(() => result.current.bind.onClickCapture(click as never));
  expect(click.preventDefault).toHaveBeenCalledOnce();
  expect(onDrag).toHaveBeenCalledOnce();
});
it("저장 위치를 복원하고 화면 축소 시 밖으로 나가지 않게 보정한다", () => {
  localStorage.setItem("floating-menu-position", JSON.stringify({ x: 700, y: 500 }));
  const { result } = renderHook(() => useFloatingMenuDrag(vi.fn()));
  expect(result.current.position).toEqual({ x: 700, y: 500 });
  act(() => { window.innerWidth = 320; window.innerHeight = 240; window.dispatchEvent(new Event("resize")); });
  expect(result.current.position).toEqual({ x: 252, y: 172 });
});
it("잘못된 저장 값은 기본 위치로 두고 방향키 이동을 지원한다", () => {
  localStorage.setItem("floating-menu-position", '{"x":"bad","y":0}');
  const { result } = renderHook(() => useFloatingMenuDrag(vi.fn()));
  expect(result.current.position).toBeNull();
  act(() => result.current.bind.onKeyDown({ key: "ArrowLeft", preventDefault: vi.fn() } as never));
  expect(result.current.position).toEqual({ x: 704, y: 520 });
});
