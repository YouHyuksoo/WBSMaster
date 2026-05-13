/**
 * @file src/app/dashboard/progress-risk/components/GanttTab/GanttRow.tsx
 * @description Gantt 1행 — 인덱스 + 기능명 + mini-stepper(9 dots) + 막대
 *
 * 초보자 가이드:
 * 1. **인덱스**: 1번부터 시작하는 행 번호
 * 2. **기능명**: task.code + task.name (title으로 전체 표시)
 * 3. **Critical Path**: onCriticalPath true면 옆에 ⚡ 아이콘
 * 4. **mini-stepper**: STAGE_ORDER 9개 단계 중 현재 단계는 밝고(cyan), 완료는 초록, 미완은 어두움
 * 5. **막대**: GanttBars 컴포넌트에서 계획/실제/예측 3종 표시
 */

import type { ProgressTask } from "@/app/dashboard/progress-risk/types";
import type { Forecast } from "@/lib/progress-calc/types";
import { STAGE_ORDER } from "@/lib/progress-stages";
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
  const currentIdx = STAGE_ORDER.indexOf(task.currentStage);

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

      {/* mini-stepper: 9개 dot */}
      <div className="flex items-center gap-0.5">
        {STAGE_ORDER.map((_, i) => {
          const bg = i === currentIdx
            ? "bg-[#00f3ff]"
            : i < currentIdx
              ? "bg-green-500"
              : "bg-white/10 dark:bg-white/5";
          return <div key={i} className={`w-1.5 h-1.5 rounded-sm ${bg}`} />;
        })}
      </div>

      {/* 막대들 */}
      <GanttBars task={task} forecast={forecast} timeScale={timeScale} onCriticalPath={onCriticalPath} />
    </div>
  );
}
