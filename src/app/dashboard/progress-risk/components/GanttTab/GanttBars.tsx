/**
 * @file src/app/dashboard/progress-risk/components/GanttTab/GanttBars.tsx
 * @description 한 행의 계획/실제/예측 막대
 *
 * 초보자 가이드:
 * 1. **계획 막대**: 낮은 채도의 파랑 — task.startDate ~ task.endDate
 * 2. **실제 막대**: 계획 막대 안쪽의 얇은 진행 표시
 * 3. **예측 막대**: 계획 대비 늘어난 구간만 연한 amber로 표시
 */

import type { ProgressTask } from "@/app/dashboard/progress-risk/types";
import type { Forecast } from "@/lib/progress-calc/types";
import type { TimeScale } from "./timeScale";

interface Props {
  task: ProgressTask;
  forecast: Forecast | undefined;
  timeScale: TimeScale;
  onCriticalPath: boolean;
}

export function GanttBars({ task, forecast, timeScale, onCriticalPath }: Props) {
  const plannedStart = new Date(task.startDate);
  const plannedEnd = new Date(task.endDate);
  const actualStart = task.actualStartDate ? new Date(task.actualStartDate) : null;
  const actualEnd = task.actualEndDate ? new Date(task.actualEndDate) : null;

  // 계획 막대
  const planLeft = `${timeScale.toRatio(plannedStart) * 100}%`;
  const planWidth = `${timeScale.widthRatio(plannedStart, plannedEnd) * 100}%`;

  // 실제 막대 (actualStart 있을 때만)
  let actualBar: { left: string; width: string; delayed: boolean } | null = null;
  if (actualStart) {
    const aEnd = actualEnd ?? new Date();
    const delayed = actualEnd ? actualEnd > plannedEnd : new Date() > plannedEnd;
    actualBar = {
      left: `${timeScale.toRatio(actualStart) * 100}%`,
      width: `${timeScale.widthRatio(actualStart, aEnd) * 100}%`,
      delayed,
    };
  }

  // 예측 막대 (actualEnd 없고 forecast가 계획과 다를 때)
  let forecastBar: { left: string; width: string } | null = null;
  if (!actualEnd && forecast) {
    const fEnd = forecast.forecastEnd;
    if (fEnd > plannedEnd || forecast.forecastStart > plannedStart) {
      forecastBar = {
        left: `${timeScale.toRatio(forecast.forecastStart) * 100}%`,
        width: `${timeScale.widthRatio(forecast.forecastStart, fEnd) * 100}%`,
      };
    }
  }

  return (
    <div className="relative h-8 overflow-hidden rounded-md bg-slate-100/70 ring-1 ring-border/50 dark:bg-background-dark/70 dark:ring-border-dark/60">
      {timeScale.ticks.map((t, i) => (
        <span
          key={i}
          className="absolute top-0 h-full border-l border-white/80 dark:border-white/10"
          style={{ left: `${t.ratio * 100}%` }}
        />
      ))}

      {/* 계획 막대 */}
      <div
        className={`absolute top-2 h-4 rounded border shadow-sm ${
          onCriticalPath
            ? "bg-sky-200 border-sky-400"
            : "bg-slate-200 border-slate-300 dark:bg-slate-700 dark:border-slate-600"
        }`}
        style={{ left: planLeft, width: planWidth }}
        title={`계획: ${task.startDate.slice(0, 10)} ~ ${task.endDate.slice(0, 10)}`}
      />

      {/* 실제 막대 */}
      {actualBar && (
        <div
          className={`absolute top-[15px] h-1.5 rounded-full shadow-sm ${
            actualBar.delayed ? "bg-rose-400" : "bg-emerald-500"
          }`}
          style={{ left: actualBar.left, width: actualBar.width }}
          title={`실제: ${actualStart?.toISOString().slice(0, 10)} ~ ${actualEnd?.toISOString().slice(0, 10) ?? "진행 중"}`}
        />
      )}

      {/* 예측 막대 */}
      {forecastBar && (
        <div
          className="absolute top-[5px] h-1.5 rounded-full bg-amber-300 shadow-sm"
          style={{ left: forecastBar.left, width: forecastBar.width }}
          title="예측 일정"
        />
      )}
    </div>
  );
}
