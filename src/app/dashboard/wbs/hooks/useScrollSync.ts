/**
 * @file src/app/dashboard/wbs/hooks/useScrollSync.ts
 * @description
 * 좌측 트리와 우측 간트의 세로 스크롤을 항상 같게 맞추고, 항목을 선택하면 그 행으로 스크롤하는 커스텀 훅입니다.
 *
 * 초보자 가이드:
 * 1. **treeListRef**: 좌측 트리 목록 스크롤 영역, **ganttScrollRef**: 우측 간트 스크롤 영역
 * 2. 행 높이(h-10)와 머리 높이(트리 머리 h-9 = 간트 날짜 머리 h-9)가 같으므로 scrollTop 이 같으면 행이 같은 높이에 놓인다
 *    → 한쪽을 스크롤하면 다른 쪽 scrollTop 을 같은 값으로 맞춘다 (syncScrollTop)
 * 3. 항목 선택: 트리에서 그 행을 가운데로 스크롤하면 간트는 2번 규칙으로 따라온다. 간트는 막대가 보이도록 가로만 맞춘다
 * 4. 회귀(2026-11-11): 단위업무를 넣어 행이 278개가 되자 트리만 스크롤되고 간트는 그대로라 행이 어긋났다
 *    (예전에는 선택 때만 양쪽을 각자 offsetTop 으로 옮겼고, offsetTop 기준 요소가 달라 위치도 달랐다)
 */

"use client";

import { useRef, useEffect } from "react";

/** from 의 scrollTop 을 to 에 맞춘다. 맞춘 값을 돌려주어, to 의 scroll 이벤트가 되돌려 맞추지 않게 한다 */
export function syncScrollTop(from: HTMLElement, to: HTMLElement): number | null {
  if (Math.abs(to.scrollTop - from.scrollTop) < 1) return null;
  to.scrollTop = from.scrollTop;
  return to.scrollTop;
}

/** 컨테이너 안에서 행을 가운데로 보내는 scrollTop (offsetParent 와 관계없이 화면 좌표로 계산) */
export function centerScrollTop(container: HTMLElement, row: HTMLElement): number {
  const c = container.getBoundingClientRect();
  const r = row.getBoundingClientRect();
  return Math.max(0, container.scrollTop + (r.top - c.top) - container.clientHeight / 2 + r.height / 2);
}

export function useScrollSync(selectedItemId: string | null) {
  const treeListRef = useRef<HTMLDivElement>(null);
  const ganttScrollRef = useRef<HTMLDivElement>(null);

  // 세로 스크롤 맞추기: 트리 · 간트가 그려지거나 바뀔 때마다(뷰 전환 · 데이터 로딩) 다시 연결한다
  useEffect(() => {
    const tree = treeListRef.current;
    const gantt = ganttScrollRef.current;
    if (!tree || !gantt) return;
    const expected = new Map<HTMLElement, number>();
    const follow = (from: HTMLElement, to: HTMLElement) => () => {
      const mine = expected.get(from);
      if (mine !== undefined && Math.abs(from.scrollTop - mine) < 1) {
        expected.delete(from); // 상대가 맞춰 준 스크롤이면 되돌리지 않는다
        return;
      }
      const set = syncScrollTop(from, to);
      if (set !== null) expected.set(to, set);
    };
    const onTree = follow(tree, gantt);
    const onGantt = follow(gantt, tree);
    tree.addEventListener("scroll", onTree, { passive: true });
    gantt.addEventListener("scroll", onGantt, { passive: true });
    syncScrollTop(tree, gantt);
    return () => {
      tree.removeEventListener("scroll", onTree);
      gantt.removeEventListener("scroll", onGantt);
    };
  });

  // 선택한 항목으로 이동
  useEffect(() => {
    if (!selectedItemId) return;
    const timeoutId = setTimeout(() => {
      const tree = treeListRef.current;
      const row = tree?.querySelector(`[data-wbs-id="${selectedItemId}"]`) as HTMLElement | null;
      if (tree && row) tree.scrollTo({ top: centerScrollTop(tree, row), behavior: "smooth" });

      const gantt = ganttScrollRef.current;
      const bar = gantt?.querySelector(`[data-gantt-id="${selectedItemId}"] [data-gantt-bar]`) as HTMLElement | null;
      if (gantt && bar) {
        const left = parseInt(bar.style.left || "0", 10);
        const width = parseInt(bar.style.width || "0", 10);
        gantt.scrollTo({ left: Math.max(0, left + width / 2 - gantt.clientWidth / 2), behavior: "smooth" });
      }
    }, 100);
    return () => clearTimeout(timeoutId);
  }, [selectedItemId]);

  return { treeListRef, ganttScrollRef };
}
