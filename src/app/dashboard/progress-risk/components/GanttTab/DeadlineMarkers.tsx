/**
 * @file src/app/dashboard/progress-risk/components/GanttTab/DeadlineMarkers.tsx
 * @description Gantt 시간축 위 목표/예측 종료일 라벨 마커
 *
 * 초보자 가이드:
 * 1. **목표 종료일** (자홍): project.endDate 위치에 ▼ 목표 표시
 * 2. **예측 종료일** (빨강): max(forecast.forecastEnd) 위치에 ▼ 예측 표시 (목표 초과 시만)
 * 3. **레이아웃**: 시간축 컬럼(4번째) 영역에 위치 정렬
 *
 * 세로선이 모든 행을 가로지르는 형태는 Phase 4로 이월.
 */

import type { Forecast } from "@/lib/progress-calc/types";
import type { TimeScale } from "./timeScale";

interface Props {
  projectEndDate: Date | null;
  forecast: Map<string, Forecast>;
  timeScale: TimeScale;
}

export function DeadlineMarkers({ projectEndDate, forecast, timeScale }: Props) {
  // 모든 예측 종료일 중 최대값 계산
  const allEnds = [...forecast.values()].map(f => f.forecastEnd.getTime());
  const maxForecast = allEnds.length > 0 ? new Date(Math.max(...allEnds)) : null;

  // 목표 초과 시에만 예측 표시
  const showForecast = maxForecast && projectEndDate && maxForecast > projectEndDate;

  // 둘 다 없으면 렌더 X
  if (!projectEndDate && !showForecast) return null;

  return (
    <div className="relative h-7 mt-1 mb-2">
      {projectEndDate && (
        <div
          className="absolute -translate-x-1/2 text-[10px] text-pink-500 font-semibold whitespace-nowrap"
          style={{ left: `${timeScale.toRatio(projectEndDate) * 100}%` }}
        >
          ▼ 목표 {projectEndDate.toISOString().slice(0, 10)}
        </div>
      )}
      {showForecast && (
        <div
          className="absolute -translate-x-1/2 text-[10px] text-red-500 font-semibold whitespace-nowrap"
          style={{
            left: `${timeScale.toRatio(maxForecast) * 100}%`,
            top: "14px",
          }}
        >
          ▼ 예측 {maxForecast.toISOString().slice(0, 10)}
        </div>
      )}
    </div>
  );
}
