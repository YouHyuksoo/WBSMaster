/**
 * @file src/app/dashboard/progress-risk/components/TaskRow.tsx
 * @description task 그리드 1행 (인라인 편집 + 단계 stepper)
 *
 * 초보자 가이드:
 * 1. **인라인 편집**: 이름/시작일/종료일을 input으로 표시 (debounce 500ms 자동 저장)
 * 2. **useDebouncedUpdate**: 로컬 상태 → 500ms 후 자동 저장
 * 3. **삭제 버튼**: ✕ 버튼으로 confirm 후 삭제
 * 4. **StageStepper**: 단계 변경 시 즉시 반영
 * 5. **담당자/선행**: Task 13~에서 추가 예정
 */
"use client";

import { useState, useEffect } from "react";
import type { ProgressTask } from "@/lib/api";
import { useUpdateProgressTask, useDeleteProgressTask } from "@/hooks";
import { StageStepper } from "./StageStepper";

interface Props {
  index: number;
  task: ProgressTask;
  projectId: string;
  allTasks: ProgressTask[];
  gridCols: string;
}

/** 디바운스 자동 저장 훅 */
function useDebouncedUpdate<T>(value: T, onSave: (v: T) => void, delay = 500) {
  const [local, setLocal] = useState(value);
  useEffect(() => setLocal(value), [value]);
  useEffect(() => {
    if (local === value) return;
    const t = setTimeout(() => onSave(local), delay);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [local]);
  return [local, setLocal] as const;
}

export function TaskRow({ index, task, projectId, allTasks, gridCols }: Props) {
  const update = useUpdateProgressTask(projectId);
  const remove = useDeleteProgressTask(projectId);

  const [name, setName] = useDebouncedUpdate(task.name, v => update.mutate({ id: task.id, data: { name: v } }));
  const [startDate, setStartDate] = useDebouncedUpdate(
    task.startDate.slice(0, 10),
    v => update.mutate({ id: task.id, data: { startDate: v } })
  );
  const [endDate, setEndDate] = useDebouncedUpdate(
    task.endDate.slice(0, 10),
    v => update.mutate({ id: task.id, data: { endDate: v } })
  );

  const predecessor = allTasks.find(t => t.id === task.predecessorId);

  const handleDelete = () => {
    if (confirm(`${task.code} ${task.name}을(를) 삭제하시겠습니까?`)) {
      remove.mutate(task.id);
    }
  };

  return (
    <div
      className="grid gap-2 px-4 py-3 border-b border-border dark:border-border-dark hover:bg-surface dark:hover:bg-background-dark transition-colors items-center min-w-[1200px] text-sm"
      style={{ gridTemplateColumns: gridCols }}
    >
      <div className="text-text-secondary">{index}</div>
      <div className="text-text-secondary text-xs">{task.code}</div>
      <input
        value={name}
        onChange={e => setName(e.target.value)}
        className="bg-transparent border-0 focus:outline-none focus:bg-white/5 dark:focus:bg-white/5 px-1 py-0.5 rounded font-medium text-text dark:text-white"
        aria-label="기능명"
      />
      <input
        type="date"
        value={startDate}
        onChange={e => setStartDate(e.target.value)}
        className="bg-transparent border-0 focus:outline-none focus:bg-white/5 px-1 py-0.5 rounded text-text-secondary text-xs"
        aria-label="시작일"
      />
      <input
        type="date"
        value={endDate}
        onChange={e => setEndDate(e.target.value)}
        className="bg-transparent border-0 focus:outline-none focus:bg-white/5 px-1 py-0.5 rounded text-text-secondary text-xs"
        aria-label="종료일"
      />
      <div>
        <StageStepper
          currentStage={task.currentStage}
          onChange={(stage) => update.mutate({ id: task.id, data: { currentStage: stage } })}
        />
      </div>
      <div className="text-xs text-text-secondary">{predecessor?.code ?? "-"}</div>
      <div className="text-xs text-text dark:text-white">
        {task.assignees.map(a => a.user.name).join(", ") || "-"}
      </div>
      <div className="text-xs text-text-secondary">{task.status}</div>
      <button
        onClick={handleDelete}
        className="text-text-secondary hover:text-error transition-colors"
        aria-label="삭제"
        title="task 삭제"
      >
        ✕
      </button>
    </div>
  );
}
