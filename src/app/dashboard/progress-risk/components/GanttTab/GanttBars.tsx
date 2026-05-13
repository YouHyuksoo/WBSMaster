/**
 * @file src/app/dashboard/progress-risk/components/GanttTab/GanttBars.tsx
 * @description 한 행의 3종 막대 (계획/실제/예측) + Critical Path 발광
 *
 * 초보자 가이드:
 * 1. **계획 막대**: 파랑(blue-500/40) — task.startDate ~ task.endDate
 * 2. **실제 막대**: 초록(success) 또는 빨강(error) — actualStart ~ actualEnd or today
 * 3. **예측 막대**: 주황(orange-500/40, 점선) — forecast 데이터가 계획과 다를 때만 표시
 * 4. **Critical Path**: box-shadow 발광 효과
 * 5. **스택**: 계획(top:0) → 실제(top:12px) → 예측(top:12px)
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

  // Critical Path 발광 효과
  const cpClass = onCriticalPath ? "shadow-[0_0_6px_rgba(239,68,68,0.5)]" : "";

  return (
    <div className="relative h-5">
      {/* 계획 막대 — 파랑, top:0 */}
      <div
        className={`absolute top-0 h-2 rounded-sm bg-blue-500/40 border border-blue-500/60 ${cpClass}`}
        style={{ left: planLeft, width: planWidth }}
        title={`계획: ${task.startDate.slice(0, 10)} ~ ${task.endDate.slice(0, 10)}`}
      />

      {/* 실제 막대 — 초록/빨강, top:12px */}
      {actualBar && (
        <div
          className={`absolute h-1 rounded-sm ${
            actualBar.delayed ? "bg-error" : "bg-success"
          } ${cpClass}`}
          style={{ top: "12px", left: actualBar.left, width: actualBar.width }}
          title={`실제: ${actualStart?.toISOString().slice(0, 10)} ~ ${actualEnd?.toISOString().slice(0, 10) ?? "진행 중"}`}
        />
      )}

      {/* 예측 막대 — 주황, 점선, top:12px */}
      {forecastBar && (
        <div
          className={`absolute h-1 rounded-sm border border-dashed border-orange-500 bg-orange-500/40 ${cpClass}`}
          style={{ top: "12px", left: forecastBar.left, width: forecastBar.width }}
          title="예측 일정"
        />
      )}
    </div>
  );
}
