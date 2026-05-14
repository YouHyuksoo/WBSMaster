/**
 * @file src/app/dashboard/progress-risk/components/GanttTab/GanttRow.tsx
 * @description Gantt 1행 — 인덱스 + 기능명 + mini-stepper(동적 단계) + 막대
 *
 * 초보자 가이드:
 * 1. **인덱스**: 1번부터 시작하는 행 번호
 * 2. **기능명**: task.code + task.name (title으로 전체 표시)
 * 3. **Critical Path**: onCriticalPath true면 옆에 ⚡ 아이콘
 * 4. **mini-stepper**: task.stageCategory에 속한 단계 목록을 dot으로 표시
 *    - 완료 단계: 초록색, 현재 단계: 시안색, 미진행: 흰색/반투명
 * 5. **막대**: GanttBars 컴포넌트에서 계획/실제/예측 3종 표시
 */

import type { ProgressTask } from "@/app/dashboard/progress-risk/types";
import type { Forecast } from "@/lib/progress-calc/types";
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

  return (
    <div
      className="grid gap-2 py-1.5 border-b border-border/30 dark:border-border-dark/30 text-xs items-center"
      style={{ gridTemplateColumns: gridCols }}
    >
      {/* 인덱스 */}
      <div className="text-text-secondary">{index}</div>

      {/* 기능명 + code */}
      <div className="text-text dark:text-white truncate" title={`${task.code} ${task.name}`}>
        <span className="text-text-secondary text-[10px] mr-1">{task.code}</span>
        {task.name}
        {onCriticalPath && (
          <span className="ml-1 text-[9px] text-error">⚡</span>
        )}
      </div>

      {/* mini-stepper: 동적 단계 dot */}
      <div className="flex items-center gap-0.5">
        {stagesOfCategory.length === 0 ? (
          <span className="text-[8px] text-text-secondary italic">미정의</span>
        ) : (
          stagesOfCategory.map((s, i) => {
            const bg = i === currentIdx
              ? "bg-[#00f3ff]"
              : currentIdx >= 0 && i < currentIdx
                ? "bg-green-500"
                : "bg-white/10 dark:bg-white/5";
            return <div key={s.id} className={`w-1.5 h-1.5 rounded-sm ${bg}`} title={s.name} />;
          })
        )}
      </div>

      {/* 막대들 */}
      <GanttBars task={task} forecast={forecast} timeScale={timeScale} onCriticalPath={onCriticalPath} />
    </div>
  );
}
