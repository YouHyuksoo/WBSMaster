/**
 * @file StageList.tsx
 * @description 카테고리의 단계 리스트 + 추가 폼
 *
 * 초보자 가이드:
 * 1. **stages**: order 순으로 정렬된 단계 목록
 * 2. **추가 폼**: 하단에 입력 + [+ 추가] 버튼
 * 3. **합치기**: onRequestMerge로 부모에게 위임 (MergePanel은 부모에서 렌더)
 */
"use client";

import { useState } from "react";
import { Icon, Button, Input, useToast } from "@/components/ui";
import { useCreateStageDef } from "@/hooks";
import type { ProgressStageDef } from "@/lib/api";
import { STAGE_CATEGORY_LABEL, type StageCategory } from "@/lib/stage-categories";
import { StageListRow } from "./StageListRow";

interface Props {
  projectId: string;
  category: StageCategory;
  stages: ProgressStageDef[];
  onRequestMerge: (sourceId: string) => void;
}

export function StageList({ projectId, category, stages, onRequestMerge }: Props) {
  const toast = useToast();
  const create = useCreateStageDef(projectId);
  const [newName, setNewName] = useState("");

  const handleAdd = async () => {
    const trimmed = newName.trim();
    if (!trimmed) return;
    try {
      await create.mutateAsync({ category, name: trimmed });
      setNewName("");
      toast.success(`'${trimmed}' 단계가 추가되었습니다.`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "추가 실패");
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="p-3 border-b border-border dark:border-border-dark">
        <h3 className="font-bold text-text dark:text-white">
          {STAGE_CATEGORY_LABEL[category]} 단계{" "}
          <span className="text-text-secondary text-sm font-normal">({stages.length})</span>
        </h3>
      </div>

      <div className="flex-1 overflow-y-auto">
        {stages.length === 0 ? (
          <div className="p-6 text-center text-text-secondary">
            <Icon name="layers_clear" size="xl" className="mb-3" />
            <p>이 카테고리에 등록된 단계가 없습니다.</p>
          </div>
        ) : (
          stages.map((s) => (
            <StageListRow
              key={s.id}
              projectId={projectId}
              stage={s}
              onRequestMerge={onRequestMerge}
            />
          ))
        )}
      </div>

      <div className="p-3 border-t border-border dark:border-border-dark flex gap-2">
        <Input
          placeholder="새 단계 이름"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleAdd()}
        />
        <Button variant="primary" onClick={handleAdd} disabled={!newName.trim() || create.isPending}>
          {create.isPending ? "추가 중..." : "+ 추가"}
        </Button>
      </div>
    </div>
  );
}
