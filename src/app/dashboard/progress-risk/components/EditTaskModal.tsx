"use client";

import { useState } from "react";
import { Button, Input, Modal } from "@/components/ui";
import { BUSINESS_UNITS } from "@/constants/business-units";
import { useUpdateProgressTask } from "@/hooks";
import type { ProgressTask } from "@/lib/api";
import { STAGE_CATEGORY_LABEL, STAGE_CATEGORY_ORDER, type StageCategory } from "@/lib/stage-categories";
import { StageDetailEditor } from "./StageDetailEditor";
import { PROGRESS_TASK_STATUS_LABEL, PROGRESS_TASK_STATUS_OPTIONS, type ProgressTaskStatus } from "./taskStatusOptions";

interface EditTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
  task: ProgressTask;
  allTasks: ProgressTask[];
}

export interface EditTaskDraft {
  name: string;
  businessUnit: string;
  category: string;
  description: string;
  targetDate: string;
  stageCategory: StageCategory;
  status: ProgressTaskStatus;
  predecessorId: string;
  isParallel: boolean;
}

export function buildEditTaskPayload(draft: EditTaskDraft): Partial<ProgressTask> {
  return {
    name: draft.name.trim(),
    businessUnit: draft.businessUnit || null,
    category: draft.category || null,
    description: draft.description.trim() || null,
    endDate: draft.targetDate,
    stageCategory: draft.stageCategory,
    status: draft.status,
    predecessorId: draft.predecessorId || null,
    isParallel: draft.isParallel,
  };
}

function getInitialDraft(task: ProgressTask): EditTaskDraft {
  return {
    name: task.name,
    businessUnit: task.businessUnit ?? "",
    category: task.category ?? "",
    description: task.description ?? "",
    targetDate: task.endDate.slice(0, 10),
    stageCategory: task.stageCategory,
    status: task.status,
    predecessorId: task.predecessorId ?? "",
    isParallel: task.isParallel,
  };
}

export function EditTaskModal({ isOpen, onClose, projectId, task, allTasks }: EditTaskModalProps) {
  if (!isOpen) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="그리드 행 수정" size="lg" closeOnOverlayClick={false}>
      <EditTaskPanel projectId={projectId} task={task} allTasks={allTasks} onClose={onClose} layout="modal" />
    </Modal>
  );
}

export function EditTaskPanel({
  projectId,
  task,
  allTasks,
  onClose,
  layout = "panel",
}: {
  projectId: string;
  task: ProgressTask;
  allTasks: ProgressTask[];
  onClose: () => void;
  layout?: "modal" | "panel";
}) {
  const update = useUpdateProgressTask(projectId);
  const [draft, setDraft] = useState<EditTaskDraft>(() => getInitialDraft(task));

  const set = (patch: Partial<EditTaskDraft>) => {
    setDraft((current) => ({ ...current, ...patch }));
  };

  const handleSave = async () => {
    if (!draft.name.trim() || !draft.targetDate || update.isPending) return;

    try {
      await update.mutateAsync({
        id: task.id,
        data: buildEditTaskPayload(draft),
      });
      onClose();
    } catch {
      // useUpdateProgressTask에서 오류 토스트를 표시한다.
    }
  };

  const predecessorOptions = allTasks.filter((candidate) => candidate.id !== task.id);
  const primaryGridClass = layout === "modal" ? "grid gap-3 md:grid-cols-[1fr_150px]" : "grid gap-3";
  const tripleGridClass = layout === "modal" ? "grid gap-3 md:grid-cols-3" : "grid gap-3";
  const doubleGridClass = layout === "modal" ? "grid gap-3 md:grid-cols-[1fr_1fr]" : "grid gap-3";

  return (
    <>
      <div className="space-y-3">
        <div className={primaryGridClass}>
          <Field label="기능명" required>
            <Input
              value={draft.name}
              onChange={(event) => set({ name: event.target.value })}
              autoFocus
            />
          </Field>
          <Field label="목표일자" required>
            <Input
              type="date"
              value={draft.targetDate}
              onChange={(event) => set({ targetDate: event.target.value })}
            />
          </Field>
        </div>

        <div className={tripleGridClass}>
          <Field label="사업부">
            <select
              value={draft.businessUnit}
              onChange={(event) => set({ businessUnit: event.target.value })}
              className="h-10 w-full rounded-lg border border-border bg-background-white px-3 text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary dark:border-border-dark dark:bg-surface-dark dark:text-white"
            >
              <option value="">(미지정)</option>
              {BUSINESS_UNITS.map((unit) => (
                <option key={unit} value={unit}>{unit}</option>
              ))}
            </select>
          </Field>
          <Field label="카테고리">
            <select
              value={draft.stageCategory}
              onChange={(event) => set({ stageCategory: event.target.value as StageCategory })}
              className="h-10 w-full rounded-lg border border-border bg-background-white px-3 text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary dark:border-border-dark dark:bg-surface-dark dark:text-white"
            >
              {STAGE_CATEGORY_ORDER.map((category) => (
                <option key={category} value={category}>{STAGE_CATEGORY_LABEL[category]}</option>
              ))}
            </select>
          </Field>
          <Field label="상태">
            <select
              value={draft.status}
              onChange={(event) => set({ status: event.target.value as ProgressTaskStatus })}
              className="h-10 w-full rounded-lg border border-border bg-background-white px-3 text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary dark:border-border-dark dark:bg-surface-dark dark:text-white"
            >
              {PROGRESS_TASK_STATUS_OPTIONS.map((status) => (
                <option key={status} value={status}>{PROGRESS_TASK_STATUS_LABEL[status]}</option>
              ))}
            </select>
          </Field>
        </div>

        <div className={doubleGridClass}>
          <Field label="대분류">
            <Input
              value={draft.category}
              onChange={(event) => set({ category: event.target.value })}
              placeholder="예: 기준관리"
            />
          </Field>
          <Field label="선행 task">
            <select
              value={draft.predecessorId}
              onChange={(event) => set({ predecessorId: event.target.value })}
              className="h-10 w-full rounded-lg border border-border bg-background-white px-3 text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary dark:border-border-dark dark:bg-surface-dark dark:text-white"
            >
              <option value="">(없음)</option>
              {predecessorOptions.map((candidate) => (
                <option key={candidate.id} value={candidate.id}>
                  {candidate.code} {candidate.name}
                </option>
              ))}
            </select>
          </Field>
        </div>

        <Field label="비고">
          <textarea
            value={draft.description}
            onChange={(event) => set({ description: event.target.value })}
            rows={3}
            className="w-full resize-none rounded-lg border border-border bg-background-white px-3 py-2 text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary dark:border-border-dark dark:bg-surface-dark dark:text-white"
          />
        </Field>

        <div>
          <span className="mb-1 block text-xs font-semibold text-text dark:text-white">진행 방식</span>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => set({ isParallel: true })}
              className={`rounded-lg border px-3 py-2 text-sm transition-colors ${
                draft.isParallel
                  ? "border-success/40 bg-success/15 text-success"
                  : "border-border bg-background-white text-text-secondary dark:border-border-dark dark:bg-surface-dark"
              }`}
            >
              병렬
            </button>
            <button
              type="button"
              onClick={() => set({ isParallel: false })}
              className={`rounded-lg border px-3 py-2 text-sm transition-colors ${
                !draft.isParallel
                  ? "border-warning/40 bg-warning/15 text-warning"
                  : "border-border bg-background-white text-text-secondary dark:border-border-dark dark:bg-surface-dark"
              }`}
            >
              순차
            </button>
          </div>
        </div>

        <StageDetailEditor
          projectId={projectId}
          taskId={task.id}
          stageCategory={draft.stageCategory}
        />
      </div>

      <div className="mt-5 flex justify-end gap-2">
        <Button variant="outline" onClick={onClose} disabled={update.isPending}>취소</Button>
        <Button
          variant="primary"
          onClick={handleSave}
          disabled={!draft.name.trim() || !draft.targetDate || update.isPending}
          isLoading={update.isPending}
        >
          {update.isPending ? "저장 중..." : "저장"}
        </Button>
      </div>
    </>
  );
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-semibold text-text dark:text-white">
        {label} {required && <span className="text-error">*</span>}
      </span>
      {children}
    </label>
  );
}
