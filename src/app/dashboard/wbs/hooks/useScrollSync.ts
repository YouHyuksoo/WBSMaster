/**
 * @file src/app/dashboard/wbs/hooks/useScrollSync.ts
 * @description
 * 선택된 항목으로 트리/간트 양방향 스크롤을 관리하는 커스텀 훅입니다.
 *
 * 초보자 가이드:
 * 1. **treeListRef**: 좌측 트리 목록 스크롤 영역
 * 2. **ganttScrollRef**: 우측 간트 차트 스크롤 영역
 * 3. 항목 선택 시 양쪽 모두 해당 위치로 스크롤
 */

"use client";

import { useRef, useEffect } from "react";

export function useScrollSync(selectedItemId: string | null) {
  const treeListRef = useRef<HTMLDivElement>(null);
  const ganttScrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!selectedItemId) return;

    const timeoutId = setTimeout(() => {
      // 1. 트리 목록에서 해당 항목으로 스크롤
      if (treeListRef.current) {
        const treeElement = treeListRef.current.querySelector(`[data-wbs-id="${selectedItemId}"]`) as HTMLElement;
        if (treeElement) {
          const container = treeListRef.current;
          const elementTop = treeElement.offsetTop;
          const elementHeight = treeElement.offsetHeight;
          const containerHeight = container.clientHeight;

          const targetScrollTop = elementTop - (containerHeight / 2) + (elementHeight / 2);
          container.scrollTo({
            top: Math.max(0, targetScrollTop),
            behavior: "smooth",
          });
        }
      }

      // 2. 간트 차트에서 해당 항목으로 스크롤
      if (ganttScrollRef.current) {
        const ganttRow = ganttScrollRef.current.querySelector(`[data-gantt-id="${selectedItemId}"]`) as HTMLElement;
        if (ganttRow) {
          const container = ganttScrollRef.current;

          const rowTop = ganttRow.offsetTop;
          const rowHeight = ganttRow.offsetHeight;
          const containerHeight = container.clientHeight;
          const targetScrollTop = rowTop - (containerHeight / 2) + (rowHeight / 2);

          container.scrollTo({
            top: Math.max(0, targetScrollTop),
            behavior: "smooth",
          });

          const ganttBar = ganttRow.querySelector("[data-gantt-bar]") as HTMLElement;
          if (ganttBar) {
            const barLeft = parseInt(ganttBar.style.left || "0", 10);
            const barWidth = parseInt(ganttBar.style.width || "0", 10);
            const containerWidth = container.clientWidth;

            const barCenter = barLeft + barWidth / 2;
            const targetScrollLeft = barCenter - containerWidth / 2;

            container.scrollTo({
              left: Math.max(0, targetScrollLeft),
              top: Math.max(0, targetScrollTop),
              behavior: "smooth",
            });
          }
        }
      }
    }, 100);

    return () => clearTimeout(timeoutId);
  }, [selectedItemId]);

  return { treeListRef, ganttScrollRef };
}
