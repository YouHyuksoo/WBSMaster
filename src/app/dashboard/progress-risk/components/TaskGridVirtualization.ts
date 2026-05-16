export interface VirtualTaskRangeInput {
  totalItems: number;
  scrollTop: number;
  viewportHeight: number;
  rowHeight: number;
  overscan: number;
}

export interface VirtualTaskRange {
  start: number;
  end: number;
  topPadding: number;
  bottomPadding: number;
}

export function getVirtualTaskRange({
  totalItems,
  scrollTop,
  viewportHeight,
  rowHeight,
  overscan,
}: VirtualTaskRangeInput): VirtualTaskRange {
  if (totalItems <= 0) {
    return { start: 0, end: 0, topPadding: 0, bottomPadding: 0 };
  }

  const firstVisible = Math.floor(scrollTop / rowHeight);
  const visibleCount = Math.ceil(viewportHeight / rowHeight);
  const start = Math.max(0, firstVisible - overscan);
  const end = Math.min(totalItems, firstVisible + visibleCount + overscan);

  return {
    start,
    end,
    topPadding: start * rowHeight,
    bottomPadding: Math.max(0, (totalItems - end) * rowHeight),
  };
}
