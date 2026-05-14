/**
 * @file StageManagerModal/index.tsx
 * @description 단계 관리 모달 — 좌측 카테고리 탭 + 우측 단계 리스트
 *
 * 초보자 가이드:
 * 1. **모달 진입점**: PageHeader의 [단계 관리] 버튼이 isOpen 토글
 * 2. **선택 상태**: selectedCategory(StageCategory)
 * 3. **단계 리스트**: 다음 task(22)에서 StageList 컴포넌트로 구현
 */
"use client";

import { useState } from "react";
import { Modal } from "@/components/ui";
import { useStageDefs } from "@/hooks";
import { STAGE_CATEGORY_LABEL, type StageCategory } from "@/lib/stage-categories";
import { CategoryTabs } from "./CategoryTabs";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
}

export function StageManagerModal({ isOpen, onClose, projectId }: Props) {
  const [selectedCategory, setSelectedCategory] = useState<StageCategory>("MES_SYSTEM");
  const { data: allStages = [], isLoading } = useStageDefs(projectId);

  const stagesOfCategory = allStages
    .filter((s) => s.category === selectedCategory)
    .sort((a, b) => a.order - b.order);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="단계 관리" size="full">
      <div className="flex h-[60vh] -mx-6 -mb-6 border-t border-border dark:border-border-dark">
        <CategoryTabs selected={selectedCategory} onSelect={setSelectedCategory} allStages={allStages} />
        <div className="flex-1 overflow-hidden flex flex-col">
          {isLoading ? (
            <div className="p-6 text-center text-text-secondary">로딩 중...</div>
          ) : (
            <div className="flex-1 overflow-y-auto p-4">
              <h3 className="font-bold text-text dark:text-white mb-3">
                {STAGE_CATEGORY_LABEL[selectedCategory]} 단계{" "}
                <span className="text-text-secondary text-sm font-normal">({stagesOfCategory.length})</span>
              </h3>
              <div className="text-xs text-text-secondary">
                단계 리스트는 다음 작업에서 추가됩니다.
              </div>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}
