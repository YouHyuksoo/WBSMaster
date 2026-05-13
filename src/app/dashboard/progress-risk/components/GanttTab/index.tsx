/**
 * @file src/app/dashboard/progress-risk/components/GanttTab/index.tsx
 * @description Gantt 탭 — GanttChart + zoom 토글 (ZoomControl은 Task 5에서 분리)
 *
 * 초보자 가이드:
 * 1. **상태**: zoom 레벨 (day/week/month/quarter)
 * 2. **timeScale**: zoom 수준에 따라 재계산
 * 3. **zoom 토글**: 4개 버튼 (일/주/월/분기)
 * 4. **GanttChart**: 눈금 + 행 + 막대 영역 표시
 * 5. **Task 5에서**: 이 인라인 토글을 ZoomControl 컴포넌트로 분리 예정
 */
"use client";

import { useState } from "react";
import type { Forecast } from "@/lib/progress-calc/types";
import type { ProgressTask } from "@/app/dashboard/progress-risk/types";
import { GanttChart } from "./GanttChart";
import { buildTimeScale, type ZoomLevel } from "./timeScale";

interface Props {
  tasks: ProgressTask[];
  forecast: Map<string, Forecast>;
  projectEndDate: Date | null;
}

export function GanttTab({ tasks, forecast, projectEndDate }: Props) {
  const [zoom, setZoom] = useState<ZoomLevel>("week");
  const timeScale = buildTimeScale(tasks, zoom, projectEndDate);

  return (
    <div className="space-y-3">
      {/* zoom 인라인 토글 (Task 5에서 ZoomControl 컴포넌트로 분리 예정) */}
      <div className="flex justify-end gap-1 text-xs">
        {(["day", "week", "month", "quarter"] as ZoomLevel[]).map(z => (
          <button
            key={z}
            onClick={() => setZoom(z)}
            className={`px-2.5 py-1 rounded border transition-colors ${
              zoom === z
                ? "bg-primary/15 border-primary/40 text-primary"
                : "bg-white/5 dark:bg-white/5 border-white/10 text-text-secondary hover:bg-white/10 dark:hover:bg-white/10"
            }`}
          >
            {z === "day" ? "일" : z === "week" ? "주" : z === "month" ? "월" : "분기"}
          </button>
        ))}
      </div>

      <GanttChart tasks={tasks} forecast={forecast} timeScale={timeScale} />
    </div>
  );
}
