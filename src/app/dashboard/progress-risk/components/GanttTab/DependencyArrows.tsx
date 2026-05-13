/**
 * @file src/app/dashboard/progress-risk/components/GanttTab/DependencyArrows.tsx
 * @description Gantt 위 선후행 의존성 SVG 화살표 overlay
 *
 * 초보자 가이드:
 * 1. **predecessorId**: task가 선행 task를 가지면 선행 종료 → 후행 시작 L자 화살표
 * 2. **SVG 좌표계**: viewBox="0 0 100 {height}" + preserveAspectRatio="none"으로
 *    % 기반의 좌표를 그대로 사용 (반응형 자동 스케일)
 * 3. **non-scaling-stroke**: 선 두께가 일정 유지 (줌 또는 스케일 무시)
 * 4. **L자 경로**: 선행 끝점(fromX, fromY) → 중간점(midX) → 후행 시작점(toX, toY)
 */

import type { Forecast } from "@/lib/progress-calc/types";
import type { TimeScale } from "./timeScale";
import type { ProgressTask } from "@/app/dashboard/progress-risk/types";

interface Props {
  tasks: ProgressTask[];
  forecast: Map<string, Forecast>;
  timeScale: TimeScale;
  rowHeight: number;
  rowGap: number;
}

interface Arrow {
  from: { x: number; y: number };
  to: { x: number; y: number };
  key: string;
}

export function DependencyArrows({ tasks, forecast, timeScale, rowHeight, rowGap }: Props) {
  const indexById = new Map<string, number>();
  tasks.forEach((t, i) => indexById.set(t.id, i));

  const arrows: Arrow[] = [];

  for (const t of tasks) {
    if (!t.predecessorId) continue;

    const fromIdx = indexById.get(t.predecessorId);
    const toIdx = indexById.get(t.id);

    if (fromIdx === undefined || toIdx === undefined) continue;

    const fromTask = tasks[fromIdx];
    const fromFore = forecast.get(fromTask.id);
    const toFore = forecast.get(t.id);

    if (!fromFore || !toFore) continue;

    // 선행 task의 forecastEnd와 후행 task의 forecastStart 기준
    const fromX = timeScale.toRatio(fromFore.forecastEnd) * 100;
    const fromY = fromIdx * (rowHeight + rowGap) + rowHeight / 2;

    const toX = timeScale.toRatio(toFore.forecastStart) * 100;
    const toY = toIdx * (rowHeight + rowGap) + rowHeight / 2;

    arrows.push({
      from: { x: fromX, y: fromY },
      to: { x: toX, y: toY },
      key: `${fromTask.id}-${t.id}`,
    });
  }

  if (arrows.length === 0) return null;

  const totalHeight = tasks.length * (rowHeight + rowGap);

  return (
    <svg
      className="absolute inset-0 pointer-events-none"
      width="100%"
      height={totalHeight}
      viewBox={`0 0 100 ${totalHeight}`}
      preserveAspectRatio="none"
      style={{ overflow: "visible" }}
    >
      <defs>
        <marker
          id="arrowhead-dep"
          markerWidth="6"
          markerHeight="6"
          refX="5"
          refY="3"
          orient="auto"
          markerUnits="userSpaceOnUse"
        >
          <polygon points="0 0, 6 3, 0 6" fill="#94a3b8" />
        </marker>
      </defs>

      {arrows.map((a) => {
        const midX = (a.from.x + a.to.x) / 2;
        const d = `M ${a.from.x} ${a.from.y} H ${midX} V ${a.to.y} H ${a.to.x}`;

        return (
          <path
            key={a.key}
            d={d}
            fill="none"
            stroke="#94a3b8"
            strokeWidth="0.3"
            strokeDasharray="0.8,0.4"
            markerEnd="url(#arrowhead-dep)"
            vectorEffect="non-scaling-stroke"
          />
        );
      })}
    </svg>
  );
}
