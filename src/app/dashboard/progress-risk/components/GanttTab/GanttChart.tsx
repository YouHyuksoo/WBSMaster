/**
 * @file src/app/dashboard/progress-risk/components/GanttTab/GanttChart.tsx
 * @description Gantt 차트 컨테이너 — 시간축 + 목표/예측 종료일 마커 + 행 목록 + 선후행 화살표 overlay
 *
 * 초보자 가이드:
 * 1. **헤더**: 시간축 눈금 표시
 * 2. **마커**: 목표/예측 종료일 라벨 (시간축 컬럼 영역에 정렬)
 * 3. **행**: GanttRow 컴포넌트 — 각 task별 index + name + mini-stepper + 막대
 * 4. **그리드 레이아웃**: 고정 너비(36px, 1fr, 130px) + 스크롤 가능한 타임라인
 * 5. **Critical Path**: 옵션 Set으로 받아서 GanttRow에 전달
 * 6. **선후행 화살표**: DependencyArrows overlay — SVG L자 점선 화살표
 */
"use client";

import type { Forecast } from "@/lib/progress-calc/types";
import type { TimeScale } from "./timeScale";
import type { ProgressTask } from "@/app/dashboard/progress-risk/types";
import { GanttRow } from "./GanttRow";
import { DeadlineMarkers } from "./DeadlineMarkers";
import { DependencyArrows } from "./DependencyArrows";

interface Props {
  tasks: ProgressTask[];
  forecast: Map<string, Forecast>;
  timeScale: TimeScale;
  criticalPathIds?: Set<string>;
  projectEndDate?: Date | null;
}

const GRID_COLS = "36px 1fr 130px 1fr";
const ROW_HEIGHT = 20; // h-5 = 20px
const ROW_GAP = 12;    // border + py-1.5 합산

export function GanttChart({ tasks, forecast, timeScale, criticalPathIds, projectEndDate }: Props) {
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

      {/* 목표/예측 종료일 마커 — 시간축 컬럼 영역에 정렬 */}
      <div className="grid gap-2" style={{ gridTemplateColumns: GRID_COLS }}>
        <div></div>
        <div></div>
        <div></div>
        <DeadlineMarkers
          projectEndDate={projectEndDate ?? null}
          forecast={forecast}
          timeScale={timeScale}
        />
      </div>

      {/* 행 영역 + 화살표 overlay */}
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

        {/* 시간축 컬럼 영역에만 정렬된 화살표 overlay */}
        <div
          className="absolute pointer-events-none"
          style={{
            top: 0,
            // GRID_COLS "36px 1fr 130px 1fr" 기준:
            // 좌측 영역 = 36px + gap(0.5rem=8px) + 1fr + gap(8px) + 130px + gap(8px)
            // 시간축 컬럼 시작 = 36 + 8 + (가용폭 - 36 - 130 - 24) / 2 + 8 + 130 + 8
            // = 182 + (100% - 190) / 2
            left: `calc((100% - 36px - 130px - 1.5rem) / 2 + 36px + 130px + 1.5rem)`,
            right: 0,
            bottom: 0,
          }}
        >
          <DependencyArrows
            tasks={tasks}
            forecast={forecast}
            timeScale={timeScale}
            rowHeight={ROW_HEIGHT}
            rowGap={ROW_GAP}
          />
        </div>
      </div>
    </div>
  );
}
