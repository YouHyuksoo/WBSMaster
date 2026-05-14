/**
 * @file src/app/dashboard/progress-risk/components/GanttTab/GanttRow.tsx
 * @description Gantt 1행 — 인덱스 + 기능명 + mini-stepper(동적 단계) + 막대
 *
 * 초보자 가이드:
 * 1. **인덱스**: 1번부터 시작하는 행 번호
 * 2. **기능명**: task.code + task.name (title으로 전체 표시)
 * 3. **Critical Path**: onCriticalPath true면 옆에 ⚡ 아이콘
 * 4. **mini-stepper**: 동적 단계 목록 기반 dot (Task 20에서 완전 교체 예정)
 * 5. **막대**: GanttBars 컴포넌트에서 계획/실제/예측 3종 표시
 */

import type { ProgressTask } from "@/app/dashboard/progress-risk/types";
import type { Forecast } from "@/lib/progress-calc/types";
import { GanttBars } from "./GanttBars";
import type { TimeScale } from "./timeScale";

/** mini-stepper용 임시 10칸 배열 — Task 20에서 동적 단계로 교체 예정 */
const PLACEHOLDER_DOTS = Array.from({ length: 10 }, (_, i) => i);

interface Props {
  index: number;
  task: ProgressTask;
  forecast: Forecast | undefined;
  timeScale: TimeScale;
  onCriticalPath: boolean;
  gridCols: string;
}

export function GanttRow({ index, task, forecast, timeScale, onCriticalPath, gridCols }: Props) {
  // TODO Task 20: stages prop 받아 동적 dot 렌더링으로 교체
  const totalDots = PLACEHOLDER_DOTS.length;
  const filledDots = Math.round((task.progress / 100) * totalDots);

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

      {/* mini-stepper: 진척률 기반 10개 dot (Task 20에서 동적 단계로 교체 예정) */}
      <div className="flex items-center gap-0.5">
        {PLACEHOLDER_DOTS.map((i) => {
          const bg = i === filledDots - 1
            ? "bg-[#00f3ff]"
            : i < filledDots
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
