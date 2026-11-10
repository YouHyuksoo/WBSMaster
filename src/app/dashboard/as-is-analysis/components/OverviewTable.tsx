/**
 * @file src/app/dashboard/as-is-analysis/components/OverviewTable.tsx
 * @description
 * AS-IS 총괄 업무 분류 체계 테이블 컴포넌트입니다.
 * 대분류 > 중분류 > 업무명 형태로 업무 목록을 표시합니다.
 *
 * 초보자 가이드:
 * 1. **OverviewGrid**: 공용 그리드의 분류·검색·정렬·페이지 이동
 * 2. **분석 버튼**: 해당 업무의 단위업무 분석으로 이동
 * 3. **편집 모달**: 기존 추가·수정·삭제 흐름 유지
 */

"use client";

import { useState } from "react";
import { OverviewGrid } from "./OverviewGrid";
import { Icon, Button } from "@/components/ui";
import { useAsIsOverview } from "../hooks/useAsIsOverview";
import { MAJOR_CATEGORIES } from "../constants";
import type { AsIsOverview, AsIsOverviewItem } from "../types";
import { AddItemModal } from "./AddItemModal";
import { EditItemModal } from "./EditItemModal";

interface OverviewTableProps {
  /** AS-IS 총괄 데이터 */
  overview?: AsIsOverview | null;
  /** 항목 목록 */
  items: AsIsOverviewItem[];
  /** 항목 선택 핸들러 (단위업무 분석용) */
  onSelectItem: (item: AsIsOverviewItem) => void;
  /** 현재 선택된 항목 (단위업무 분석용) */
  selectedItem: AsIsOverviewItem | null;
}

/**
 * 업무 분류 체계 테이블 컴포넌트
 */
export function OverviewTable({
  overview,
  items,
  onSelectItem,
  selectedItem,
}: OverviewTableProps) {
  const [showAddModal, setShowAddModal] = useState(false);
  const [editTarget, setEditTarget] = useState<AsIsOverviewItem | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AsIsOverviewItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  // 삭제 기능을 위해 훅 사용 (overview가 있을 때만)
  const { deleteItem } = useAsIsOverview(overview?.projectId);

  /**
   * 삭제 확인 핸들러
   */
  const handleConfirmDelete = () => {
    if (!deleteTarget) return;

    setIsDeleting(true);
    deleteItem(deleteTarget.id, {
      onSuccess: () => {
        setDeleteTarget(null);
      },
      onSettled: () => {
        setIsDeleting(false);
      },
    });
  };

  return (
    <div className="p-4 space-y-4">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon name="table_chart" size="sm" className="text-primary" />
          <h2 className="text-lg font-bold text-text dark:text-white">
            업무 분류 체계
          </h2>
          <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary">
            {items.length}개 업무
          </span>
        </div>
        <Button
          variant="primary"
          size="sm"
          leftIcon="add"
          onClick={() => setShowAddModal(true)}
        >
          업무 추가
        </Button>
      </div>

      {/* 테이블 */}
      <OverviewGrid items={items} selectedItem={selectedItem} onSelectItem={onSelectItem} onEdit={setEditTarget} onDelete={setDeleteTarget} />

      {/* 업무 추가 모달 */}
      {showAddModal && overview && (
        <AddItemModal
          overviewId={overview.id}
          projectId={overview.projectId}
          onClose={() => setShowAddModal(false)}
        />
      )}

      {/* 업무 수정 모달 */}
      {editTarget && overview && (
        <EditItemModal
          item={editTarget}
          projectId={overview.projectId}
          onClose={() => setEditTarget(null)}
        />
      )}

      {/* 삭제 확인 모달 */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* 오버레이 */}
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => !isDeleting && setDeleteTarget(null)}
          />

          {/* 모달 */}
          <div className="relative bg-background-white dark:bg-surface-dark rounded-xl shadow-xl w-full max-w-md mx-4">
            {/* 헤더 */}
            <div className="flex items-center gap-3 px-6 py-4 border-b border-border dark:border-border-dark">
              <div className="size-10 rounded-full bg-error/10 flex items-center justify-center">
                <Icon name="delete" size="sm" className="text-error" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-text dark:text-white">
                  업무 삭제
                </h2>
                <p className="text-sm text-text-secondary">
                  이 작업은 되돌릴 수 없습니다
                </p>
              </div>
            </div>

            {/* 본문 */}
            <div className="p-6">
              <p className="text-text dark:text-white mb-2">
                다음 업무를 삭제하시겠습니까?
              </p>
              <div className="p-3 bg-surface dark:bg-background-dark rounded-lg border border-border dark:border-border-dark">
                <p className="font-medium text-text dark:text-white">
                  {deleteTarget.taskName}
                </p>
                <p className="text-sm text-text-secondary mt-1">
                  {deleteTarget.middleCategory} · {MAJOR_CATEGORIES[deleteTarget.majorCategory]?.label}
                </p>
              </div>
              {deleteTarget.unitAnalysis && (
                <div className="mt-3 p-3 bg-warning/10 rounded-lg border border-warning/20">
                  <p className="text-sm text-warning flex items-center gap-2">
                    <Icon name="warning" size="xs" />
                    연결된 단위업무 분석 데이터도 함께 삭제됩니다
                  </p>
                </div>
              )}
            </div>

            {/* 푸터 */}
            <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-border dark:border-border-dark">
              <Button
                variant="outline"
                onClick={() => setDeleteTarget(null)}
                disabled={isDeleting}
              >
                취소
              </Button>
              <button
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-error hover:bg-error/90 text-white text-sm font-medium transition-colors disabled:opacity-50"
              >
                <Icon name={isDeleting ? "hourglass_empty" : "delete"} size="xs" />
                {isDeleting ? "삭제 중..." : "삭제"}
              </button>
            </div>
          </div>
        </div>
      )}


    </div>
  );
}
