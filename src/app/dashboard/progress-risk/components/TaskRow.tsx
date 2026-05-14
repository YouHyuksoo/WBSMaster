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
import { PredecessorSelect } from "./PredecessorSelect";
import { AssigneeChips } from "./AssigneeChips";

interface Props {
  index: number;
  task: ProgressTask;
  projectId: string;
  allTasks: ProgressTask[];
  gridCols: string;
  highlighted?: boolean;
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

export function TaskRow({ index, task, projectId, allTasks, gridCols, highlighted }: Props) {
  const update = useUpdateProgressTask(projectId);
  const remove = useDeleteProgressTask(projectId);

  const [name, setName] = useDebouncedUpdate(task.name, v => update.mutate({ id: task.id, data: { name: v } }));
  const [category, setCategory] = useDebouncedUpdate(task.category ?? "", v => update.mutate({ id: task.id, data: { category: v || null } }));
  const [startDate, setStartDate] = useDebouncedUpdate(
    task.startDate.slice(0, 10),
    v => {
      const end = task.endDate.slice(0, 10);
      if (new Date(end) < new Date(v)) {
        alert("종료일보다 늦은 시작일은 지정할 수 없습니다.");
        setStartDate(task.startDate.slice(0, 10));  // 롤백
        return;
      }
      update.mutate({ id: task.id, data: { startDate: v } });
    }
  );
  const [endDate, setEndDate] = useDebouncedUpdate(
    task.endDate.slice(0, 10),
    v => {
      const start = task.startDate.slice(0, 10);
      if (new Date(v) < new Date(start)) {
        alert("시작일보다 빠른 종료일은 지정할 수 없습니다.");
        setEndDate(task.endDate.slice(0, 10));  // 롤백
        return;
      }
      update.mutate({ id: task.id, data: { endDate: v } });
    }
  );

  const handleDelete = () => {
    if (confirm(`${task.code} ${task.name}을(를) 삭제하시겠습니까?`)) {
      remove.mutate(task.id);
    }
  };

  return (
    <div
      className={`grid gap-2 px-4 py-3 border-b border-border dark:border-border-dark hover:bg-surface dark:hover:bg-background-dark transition-colors items-center min-w-[1480px] text-sm ${
        highlighted ? "bg-primary/10 ring-2 ring-primary/40 ring-inset" : ""
      }`}
      style={{ gridTemplateColumns: gridCols }}
    >
      <div className="text-text-secondary">{index}</div>
      <div className="text-text-secondary text-xs">{task.code}</div>
      <div className="text-text-secondary text-xs truncate" title={task.businessUnit ?? ""}>
        {task.businessUnit ?? "-"}
      </div>
      <input
        list="progress-task-category-options"
        value={category}
        onChange={e => setCategory(e.target.value)}
        placeholder="대분류"
        className="min-w-0 bg-transparent border-0 focus:outline-none focus:bg-white/5 dark:focus:bg-white/5 px-1 py-0.5 rounded text-xs text-text-secondary"
        aria-label="대분류"
      />
      <div className="flex items-center gap-2 min-w-0">
        <input
          value={name}
          onChange={e => setName(e.target.value)}
          className="flex-1 min-w-0 bg-transparent border-0 focus:outline-none focus:bg-white/5 dark:focus:bg-white/5 px-1 py-0.5 rounded font-medium text-text dark:text-white"
          aria-label="기능명"
        />
        <button
          type="button"
          onClick={() => update.mutate({ id: task.id, data: { isParallel: !task.isParallel } })}
          className={`shrink-0 px-1.5 py-0.5 rounded text-[10px] font-bold border transition-colors ${
            task.isParallel
              ? "bg-success/15 border-success/40 text-success hover:bg-success/25"
              : "bg-warning/15 border-warning/40 text-warning hover:bg-warning/25"
          }`}
          title={task.isParallel ? "병렬 (클릭하면 순차로 전환)" : "순차 (클릭하면 병렬로 전환)"}
          aria-label={task.isParallel ? "병렬" : "순차"}
        >
          {task.isParallel ? "P" : "S"}
        </button>
      </div>
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
      <PredecessorSelect
        value={task.predecessorId}
        taskId={task.id}
        allTasks={allTasks}
        onChange={(pid) => update.mutate({ id: task.id, data: { predecessorId: pid } })}
      />
      <AssigneeChips task={task} projectId={projectId} />
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
