/**
 * @file CategoryTabs.tsx
 * @description 좌측 카테고리 탭 — 각 옆에 단계 개수 표시
 *
 * 초보자 가이드:
 * 1. **selected**: 현재 선택된 카테고리
 * 2. **onSelect**: 탭 클릭 콜백
 * 3. **allStages**: 모든 카테고리의 단계 목록 (개수 표시용)
 */
"use client";

import { STAGE_CATEGORY_LABEL, STAGE_CATEGORY_ORDER, type StageCategory } from "@/lib/stage-categories";
import type { ProgressStageDef } from "@/lib/api";

interface Props {
  selected: StageCategory;
  onSelect: (c: StageCategory) => void;
  allStages: ProgressStageDef[];
}

export function CategoryTabs({ selected, onSelect, allStages }: Props) {
  const counts = new Map<StageCategory, number>();
  for (const s of allStages) {
    counts.set(s.category as StageCategory, (counts.get(s.category as StageCategory) ?? 0) + 1);
  }

  return (
    <div className="w-40 border-r border-border dark:border-border-dark overflow-y-auto shrink-0">
      {STAGE_CATEGORY_ORDER.map((c) => {
        const isSel = selected === c;
        const count = counts.get(c) ?? 0;
        return (
          <button
            key={c}
            type="button"
            onClick={() => onSelect(c)}
            className={`w-full flex items-center justify-between px-3 py-2 text-sm border-b border-border dark:border-border-dark transition-colors ${
              isSel
                ? "bg-primary/10 text-primary font-medium"
                : "hover:bg-surface/50 dark:hover:bg-surface-dark/50 text-text dark:text-white"
            }`}
          >
            <span>{STAGE_CATEGORY_LABEL[c]}</span>
            <span className="text-xs text-text-secondary">{count}</span>
          </button>
        );
      })}
    </div>
  );
}
