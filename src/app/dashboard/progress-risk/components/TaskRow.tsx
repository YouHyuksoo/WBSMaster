/**
 * @file src/app/dashboard/progress-risk/components/TaskRow.tsx
 * @description task 그리드 1행 (인라인 편집 + 단계 stepper)
 *
 * 초보자 가이드:
 * 1. **인라인 편집**: 이름/목표일자를 input으로 표시 (debounce 500ms 자동 저장)
 * 2. **useDebouncedUpdate**: 로컬 상태 → 500ms 후 자동 저장
 * 3. **삭제 버튼**: ✕ 버튼으로 confirm 후 삭제
 * 4. **StageStepper**: 단계 변경 시 즉시 반영
 * 5. **담당자/선행**: Task 13~에서 추가 예정
 */
"use client";

import { useState, useEffect } from "react";
import type { ProgressTask } from "@/lib/api";
import {
  useDeleteProgressTask,
  useProgressTaskStageDetails,
  useStageDefs,
  useUpdateProgressTask,
  useUpdateProgressTaskStageDetail,
} from "@/hooks";
import { STAGE_CATEGORY_LABEL, STAGE_CATEGORY_ORDER, type StageCategory } from "@/lib/stage-categories";
import { StageStepper } from "./StageStepper";
import { PredecessorSelect } from "./PredecessorSelect";
import { AssigneeChips } from "./AssigneeChips";
import { ConfirmModal, Icon } from "@/components/ui";
import { getTargetDateDiffDays, getTargetDateDiffLabel } from "./taskDateFields";
import { PROGRESS_TASK_STATUS_LABEL, PROGRESS_TASK_STATUS_OPTIONS, type ProgressTaskStatus } from "./taskStatusOptions";
import { getIncompletePriorStagesForTarget } from "./stageAutoComplete";

interface Props {
  index: number;
  task: ProgressTask;
  projectId: string;
  allTasks: ProgressTask[];
  gridCols: string;
  minWidth: string;
  highlighted?: boolean;
  selected?: boolean;
  onSelectChange?: (checked: boolean) => void;
  onEditRequest: (task: ProgressTask) => void;
}

/** 디바운스 자동 저장 훅 */
function useDebouncedUpdate<T>(value: T, onSave: (v: T) => void, delay = 500) {
  const [local, setLocal] = useState(value);
  useEffect(() => {
    if (local === value) return;
    const t = setTimeout(() => onSave(local), delay);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [local]);
  return [local, setLocal] as const;
}

export function TaskRow({
  index,
  task,
  projectId,
  allTasks,
  gridCols,
  minWidth,
  highlighted,
  selected = false,
  onSelectChange,
  onEditRequest,
}: Props) {
  const update = useUpdateProgressTask(projectId);
  const remove = useDeleteProgressTask(projectId);
  const updateStageDetail = useUpdateProgressTaskStageDetail(task.id);
  const { data: stageDetails = [] } = useProgressTaskStageDetails(task.id);
  const { data: allStages = [] } = useStageDefs(projectId);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [pendingStageId, setPendingStageId] = useState<string | null>(null);
  const stagesOfCategory = allStages.filter((s) => s.category === task.stageCategory);
  const pendingPriorStages = pendingStageId
    ? getIncompletePriorStagesForTarget(stagesOfCategory, pendingStageId, stageDetails)
    : [];

  const [name, setName] = useDebouncedUpdate(task.name, v => update.mutate({ id: task.id, data: { name: v } }));
  const [category, setCategory] = useDebouncedUpdate(task.category ?? "", v => update.mutate({ id: task.id, data: { category: v || null } }));
  const [targetDate, setTargetDate] = useDebouncedUpdate(
    task.endDate.slice(0, 10),
    v => {
      update.mutate({ id: task.id, data: { endDate: v } });
    }
  );
  const targetDiffDays = getTargetDateDiffDays(targetDate);
  const targetDiffLabel = getTargetDateDiffLabel(targetDate);
  const targetDiffClass = targetDiffDays < 0
    ? "border-error/40 bg-error/10 text-error"
    : targetDiffDays === 0
      ? "border-warning/40 bg-warning/10 text-warning"
      : "border-success/30 bg-success/10 text-success";

  const handleDelete = async () => {
    try {
      await remove.mutateAsync(task.id);
    } finally {
      setShowDeleteConfirm(false);
    }
  };

  const handleStageClick = (stageId: string) => {
    const incompletePriorStages = getIncompletePriorStagesForTarget(stagesOfCategory, stageId, stageDetails);
    if (incompletePriorStages.length === 0) {
      update.mutate({ id: task.id, data: { currentStageId: stageId } });
      return;
    }
    setPendingStageId(stageId);
  };

  const handleConfirmStageChange = async () => {
    if (!pendingStageId) return;
    try {
      await Promise.all(
        pendingPriorStages.map((stage) =>
          updateStageDetail.mutateAsync({ stageId: stage.id, data: { status: "COMPLETED" } })
        )
      );
      await update.mutateAsync({ id: task.id, data: { currentStageId: pendingStageId } });
    } finally {
      setPendingStageId(null);
    }
  };

  return (
    <>
      <div
        className={`grid gap-1.5 px-3 py-2 border-b border-border dark:border-border-dark hover:bg-surface dark:hover:bg-background-dark transition-colors items-center text-xs ${
          highlighted ? "bg-primary/10 ring-2 ring-primary/40 ring-inset" : ""
        }`}
        style={{ gridTemplateColumns: gridCols, minWidth }}
      >
        <div className="flex items-center justify-center gap-1">
          <button
            type="button"
            onClick={() => onEditRequest(task)}
            className="inline-flex size-7 items-center justify-center rounded border border-border text-text-secondary transition-colors hover:border-primary/50 hover:bg-primary/10 hover:text-primary dark:border-border-dark"
            aria-label={`${task.code ?? task.name} 수정`}
            title="task 수정"
          >
            <Icon name="edit" size="xs" />
          </button>
          <button
            type="button"
            onClick={() => setShowDeleteConfirm(true)}
            className="inline-flex size-7 items-center justify-center rounded border border-border text-text-secondary transition-colors hover:border-error/50 hover:bg-error/10 hover:text-error dark:border-border-dark"
            aria-label={`${task.code ?? task.name} 삭제`}
            title="task 삭제"
          >
            <Icon name="delete" size="xs" />
          </button>
        </div>
      <div className="flex items-center justify-center">
        <input
          type="checkbox"
          checked={selected}
          onChange={(e) => onSelectChange?.(e.target.checked)}
          aria-label={`${task.code ?? task.name} 선택`}
          className="size-4 accent-primary"
        />
      </div>
      <div className="text-text-secondary">{index}</div>
      <div className="text-text-secondary text-[11px] truncate" title={task.businessUnit ?? ""}>
        {task.businessUnit ?? "-"}
      </div>
      <select
        value={task.stageCategory}
        onChange={(e) => update.mutate({ id: task.id, data: { stageCategory: e.target.value as StageCategory } })}
        className="bg-transparent border-0 focus:outline-none focus:bg-white/5 dark:focus:bg-white/5 px-1 py-0.5 rounded text-xs text-text dark:text-white"
        aria-label="카테고리"
      >
        {STAGE_CATEGORY_ORDER.map((c) => (
          <option key={c} value={c}>{STAGE_CATEGORY_LABEL[c]}</option>
        ))}
      </select>
      <input
        list="progress-task-category-options"
        value={category}
        onChange={e => setCategory(e.target.value)}
        placeholder="대분류"
        className="min-w-0 bg-transparent border-0 focus:outline-none focus:bg-white/5 dark:focus:bg-white/5 px-1 py-0.5 rounded text-[11px] text-text-secondary"
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
      <select
        value={task.status}
        onChange={(e) => update.mutate({ id: task.id, data: { status: e.target.value as ProgressTaskStatus } })}
        className="bg-transparent border-0 focus:outline-none focus:bg-white/5 dark:focus:bg-white/5 px-1 py-0.5 rounded text-[11px] text-text dark:text-white"
        aria-label="상태"
      >
        {PROGRESS_TASK_STATUS_OPTIONS.map((status) => (
          <option key={status} value={status}>{PROGRESS_TASK_STATUS_LABEL[status]}</option>
        ))}
      </select>
      <input
        type="date"
        value={targetDate}
        onChange={e => setTargetDate(e.target.value)}
        className="bg-transparent border-0 focus:outline-none focus:bg-white/5 px-1 py-0.5 rounded text-text-secondary text-[11px]"
        aria-label="목표일자"
      />
      <div
        className={`inline-flex h-7 items-center justify-center rounded border px-2 text-[10px] font-bold ${targetDiffClass}`}
        title={`오늘 기준 목표일 차이: ${targetDiffDays}일`}
        aria-label="목표일 차이"
      >
        {targetDiffLabel}
      </div>
      <div className="min-w-0 overflow-hidden">
        <StageStepper
          stages={stagesOfCategory}
          currentStageId={task.currentStageId}
          onChange={handleStageClick}
        />
      </div>
      <div className="min-w-0">
        <PredecessorSelect
          value={task.predecessorId}
          taskId={task.id}
          allTasks={allTasks}
          stages={allStages}
          onChange={(pid) => update.mutate({ id: task.id, data: { predecessorId: pid } })}
        />
      </div>
      <div className="min-w-0 overflow-hidden">
        <AssigneeChips task={task} projectId={projectId} />
      </div>
      <div className="text-text-secondary text-[11px] truncate">{task.code}</div>
      </div>
      <ConfirmModal
        isOpen={showDeleteConfirm}
        title="DATA 삭제"
        message={`"${task.code ?? ""} ${task.name}" 항목을 삭제하시겠습니까?`}
        onConfirm={handleDelete}
        onCancel={() => setShowDeleteConfirm(false)}
        confirmText="삭제"
        cancelText="취소"
        variant="danger"
        isLoading={remove.isPending}
      />
      <ConfirmModal
        isOpen={!!pendingStageId}
        title="이전 단계 자동 완료"
        message={`선택한 단계 이전의 ${pendingPriorStages.length}개 단계를 모두 완료 처리합니다.\n계속하시겠습니까?`}
        onConfirm={handleConfirmStageChange}
        onCancel={() => setPendingStageId(null)}
        confirmText="예"
        cancelText="아니오"
        variant="info"
        isLoading={update.isPending || updateStageDetail.isPending}
      />
    </>
  );
}
