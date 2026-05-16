/**
 * @file StageListRow.tsx
 * @description 단계 1행 — 순서 원형 배지 / 이동 그룹 / 이름 인라인 편집 / 작업대상 컬러 강조 / 합치기/삭제
 *
 * 초보자 가이드:
 * 1. **순서 원형 배지**: 1자리/2자리 가운데 정렬, primary 컬러
 * 2. **이동 버튼**: 상하 묶음(그룹), 비활성 시 흐리게
 * 3. **작업대상**: 0건은 흐림, 1+ 건은 info 컬러 배지로 강조
 * 4. **합치기**: warning 컬러 (병합은 데이터 이동 — 주의 액션)
 * 5. **삭제**: error 컬러 + confirm modal
 */
"use client";

import { useState } from "react";
import { Icon, useToast, ConfirmModal } from "@/components/ui";
import { useUpdateStageDef, useDeleteStageDef } from "@/hooks";
import type { ProgressStageDef } from "@/lib/api";

interface Props {
  projectId: string;
  stage: ProgressStageDef;
  previousStage?: ProgressStageDef;
  nextStage?: ProgressStageDef;
  taskCount: number;
  onRequestMerge: (sourceId: string) => void;
}

const MOVE_BTN =
  "inline-flex size-7 items-center justify-center rounded-md border border-border bg-background-white text-text-secondary " +
  "transition-all hover:border-primary hover:bg-primary/10 hover:text-primary " +
  "disabled:opacity-30 disabled:hover:border-border disabled:hover:bg-background-white disabled:hover:text-text-secondary " +
  "dark:border-border-dark dark:bg-surface-dark dark:disabled:hover:bg-surface-dark";

const ACTION_BTN_BASE =
  "inline-flex size-8 items-center justify-center justify-self-center rounded-md transition-all";

export function StageListRow({ projectId, stage, previousStage, nextStage, taskCount, onRequestMerge }: Props) {
  const toast = useToast();
  const update = useUpdateStageDef(projectId);
  const remove = useDeleteStageDef(projectId);
  const [name, setName] = useState(stage.name);
  const [showConfirm, setShowConfirm] = useState(false);

  const handleSaveName = () => {
    const trimmed = name.trim();
    if (trimmed === stage.name || trimmed === "") return;
    update.mutate(
      { id: stage.id, data: { name: trimmed } },
      { onError: (err) => toast.error(err instanceof Error ? err.message : "이름 변경 실패") }
    );
  };

  const handleMove = (target: ProgressStageDef, label: string) => {
    update.mutate(
      { id: stage.id, data: { order: target.order } },
      {
        onSuccess: () => toast.success(`'${stage.name}' 단계를 ${label} 이동했습니다.`),
        onError: (err) => toast.error(err instanceof Error ? err.message : "순서 변경 실패"),
      }
    );
  };

  const handleDelete = async () => {
    try {
      await remove.mutateAsync(stage.id);
      toast.success(`'${stage.name}' 단계가 삭제되었습니다.`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "삭제 실패");
    } finally {
      setShowConfirm(false);
    }
  };

  const hasTasks = taskCount > 0;

  return (
    <>
      <div className="group grid grid-cols-[48px_72px_minmax(220px,1fr)_96px_44px_36px] items-center gap-2 rounded-lg px-3 py-2 transition-colors hover:bg-primary/[0.04] dark:hover:bg-primary/[0.06]">
        <span
          className="mx-auto inline-flex size-7 items-center justify-center rounded-full bg-primary/10 text-[11px] font-bold text-primary tabular-nums"
          aria-label={`순서 ${stage.order + 1}`}
        >
          {stage.order + 1}
        </span>

        <div className="flex justify-center gap-1">
          <button
            type="button"
            onClick={() => previousStage && handleMove(previousStage, "위로")}
            disabled={!previousStage || update.isPending}
            className={MOVE_BTN}
            title="위로 이동"
            aria-label={`${stage.name} 위로 이동`}
          >
            <Icon name="arrow_upward" size="xs" />
          </button>
          <button
            type="button"
            onClick={() => nextStage && handleMove(nextStage, "아래로")}
            disabled={!nextStage || update.isPending}
            className={MOVE_BTN}
            title="아래로 이동"
            aria-label={`${stage.name} 아래로 이동`}
          >
            <Icon name="arrow_downward" size="xs" />
          </button>
        </div>

        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          onBlur={handleSaveName}
          onKeyDown={(e) => {
            if (e.key === "Enter") (e.target as HTMLInputElement).blur();
            else if (e.key === "Escape") {
              setName(stage.name);
              (e.target as HTMLInputElement).blur();
            }
          }}
          disabled={update.isPending}
          className="h-9 min-w-0 rounded-md border border-transparent bg-transparent px-2.5 text-xs text-text
            transition-all hover:border-border hover:bg-surface focus:border-primary focus:bg-background-white focus:outline-none focus:ring-2 focus:ring-primary/30
            disabled:opacity-50
            dark:text-white dark:hover:border-border-dark dark:hover:bg-background-dark dark:focus:bg-surface-dark"
          aria-label={`${stage.name} 이름 편집`}
          placeholder="단계명"
        />

        <span
          className={`inline-flex h-7 items-center justify-center gap-1 rounded-full px-2.5 text-[11px] font-semibold tabular-nums ${
            hasTasks
              ? "bg-info/10 text-info"
              : "bg-surface text-text-secondary opacity-60 dark:bg-background-dark"
          }`}
          title={`${stage.name} 단계 작업대상 ${taskCount}건`}
        >
          {hasTasks && <Icon name="assignment" size="xs" />}
          {taskCount}건
        </span>

        <button
          type="button"
          onClick={() => onRequestMerge(stage.id)}
          className={`${ACTION_BTN_BASE} text-warning hover:bg-warning/15`}
          title="이 단계를 다른 단계로 합치기"
          aria-label={`${stage.name} 합치기`}
        >
          <Icon name="call_merge" size="sm" />
        </button>
        <button
          type="button"
          onClick={() => setShowConfirm(true)}
          className={`${ACTION_BTN_BASE} text-text-secondary hover:bg-error/10 hover:text-error`}
          title="삭제"
          aria-label={`${stage.name} 삭제`}
        >
          <Icon name="delete" size="sm" />
        </button>
      </div>

      <ConfirmModal
        isOpen={showConfirm}
        title="단계 삭제"
        message={`"${stage.name}" 단계를 삭제하시겠습니까?\n이 단계를 쓰는 task의 진도가 초기화됩니다.`}
        onConfirm={handleDelete}
        onCancel={() => setShowConfirm(false)}
        confirmText="삭제"
        cancelText="취소"
        variant="danger"
        isLoading={remove.isPending}
      />
    </>
  );
}
