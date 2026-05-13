/**
 * @file src/app/dashboard/progress-risk/components/GanttTab/GanttChart.tsx
 * @description Gantt 차트 컨테이너 — 시간축 + 행 (막대는 Task 3에서)
 *
 * 초보자 가이드:
 * 1. **헤더**: 시간축 눈금 표시
 * 2. **행**: 각 task별 row (status + name + stage + 막대 영역)
 * 3. **막대 영역**: Task 3에서 실제 bars로 교체 예정
 * 4. **그리드 레이아웃**: 고정 너비(36px, 1fr, 130px) + 스크롤 가능한 타임라인
 */
"use client";

import type { Forecast } from "@/lib/progress-calc/types";
import type { TimeScale } from "./timeScale";
import type { ProgressTask } from "@/app/dashboard/progress-risk/types";

interface Props {
  tasks: ProgressTask[];
  forecast: Map<string, Forecast>;
  timeScale: TimeScale;
}

const GRID_COLS = "36px 1fr 130px 1fr";

export function GanttChart({ tasks, timeScale }: Props) {
  return (
    <div className="bg-background-white dark:bg-surface-dark border border-border dark:border-border-dark rounded-xl p-4 overflow-x-auto">
      {/* 헤더: 시간축 눈금 */}
      <div className="grid gap-2 text-xs text-text-secondary mb-2" style={{ gridTemplateColumns: GRID_COLS }}>
        <div></div>
        <div className="font-semibold uppercase">기능</div>
        <div className="font-semibold uppercase">단계</div>
        <div className="relative h-5">
          {timeScale.ticks.map((t, i) => (
            <span
              key={i}
              className="absolute -translate-x-1/2 text-[10px]"
              style={{ left: `${t.ratio * 100}%` }}
            >
              {t.label}
            </span>
          ))}
        </div>
      </div>

      {/* 행 placeholder */}
      {tasks.map((task, idx) => (
        <div
          key={task.id}
          className="grid gap-2 py-1.5 border-b border-border/30 dark:border-border-dark/30 text-xs items-center"
          style={{ gridTemplateColumns: GRID_COLS }}
        >
          <div className="text-text-secondary">{idx + 1}</div>
          <div className="text-text dark:text-white truncate" title={`${task.code} ${task.name}`}>
            <span className="text-text-secondary text-[10px] mr-1">{task.code}</span>
            {task.name}
          </div>
          <div className="text-text-secondary">—</div>
          <div className="relative h-5 bg-white/3 rounded">
            <div className="absolute inset-0 flex items-center justify-center text-[9px] text-text-secondary opacity-30">
              bars in Task 3
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
