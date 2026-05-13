/**
 * @file src/app/dashboard/progress-risk/components/GanttTab/index.tsx
 * @description Gantt 탭 — GanttChart + zoom 토글 (ZoomControl은 Task 5에서 분리)
 *
 * 초보자 가이드:
 * 1. **상태**: zoom 레벨 (day/week/month/quarter)
 * 2. **timeScale**: zoom 수준에 따라 재계산
 * 3. **zoom 토글**: 4개 버튼 (일/주/월/분기)
 * 4. **GanttChart**: 눈금 + 행 목록(GanttRow) + 막대 표시
 * 5. **Critical Path**: diagnosts.criticalPath를 Set으로 변환해서 전달
 * 6. **Task 5에서**: 이 인라인 토글을 ZoomControl 컴포넌트로 분리 예정
 */
"use client";

import { useState } from "react";
import type { Forecast } from "@/lib/progress-calc/types";
import type { ProgressTask } from "@/app/dashboard/progress-risk/types";
import { GanttChart } from "./GanttChart";
import { buildTimeScale, type ZoomLevel } from "./timeScale";
import { ZoomControl } from "./ZoomControl";

interface Props {
  tasks: ProgressTask[];
  forecast: Map<string, Forecast>;
  projectEndDate: Date | null;
  criticalPath?: string[];
}

export function GanttTab({ tasks, forecast, projectEndDate, criticalPath }: Props) {
  const [zoom, setZoom] = useState<ZoomLevel>("week");
  const timeScale = buildTimeScale(tasks, zoom, projectEndDate);
  const cpSet = new Set(criticalPath ?? []);

  return (
    <div className="space-y-3">
      {/* zoom 토글 */}
      <div className="flex justify-end">
        <ZoomControl value={zoom} onChange={setZoom} />
      </div>

      <GanttChart tasks={tasks} forecast={forecast} timeScale={timeScale} criticalPathIds={cpSet} projectEndDate={projectEndDate} />
    </div>
  );
}
