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
    <div className="flex flex-col flex-1 min-h-0 gap-3">
      {/* 고정 헤더: 범례 + 줌 컨트롤 */}
      <div className="flex-none flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3 text-[11px] text-text-secondary">
          <span className="font-semibold text-text dark:text-white">Gantt 범례</span>
          <span className="inline-flex items-center gap-1.5"><i className="h-2.5 w-6 rounded-full border border-slate-300 bg-slate-200 dark:border-slate-600 dark:bg-slate-700" />계획</span>
          <span className="inline-flex items-center gap-1.5"><i className="h-1.5 w-6 rounded-full bg-emerald-500" />실제</span>
          <span className="inline-flex items-center gap-1.5"><i className="h-1.5 w-6 rounded-full bg-rose-400" />지연</span>
          <span className="inline-flex items-center gap-1.5"><i className="h-1.5 w-6 rounded-full bg-amber-300" />예측</span>
          <span className="rounded bg-warning/15 px-1.5 py-0.5 font-semibold text-warning">CP</span>
          <span>목표/예측 종료일은 상단 마커로 표시</span>
        </div>
        <ZoomControl value={zoom} onChange={setZoom} />
      </div>

      {/* GanttChart가 자체 Y/X 스크롤을 모두 담당 */}
      <div className="flex-1 min-h-0">
        <GanttChart tasks={tasks} forecast={forecast} timeScale={timeScale} criticalPathIds={cpSet} projectEndDate={projectEndDate} />
      </div>
    </div>
  );
}
