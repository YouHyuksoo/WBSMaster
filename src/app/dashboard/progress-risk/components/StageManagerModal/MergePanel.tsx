/**
 * @file MergePanel.tsx
 * @description 단계 합치기 패널 — source 단계의 task를 target으로 이동 후 source 삭제
 *
 * 초보자 가이드:
 * 1. **source**: 흡수되어 삭제될 단계
 * 2. **candidates**: target 후보 (source 제외, 같은 카테고리)
 * 3. **실행 후 onClose**로 패널 닫힘
 */
"use client";

import { useState } from "react";
import { Button, useToast } from "@/components/ui";
import { useMergeStageDef } from "@/hooks";
import type { ProgressStageDef } from "@/lib/api";

interface Props {
  projectId: string;
  sourceStage: ProgressStageDef;
  candidates: ProgressStageDef[];
  onClose: () => void;
}

export function MergePanel({ projectId, sourceStage, candidates, onClose }: Props) {
  const toast = useToast();
  const merge = useMergeStageDef(projectId);
  const [targetId, setTargetId] = useState<string>("");

  const handleMerge = async () => {
    if (!targetId) return;
    try {
      const result = await merge.mutateAsync({ sourceId: sourceStage.id, targetStageId: targetId });
      toast.success(`'${sourceStage.name}' 단계를 합쳤습니다 (task ${result.movedTaskCount}개 이동).`);
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "합치기 실패");
    }
  };

  return (
    <div className="border-t border-border dark:border-border-dark bg-amber-500/5 p-3 space-y-2">
      <p className="text-xs text-text dark:text-white">
        <strong>&apos;{sourceStage.name}&apos;</strong> 단계의 task를 다른 단계로 이동 후 이 단계를 삭제합니다.
      </p>
      <div className="flex items-center gap-2">
        <span className="text-xs text-text-secondary">→</span>
        <select
          value={targetId}
          onChange={(e) => setTargetId(e.target.value)}
          className="flex-1 px-2 py-1.5 rounded bg-surface dark:bg-surface-dark border border-border dark:border-border-dark text-sm text-text dark:text-white"
        >
          <option value="">합칠 대상 선택</option>
          {candidates.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
        <Button variant="primary" size="sm" onClick={handleMerge} disabled={!targetId || merge.isPending}>
          {merge.isPending ? "처리 중..." : "실행"}
        </Button>
        <Button variant="ghost" size="sm" onClick={onClose}>취소</Button>
      </div>
    </div>
  );
}
