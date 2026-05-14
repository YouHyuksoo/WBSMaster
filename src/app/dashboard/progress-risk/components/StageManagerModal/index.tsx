/**
 * @file StageManagerModal/index.tsx
 * @description 단계 관리 모달 — 좌측 카테고리 탭 + 우측 단계 리스트
 *
 * 초보자 가이드:
 * 1. **모달 진입점**: PageHeader의 [단계 관리] 버튼이 isOpen 토글
 * 2. **선택 상태**: selectedCategory(StageCategory)
 * 3. **mergeSourceId**: 합치기 요청된 sourceId (MergePanel은 Task 23에서 추가)
 */
"use client";

import { useState } from "react";
import { Modal } from "@/components/ui";
import { useStageDefs } from "@/hooks";
import { type StageCategory } from "@/lib/stage-categories";
import { CategoryTabs } from "./CategoryTabs";
import { StageList } from "./StageList";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
}

export function StageManagerModal({ isOpen, onClose, projectId }: Props) {
  const [selectedCategory, setSelectedCategory] = useState<StageCategory>("MES_SYSTEM");
  const [mergeSourceId, setMergeSourceId] = useState<string | null>(null);
  const { data: allStages = [], isLoading } = useStageDefs(projectId);

  const stagesOfCategory = allStages
    .filter((s) => s.category === selectedCategory)
    .sort((a, b) => a.order - b.order);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="단계 관리" size="full">
      <div className="flex h-[60vh] -mx-6 -mb-6 border-t border-border dark:border-border-dark">
        <CategoryTabs selected={selectedCategory} onSelect={setSelectedCategory} allStages={allStages} />
        <div className="flex-1 overflow-hidden">
          {isLoading ? (
            <div className="p-6 text-center text-text-secondary">로딩 중...</div>
          ) : (
            <StageList
              projectId={projectId}
              category={selectedCategory}
              stages={stagesOfCategory}
              onRequestMerge={(sourceId) => setMergeSourceId(sourceId)}
            />
          )}
        </div>
      </div>
      {/* MergePanel은 Task 23에서 추가 */}
    </Modal>
  );
}
