/**
 * @file MergePanel.tsx
 * @description 단계 합치기 패널 — warning 배경 + 화살표 시각화
 *
 * 초보자 가이드:
 * 1. **source**: 흡수되어 삭제될 단계 (좌측 배지)
 * 2. **target**: 우측 select (같은 카테고리 후보)
 * 3. **실행 시**: task 이동 후 source 삭제, onClose
 */
"use client";

import { useState } from "react";
import { Button, Icon, useToast } from "@/components/ui";
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
    <div className="border-t-2 border-warning/40 bg-warning/[0.06] px-5 py-3 dark:bg-warning/[0.1]">
      <div className="flex items-start gap-2 mb-2">
        <Icon name="warning" size="sm" className="mt-0.5 text-warning" />
        <p className="text-xs text-text dark:text-white">
          <strong className="font-bold text-warning">단계 합치기</strong>
          <span className="ml-1">
            — <strong>&apos;{sourceStage.name}&apos;</strong> 의 task를 아래 단계로 이동하고
            이 단계를 <strong className="text-error">삭제</strong>합니다.
          </span>
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-1.5 rounded-md border border-warning/30 bg-warning/10 px-2.5 py-1.5 text-xs font-semibold text-warning">
          <Icon name="layers" size="xs" />
          {sourceStage.name}
        </span>
        <Icon name="arrow_forward" size="sm" className="text-text-secondary" />
        <select
          value={targetId}
          onChange={(e) => setTargetId(e.target.value)}
          aria-label="합칠 대상 단계"
          className="flex-1 min-w-[200px] rounded-md border border-border bg-background-white px-3 py-1.5 text-xs text-text
            focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary
            dark:border-border-dark dark:bg-surface-dark dark:text-white"
        >
          <option value="">합칠 대상 선택</option>
          {candidates.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
        <Button variant="primary" size="sm" leftIcon="call_merge" onClick={handleMerge} disabled={!targetId || merge.isPending} isLoading={merge.isPending}>
          실행
        </Button>
        <Button variant="ghost" size="sm" onClick={onClose}>취소</Button>
      </div>
    </div>
  );
}
