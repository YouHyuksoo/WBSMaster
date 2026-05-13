/**
 * @file src/app/dashboard/progress-risk/components/TaskRow.tsx
 * @description task 그리드 1행 (read-only 표시 — Task 12+에서 인라인 편집 추가)
 *
 * 초보자 가이드:
 * 1. **행 구조**: 인덱스, 코드, 이름, 날짜, 단계, 선행, 담당자, 상태, 메뉴
 * 2. **담당자**: assignees 배열의 user.name 표시 (쉼표로 구분)
 * 3. **선행**: predecessorId로 이전 task 찾아 코드 표시
 * 4. **STAGE_LABEL**: 진도/리스크 상수에서 import해 단계 이름 표시
 */
"use client";

import type { ProgressTask } from "@/lib/api";
import { STAGE_LABEL } from "../constants";

interface Props {
  index: number;
  task: ProgressTask;
  projectId: string;
  allTasks: ProgressTask[];
  gridCols: string;
}

export function TaskRow({ index, task, allTasks, gridCols }: Props) {
  // 선행 task 찾기
  const predecessor = allTasks.find(t => t.id === task.predecessorId);

  return (
    <div
      className="grid gap-2 px-4 py-3 border-b border-border dark:border-border-dark hover:bg-surface dark:hover:bg-background-dark transition-colors items-center min-w-[1200px] text-sm"
      style={{ gridTemplateColumns: gridCols }}
    >
      {/* # */}
      <div className="text-text-secondary">{index}</div>

      {/* 코드 */}
      <div className="text-text-secondary text-xs">{task.code ?? "-"}</div>

      {/* 기능명 */}
      <div className="font-medium text-text dark:text-white">{task.name}</div>

      {/* 시작일 (YYYY-MM-DD) */}
      <div className="text-text-secondary text-xs">{task.startDate.slice(0, 10)}</div>

      {/* 종료일 (YYYY-MM-DD) */}
      <div className="text-text-secondary text-xs">{task.endDate.slice(0, 10)}</div>

      {/* 단계 배지 */}
      <div>
        <span className="px-2 py-1 rounded text-xs bg-primary/10 text-primary">
          {STAGE_LABEL[task.currentStage]}
        </span>
      </div>

      {/* 선행 코드 */}
      <div className="text-xs text-text-secondary">{predecessor?.code ?? "-"}</div>

      {/* 담당자 */}
      <div className="text-xs text-text dark:text-white">
        {task.assignees && task.assignees.length > 0
          ? task.assignees.map(a => a.user.name).join(", ")
          : "-"}
      </div>

      {/* 상태 */}
      <div className="text-xs text-text-secondary">{task.status}</div>

      {/* 메뉴 (향후 버튼 추가 예정) */}
      <div className="text-text-secondary cursor-pointer">⋮</div>
    </div>
  );
}
