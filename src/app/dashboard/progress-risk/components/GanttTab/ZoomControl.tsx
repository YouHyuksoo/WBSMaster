/**
 * @file src/app/dashboard/progress-risk/components/GanttTab/ZoomControl.tsx
 * @description Gantt zoom 토글 (일/주/월/분기)
 *
 * 초보자 가이드:
 * 1. **Props**: value (현재 zoom 레벨) + onChange (콜백)
 * 2. **OPTIONS**: 4개 zoom 레벨 (day/week/month/quarter) 매핑
 * 3. **active 상태**: value와 일치하는 버튼 활성화 (스타일)
 * 4. **버튼 그룹**: flex gap-1로 배열, 각 버튼은 border + 전환 효과
 */
"use client";

import type { ZoomLevel } from "./timeScale";

interface Props {
  value: ZoomLevel;
  onChange: (zoom: ZoomLevel) => void;
}

const OPTIONS: { key: ZoomLevel; label: string }[] = [
  { key: "day", label: "일" },
  { key: "week", label: "주" },
  { key: "month", label: "월" },
  { key: "quarter", label: "분기" },
];

export function ZoomControl({ value, onChange }: Props) {
  return (
    <div className="flex gap-1 text-xs">
      {OPTIONS.map(opt => {
        const active = opt.key === value;
        return (
          <button
            key={opt.key}
            onClick={() => onChange(opt.key)}
            className={`px-2.5 py-1 rounded border transition-colors ${
              active
                ? "bg-primary/15 border-primary/40 text-primary"
                : "bg-white/5 dark:bg-white/5 border-white/10 text-text-secondary hover:bg-white/10 dark:hover:bg-white/10"
            }`}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
