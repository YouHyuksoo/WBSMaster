/**
 * @file StageListRow.tsx
 * @description 단계 1행 — 이름 인라인 편집, 합치기 트리거, 삭제 confirm
 */
"use client";

import { useState, useEffect } from "react";
import { Icon, useToast, ConfirmModal } from "@/components/ui";
import { useUpdateStageDef, useDeleteStageDef } from "@/hooks";
import type { ProgressStageDef } from "@/lib/api";

interface Props {
  projectId: string;
  stage: ProgressStageDef;
  onRequestMerge: (sourceId: string) => void;
}

export function StageListRow({ projectId, stage, onRequestMerge }: Props) {
  const toast = useToast();
  const update = useUpdateStageDef(projectId);
  const remove = useDeleteStageDef(projectId);
  const [name, setName] = useState(stage.name);
  const [showConfirm, setShowConfirm] = useState(false);

  useEffect(() => setName(stage.name), [stage.name]);

  const handleSaveName = () => {
    const trimmed = name.trim();
    if (trimmed === stage.name || trimmed === "") return;
    update.mutate(
      { id: stage.id, data: { name: trimmed } },
      { onError: (err) => toast.error(err instanceof Error ? err.message : "이름 변경 실패") }
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

  return (
    <>
      <div className="flex items-center gap-2 px-3 py-2 border-b border-border dark:border-border-dark hover:bg-surface/30 dark:hover:bg-surface-dark/30 transition-colors">
        <span className="text-text-secondary text-xs w-6 text-right shrink-0">{stage.order + 1}.</span>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          onBlur={handleSaveName}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              (e.target as HTMLInputElement).blur();
            }
          }}
          className="flex-1 min-w-0 bg-transparent border-0 focus:outline-none focus:bg-white/5 px-2 py-1 rounded text-sm text-text dark:text-white"
          aria-label={`${stage.name} 이름 편집`}
        />
        <button
          type="button"
          onClick={() => onRequestMerge(stage.id)}
          className="px-2 py-1 text-xs text-primary hover:bg-primary/10 rounded transition-colors shrink-0"
          title="이 단계를 다른 단계로 합치기"
        >
          합치기→
        </button>
        <button
          type="button"
          onClick={() => setShowConfirm(true)}
          className="p-1 text-text-secondary hover:text-error hover:bg-error/10 rounded transition-colors shrink-0"
          title="삭제"
          aria-label={`${stage.name} 삭제`}
        >
          <Icon name="delete" size="xs" />
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
