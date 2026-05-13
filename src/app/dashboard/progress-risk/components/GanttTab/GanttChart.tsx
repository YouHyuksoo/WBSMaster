/**
 * @file src/app/dashboard/progress-risk/components/GanttTab/GanttChart.tsx
 * @description Gantt 차트 컨테이너 — 시간축 + 행 목록 (GanttRow 컴포넌트)
 *
 * 초보자 가이드:
 * 1. **헤더**: 시간축 눈금 표시
 * 2. **행**: GanttRow 컴포넌트 — 각 task별 index + name + mini-stepper + 막대
 * 3. **그리드 레이아웃**: 고정 너비(36px, 1fr, 130px) + 스크롤 가능한 타임라인
 * 4. **Critical Path**: 옵션 Set으로 받아서 GanttRow에 전달
 */
"use client";

import type { Forecast } from "@/lib/progress-calc/types";
import type { TimeScale } from "./timeScale";
import type { ProgressTask } from "@/app/dashboard/progress-risk/types";
import { GanttRow } from "./GanttRow";

interface Props {
  tasks: ProgressTask[];
  forecast: Map<string, Forecast>;
  timeScale: TimeScale;
  criticalPathIds?: Set<string>;
}

const GRID_COLS = "36px 1fr 130px 1fr";

export function GanttChart({ tasks, forecast, timeScale, criticalPathIds }: Props) {
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

      {/* 행 목록 */}
      {tasks.map((task, idx) => (
        <GanttRow
          key={task.id}
          index={idx + 1}
          task={task}
          forecast={forecast.get(task.id)}
          timeScale={timeScale}
          onCriticalPath={criticalPathIds?.has(task.id) ?? false}
          gridCols={GRID_COLS}
        />
      ))}
    </div>
  );
}
