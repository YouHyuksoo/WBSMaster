/**
 * @file CategoryTabs.tsx
 * @description 좌측 카테고리 탭 — 활성 컬러바 + 카운트 배지
 *
 * 초보자 가이드:
 * 1. **selected**: 현재 선택된 카테고리
 * 2. **활성 상태**: 좌측 마젠타 바 + bg-primary/5 + 좌측 그라데이션
 * 3. **배지**: 단계 0건이면 흐리게, 있으면 primary 컬러
 */
"use client";

import { Icon } from "@/components/ui";
import { STAGE_CATEGORY_LABEL, STAGE_CATEGORY_ORDER, type StageCategory } from "@/lib/stage-categories";
import type { ProgressStageDef } from "@/lib/api";

interface Props {
  selected: StageCategory;
  onSelect: (c: StageCategory) => void;
  allStages: ProgressStageDef[];
}

const CATEGORY_ICON: Record<StageCategory, string> = {
  MES_SYSTEM: "developer_board",
  EQUIPMENT: "precision_manufacturing",
  TERMINAL: "keyboard",
  MASTER_DATA: "database",
  ERP_IF: "swap_horiz",
  SLMS_IF: "sync_alt",
  CUT_OFF: "content_cut",
  OPERATION: "play_circle",
  INFRA: "dns",
  ETC: "more_horiz",
};

export function CategoryTabs({ selected, onSelect, allStages }: Props) {
  const counts = new Map<StageCategory, number>();
  for (const s of allStages) {
    counts.set(s.category as StageCategory, (counts.get(s.category as StageCategory) ?? 0) + 1);
  }

  return (
    <div className="w-[180px] shrink-0 overflow-y-auto border-r border-border bg-surface/40 p-2 dark:border-border-dark dark:bg-background-dark/40">
      <p className="px-2 pt-1 pb-2 text-[10px] font-bold uppercase tracking-wider text-text-secondary">
        Category
      </p>
      <nav className="space-y-1">
        {STAGE_CATEGORY_ORDER.map((c) => {
          const isSel = selected === c;
          const count = counts.get(c) ?? 0;
          const hasItems = count > 0;
          return (
            <button
              key={c}
              type="button"
              onClick={() => onSelect(c)}
              className={`group relative flex w-full items-center gap-2.5 overflow-hidden rounded-lg px-2.5 py-2 text-left text-xs transition-all ${
                isSel
                  ? "bg-gradient-to-r from-primary/15 to-primary/5 font-semibold text-primary shadow-sm"
                  : "text-text hover:bg-background-white dark:text-white dark:hover:bg-surface-dark/60"
              }`}
            >
              {isSel && <span className="absolute left-0 top-1.5 bottom-1.5 w-1 rounded-r-full bg-primary" />}
              <Icon
                name={CATEGORY_ICON[c]}
                size="xs"
                className={isSel ? "text-primary" : "text-text-secondary group-hover:text-primary"}
              />
              <span className="flex-1 truncate">{STAGE_CATEGORY_LABEL[c]}</span>
              <span
                className={`inline-flex h-5 min-w-[24px] items-center justify-center rounded-full px-1.5 text-[10px] font-bold tabular-nums ${
                  isSel
                    ? "bg-primary text-white"
                    : hasItems
                    ? "bg-primary/10 text-primary"
                    : "bg-surface text-text-secondary dark:bg-background-dark"
                }`}
              >
                {count}
              </span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}
