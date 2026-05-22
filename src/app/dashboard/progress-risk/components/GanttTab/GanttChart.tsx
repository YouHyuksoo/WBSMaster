/**
 * @file src/app/dashboard/progress-risk/components/GanttTab/GanttChart.tsx
 * @description Gantt 차트 컨테이너 — 시간축 + 목표/예측 종료일 마커 + 행 목록 + 선후행 화살표 overlay
 *
 * 초보자 가이드:
 * 1. **헤더**: 시간축 눈금 표시
 * 2. **마커**: 목표/예측 종료일 라벨 (시간축 컬럼 영역에 정렬)
 * 3. **행**: GanttRow 컴포넌트 — 각 task별 index + category + name + 단계 + 막대
 * 4. **그리드 레이아웃**: 고정 너비(36px, 92px, 92px, 1fr, 70px) + 스크롤 가능한 타임라인
 * 5. **Critical Path**: 옵션 Set으로 받아서 GanttRow에 전달
 * 6. **선후행 화살표**: DependencyArrows overlay — SVG L자 점선 화살표
 */
"use client";

import type { Forecast } from "@/lib/progress-calc/types";
import type { TimeScale } from "./timeScale";
import type { ProgressTask } from "@/app/dashboard/progress-risk/types";
import { GanttRow } from "./GanttRow";
import { DeadlineMarkers } from "./DeadlineMarkers";

interface Props {
  tasks: ProgressTask[];
  forecast: Map<string, Forecast>;
  timeScale: TimeScale;
  criticalPathIds?: Set<string>;
  projectEndDate?: Date | null;
}

const GRID_COLS = "36px 92px 92px 1fr 70px 1fr";

export function GanttChart({ tasks, forecast, timeScale, criticalPathIds, projectEndDate }: Props) {
  return (
    <div className="h-full min-h-0 bg-background-white dark:bg-surface-dark border border-border dark:border-border-dark rounded-xl overflow-x-auto overflow-y-auto">
      <div className="min-w-[980px]">
        {/* sticky: 시간축 헤더 + 마커 행 — 세로 스크롤 시 고정 */}
        <div className="sticky top-0 z-10">
          {/* 시간축 눈금 */}
          <div
            className="grid gap-2 border-b border-border dark:border-border-dark bg-surface dark:bg-background-dark px-3 py-2 text-xs text-text-secondary"
            style={{ gridTemplateColumns: GRID_COLS }}
          >
            <div className="font-semibold text-center">#</div>
            <div className="font-semibold uppercase">카테고리</div>
            <div className="font-semibold uppercase">대분류</div>
            <div className="font-semibold uppercase">기능</div>
            <div className="font-semibold uppercase">단계</div>
            <div className="relative h-6 rounded bg-background-white/70 ring-1 ring-border/60 dark:bg-surface-dark/70 dark:ring-border-dark/60">
              {timeScale.ticks.map((t, i) => (
                <span
                  key={`line-${i}`}
                  className="absolute top-0 h-full border-l border-border/50 dark:border-border-dark/50"
                  style={{ left: `${t.ratio * 100}%` }}
                />
              ))}
              {timeScale.ticks.map((t, i) => (
                <span
                  key={i}
                  className="absolute top-1 -translate-x-1/2 rounded bg-background-white px-1 text-[10px] shadow-sm ring-1 ring-border/60 dark:bg-surface-dark dark:ring-border-dark"
                  style={{ left: `${t.ratio * 100}%` }}
                >
                  {t.label}
                </span>
              ))}
            </div>
          </div>

          {/* 목표/예측 종료일 마커 */}
          <div
            className="grid gap-2 border-b border-border/60 px-3 bg-background-white dark:bg-surface-dark dark:border-border-dark/60"
            style={{ gridTemplateColumns: GRID_COLS }}
          >
            <div></div>
            <div></div>
            <div></div>
            <div></div>
            <div></div>
            <DeadlineMarkers
              projectEndDate={projectEndDate ?? null}
              forecast={forecast}
              timeScale={timeScale}
            />
          </div>
        </div>{/* /sticky top-0 */}

        {/* 행 영역 */}
        <div className="relative">
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
      </div>
    </div>
  );
}
