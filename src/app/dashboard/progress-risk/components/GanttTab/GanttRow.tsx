/**
 * @file src/app/dashboard/progress-risk/components/GanttTab/GanttRow.tsx
 * @description Gantt 1행 — 인덱스 + 카테고리 + 대분류 + 기능명 + 단계 + 막대
 *
 * 초보자 가이드:
 * 1. **인덱스**: 1번부터 시작하는 행 번호
 * 2. **카테고리/대분류**: Gantt에서도 분류 기준을 짧게 표시
 * 3. **기능명**: task.code + task.name (title으로 전체 표시)
 * 4. **Critical Path**: onCriticalPath true면 작은 강조 라벨 표시
 * 5. **단계**: 현재 단계 위치를 n/N 텍스트로 간결하게 표시
 * 6. **막대**: GanttBars 컴포넌트에서 계획/실제/예측 3종 표시
 */

import type { ProgressTask } from "@/app/dashboard/progress-risk/types";
import type { Forecast } from "@/lib/progress-calc/types";
import { STAGE_CATEGORY_LABEL } from "@/lib/stage-categories";
import { useStageDefs } from "@/hooks";
import { GanttBars } from "./GanttBars";
import type { TimeScale } from "./timeScale";

interface Props {
  index: number;
  task: ProgressTask;
  forecast: Forecast | undefined;
  timeScale: TimeScale;
  onCriticalPath: boolean;
  gridCols: string;
}

export function GanttRow({ index, task, forecast, timeScale, onCriticalPath, gridCols }: Props) {
  const { data: allStages = [] } = useStageDefs(task.projectId);
  const stagesOfCategory = allStages
    .filter((s) => s.category === task.stageCategory)
    .sort((a, b) => a.order - b.order);
  const currentIdx = stagesOfCategory.findIndex((s) => s.id === task.currentStageId);
  const categoryLabel = task.stageCategory === "ETC" ? "" : STAGE_CATEGORY_LABEL[task.stageCategory];
  const majorCategory = task.category ?? "";
  const rowTone = index % 2 === 0
    ? "bg-slate-50/70 dark:bg-white/[0.025]"
    : "bg-background-white dark:bg-surface-dark";

  return (
    <div
      className={`grid min-h-12 gap-2 border-b border-border/70 px-3 py-2 text-xs items-center transition-colors hover:bg-primary/5 dark:border-border-dark/70 dark:hover:bg-primary/10 ${
        onCriticalPath ? "border-l-4 border-l-warning" : "border-l-4 border-l-transparent"
      } ${rowTone}`}
      style={{ gridTemplateColumns: gridCols }}
    >
      {/* 인덱스 */}
      <div className="text-center font-medium text-text-secondary">{index}</div>

      {/* 카테고리 */}
      <div className="truncate text-[11px] text-text-secondary" title={categoryLabel}>
        {categoryLabel || "-"}
      </div>

      {/* 대분류 */}
      <div className="truncate text-[11px] text-text-secondary" title={majorCategory}>
        {majorCategory || "-"}
      </div>

      {/* 기능명 + code */}
      <div className="truncate text-text dark:text-white" title={`${task.code} ${task.name}`}>
        <span className="mr-1 rounded bg-surface px-1.5 py-0.5 text-[10px] font-medium text-text-secondary dark:bg-background-dark">{task.code}</span>
        <span className="font-medium">{task.name}</span>
        {onCriticalPath && (
          <span className="ml-1 rounded bg-warning/15 px-1.5 py-0.5 text-[9px] font-semibold text-warning">CP</span>
        )}
      </div>

      {/* 단계 진행 위치 */}
      <div className="text-[11px] text-text-secondary">
        {stagesOfCategory.length === 0 ? (
          <span className="italic">미정의</span>
        ) : currentIdx >= 0 ? (
          <span
            className="rounded bg-surface px-1.5 py-0.5 font-medium dark:bg-background-dark"
            title={stagesOfCategory[currentIdx]?.name}
          >
            {currentIdx + 1}/{stagesOfCategory.length}
          </span>
        ) : (
          <span className="text-text-secondary/60">-/{stagesOfCategory.length}</span>
        )}
      </div>

      {/* 막대들 */}
      <GanttBars task={task} forecast={forecast} timeScale={timeScale} onCriticalPath={onCriticalPath} />
    </div>
  );
}
