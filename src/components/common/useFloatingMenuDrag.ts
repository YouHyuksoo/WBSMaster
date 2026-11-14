/**
 * @file src/components/common/useFloatingMenuDrag.ts
 * @description 플로팅 메뉴의 포인터 이동·화면 경계·위치 기억을 처리합니다.
 * 초보자 가이드:
 * - 6px 이상 움직여야 드래그로 판단해 일반 클릭을 유지합니다.
 * - 저장소를 사용할 수 없어도 이동하며 화면 크기 변경 시 위치를 보정합니다.
 */
"use client";

import { useEffect, useRef, useState, type PointerEvent, type MouseEvent, type KeyboardEvent } from "react";

const POSITION_KEY = "floating-menu-position";
const SIZE = 56;
const MARGIN = 12;
type Point = { x: number; y: number };

function clamp(point: Point): Point {
  return {
    x: Math.max(MARGIN, Math.min(point.x, window.innerWidth - SIZE - MARGIN)),
    y: Math.max(MARGIN, Math.min(point.y, window.innerHeight - SIZE - MARGIN)),
  };
}
function save(point: Point) {
  try { localStorage.setItem(POSITION_KEY, JSON.stringify(point)); } catch { /* 이동은 유지 */ }
}

export function useFloatingMenuDrag(onDragStart: () => void) {
  const [position, setPosition] = useState<Point | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [viewport, setViewport] = useState({ width: 0, height: 0 });
  const current = useRef<Point | null>(null);
  const gesture = useRef<{ pointer: number; origin: Point; start: Point; moved: boolean } | null>(null);
  const suppressClick = useRef(false);

  useEffect(() => {
    let stored: Point | null = null;
    try {
      const value = JSON.parse(localStorage.getItem(POSITION_KEY) || "null");
      if (value && Number.isFinite(value.x) && Number.isFinite(value.y)) stored = clamp(value);
    } catch { /* 기본 위치 유지 */ }
    current.current = stored;
    setPosition(stored);
    function resize() {
      setViewport({ width: window.innerWidth, height: window.innerHeight });
      if (current.current) {
        const next = clamp(current.current);
        current.current = next;
        setPosition(next);
        save(next);
      }
    }
    resize();
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, []);

  function move(next: Point) {
    const point = clamp(next);
    current.current = point;
    setPosition(point);
    return point;
  }
  const origin = () => current.current ?? { x: window.innerWidth - SIZE - 24, y: window.innerHeight - SIZE - 24 };

  function onPointerDown(event: PointerEvent<HTMLButtonElement>) {
    if (event.button !== 0 || event.isPrimary === false) return;
    suppressClick.current = false;
    gesture.current = { pointer: event.pointerId, origin: origin(), start: { x: event.clientX, y: event.clientY }, moved: false };
    event.currentTarget.setPointerCapture?.(event.pointerId);
  }
  function onPointerMove(event: PointerEvent<HTMLButtonElement>) {
    const drag = gesture.current;
    if (!drag || drag.pointer !== event.pointerId) return;
    const dx = event.clientX - drag.start.x;
    const dy = event.clientY - drag.start.y;
    if (!drag.moved && Math.hypot(dx, dy) < 6) return;
    if (!drag.moved) { drag.moved = true; setIsDragging(true); onDragStart(); }
    event.preventDefault();
    move({ x: drag.origin.x + dx, y: drag.origin.y + dy });
  }
  function end(event: PointerEvent<HTMLButtonElement>) {
    const drag = gesture.current;
    if (!drag || drag.pointer !== event.pointerId) return;
    suppressClick.current = drag.moved && event.type === "pointerup";
    gesture.current = null;
    setIsDragging(false);
    if (drag.moved && current.current) save(current.current);
    if (event.currentTarget.hasPointerCapture?.(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
  }
  function onClickCapture(event: MouseEvent<HTMLButtonElement>) {
    if (!suppressClick.current) return;
    suppressClick.current = false;
    event.preventDefault();
    event.stopPropagation();
  }
  function onKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    const directions: Record<string, Point> = { ArrowLeft: { x: -16, y: 0 }, ArrowRight: { x: 16, y: 0 }, ArrowUp: { x: 0, y: -16 }, ArrowDown: { x: 0, y: 16 } };
    const delta = directions[event.key];
    if (!delta) return;
    event.preventDefault();
    const point = origin();
    save(move({ x: point.x + delta.x, y: point.y + delta.y }));
    onDragStart();
  }

  return {
    position, isDragging, viewport,
    style: position ? { left: position.x, top: position.y } : { right: 24, bottom: 24 },
    bind: { onPointerDown, onPointerMove, onPointerUp: end, onPointerCancel: end, onLostPointerCapture: end, onClickCapture, onKeyDown },
  };
}
