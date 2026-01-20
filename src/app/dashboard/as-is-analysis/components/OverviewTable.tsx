/**
 * @file src/app/dashboard/as-is-analysis/components/OverviewTable.tsx
 * @description
 * AS-IS 총괄 업무 분류 체계 테이블 컴포넌트입니다.
 * 대분류 > 중분류 > 업무명 형태로 업무 목록을 표시합니다.
 *
 * 초보자 가이드:
 * 1. **Grid 레이아웃**: 대분류, 중분류, 업무명, 현행방식, 이슈요약 컬럼
 * 2. **행 클릭**: 해당 업무의 단위업무 분석으로 이동
 * 3. **인라인 편집**: 각 필드 수정 가능
 */

"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { Icon, Button } from "@/components/ui";
import { useAsIsOverview } from "../hooks/useAsIsOverview";
import { MAJOR_CATEGORIES, CURRENT_METHODS } from "../constants";
import type { AsIsOverview, AsIsOverviewItem, AsIsMajorCategory } from "../types";
import { AddItemModal } from "./AddItemModal";
import { EditItemModal } from "./EditItemModal";

/**
 * 툴팁 위치 정보 타입
 */
interface TooltipPosition {
  x: number;
  y: number;
}

interface OverviewTableProps {
  /** AS-IS 총괄 데이터 */
  overview?: AsIsOverview | null;
  /** 항목 목록 */
  items: AsIsOverviewItem[];
  /** 항목 선택 핸들러 (단위업무 분석용) */
  onSelectItem: (item: AsIsOverviewItem) => void;
  /** 현재 선택된 항목 (단위업무 분석용) */
  selectedItem: AsIsOverviewItem | null;
  /** 체크된 항목 ID 목록 (복사용) */
  checkedItemIds?: Set<string>;
  /** 체크 상태 변경 핸들러 */
  onCheckedItemsChange?: (ids: Set<string>) => void;
}

/**
 * 업무 분류 체계 테이블 컴포넌트
 */
export function OverviewTable({
  overview,
  items,
  onSelectItem,
  selectedItem,
  checkedItemIds = new Set(),
  onCheckedItemsChange,
}: OverviewTableProps) {
  const [showAddModal, setShowAddModal] = useState(false);
  const [editTarget, setEditTarget] = useState<AsIsOverviewItem | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AsIsOverviewItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  // 호버 상태: itemId + field + 내용 + 위치 조합으로 관리
  const [tooltip, setTooltip] = useState<{
    itemId: string;
    field: "details" | "issue";
    content: string;
    position: TooltipPosition;
  } | null>(null);

  /**
   * 툴팁 표시 핸들러
   */
  const handleShowTooltip = (
    e: React.MouseEvent,
    itemId: string,
    field: "details" | "issue",
    content: string | null | undefined
  ) => {
    if (!content) return;

    const rect = e.currentTarget.getBoundingClientRect();
    setTooltip({
      itemId,
      field,
      content,
      position: {
        x: rect.left,
        y: rect.top - 8, // 셀 위에 표시
      },
    });
  };

  /**
   * 툴팁 숨기기 핸들러
   */
  const handleHideTooltip = () => {
    setTooltip(null);
  };

  // 삭제 기능을 위해 훅 사용 (overview가 있을 때만)
  const { deleteItem } = useAsIsOverview(
    overview?.projectId,
    overview?.businessUnit
  );

  /**
   * 수정 버튼 클릭 - 모달 열기
   */
  const handleEditClick = (e: React.MouseEvent, item: AsIsOverviewItem) => {
    e.stopPropagation(); // 행 클릭 이벤트 방지
    setEditTarget(item);
  };

  /**
   * 삭제 버튼 클릭 - 모달 열기
   */
  const handleDeleteClick = (e: React.MouseEvent, item: AsIsOverviewItem) => {
    e.stopPropagation(); // 행 클릭 이벤트 방지
    setDeleteTarget(item);
  };

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

  // 대분류별 그룹핑
  const groupedItems = items.reduce((acc, item) => {
    const category = item.majorCategory;
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(item);
    return acc;
  }, {} as Record<AsIsMajorCategory, AsIsOverviewItem[]>);

  // 전체 선택 여부
  const isAllChecked = items.length > 0 && checkedItemIds.size === items.length;
  const isIndeterminate = checkedItemIds.size > 0 && checkedItemIds.size < items.length;

  /**
   * 전체 선택/해제 핸들러
   */
  const handleSelectAll = () => {
    if (!onCheckedItemsChange) return;

    if (isAllChecked) {
      // 전체 해제
      onCheckedItemsChange(new Set());
    } else {
      // 전체 선택
      onCheckedItemsChange(new Set(items.map((item) => item.id)));
    }
  };

  /**
   * 개별 항목 체크 핸들러
   */
  const handleCheckItem = (itemId: string, checked: boolean) => {
    if (!onCheckedItemsChange) return;

    const newCheckedIds = new Set(checkedItemIds);
    if (checked) {
      newCheckedIds.add(itemId);
    } else {
      newCheckedIds.delete(itemId);
    }
    onCheckedItemsChange(newCheckedIds);
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
      <div className="bg-background-white dark:bg-surface-dark border border-border dark:border-border-dark rounded-xl overflow-hidden">
        {/* 테이블 헤더 */}
        <div
          className="grid gap-2 px-4 py-3 bg-surface dark:bg-background-dark border-b border-border dark:border-border-dark text-xs font-semibold text-text-secondary uppercase"
          style={{ gridTemplateColumns: "32px 100px 120px 150px 1fr 100px 150px 1fr 40px 40px 40px" }}
        >
          {/* 전체 선택 체크박스 */}
          <div className="flex items-center justify-center">
            {onCheckedItemsChange && (
              <label className="relative flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={isAllChecked}
                  ref={(el) => {
                    if (el) el.indeterminate = isIndeterminate;
                  }}
                  onChange={handleSelectAll}
                  className="peer sr-only"
                />
                <div className={`size-4 rounded border-2 flex items-center justify-center transition-colors ${
                  isAllChecked || isIndeterminate
                    ? "bg-primary border-primary"
                    : "border-border dark:border-border-dark hover:border-primary/50"
                }`}>
                  {isAllChecked && (
                    <Icon name="check" size="xs" className="text-white" />
                  )}
                  {isIndeterminate && (
                    <div className="w-2 h-0.5 bg-white rounded" />
                  )}
                </div>
              </label>
            )}
          </div>
          <div>관리번호</div>
          <div>대분류</div>
          <div>중분류</div>
          <div>업무명</div>
          <div>현행방식</div>
          <div>세부내용</div>
          <div>이슈 요약</div>
          <div className="text-center">분석</div>
          <div className="text-center">수정</div>
          <div className="text-center">삭제</div>
        </div>

        {/* 빈 목록 */}
        {items.length === 0 && (
          <div className="p-8 text-center">
            <Icon name="inbox" size="xl" className="text-text-secondary mb-4" />
            <p className="text-text-secondary">등록된 업무가 없습니다.</p>
            <p className="text-text-secondary text-sm mt-1">
              &apos;업무 추가&apos; 버튼을 클릭하여 업무를 등록하세요.
            </p>
          </div>
        )}

        {/* 업무 목록 */}
        {Object.entries(groupedItems).map(([category, categoryItems]) => {
          const config = MAJOR_CATEGORIES[category as AsIsMajorCategory];
          return (
            <div key={category}>
              {categoryItems.map((item, index) => {
                const methodConfig = CURRENT_METHODS[item.currentMethod];
                const isSelected = selectedItem?.id === item.id;
                const hasAnalysis = !!item.unitAnalysis;

                return (
                  <div
                    key={item.id}
                    className={`grid gap-2 px-4 py-3 border-b border-border dark:border-border-dark transition-colors items-center ${
                      isSelected
                        ? "bg-primary/5 border-l-2 border-l-primary"
                        : checkedItemIds.has(item.id)
                        ? "bg-primary/5"
                        : "hover:bg-surface dark:hover:bg-background-dark"
                    }`}
                    style={{ gridTemplateColumns: "32px 100px 120px 150px 1fr 100px 150px 1fr 40px 40px 40px" }}
                  >
                    {/* 체크박스 */}
                    <div className="flex items-center justify-center">
                      {onCheckedItemsChange && (
                        <label className="relative flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={checkedItemIds.has(item.id)}
                            onChange={(e) => handleCheckItem(item.id, e.target.checked)}
                            onClick={(e) => e.stopPropagation()}
                            className="peer sr-only"
                          />
                          <div className={`size-4 rounded border-2 flex items-center justify-center transition-colors ${
                            checkedItemIds.has(item.id)
                              ? "bg-primary border-primary"
                              : "border-border dark:border-border-dark hover:border-primary/50"
                          }`}>
                            {checkedItemIds.has(item.id) && (
                              <Icon name="check" size="xs" className="text-white" />
                            )}
                          </div>
                        </label>
                      )}
                    </div>

                    {/* AS-IS 관리번호 */}
                    <div className="text-xs font-mono text-primary">
                      {item.asIsManagementNo || "-"}
                    </div>

                    {/* 대분류 */}
                    {index === 0 ? (
                      <div className={`flex items-center gap-1.5 px-2 py-1 rounded-md ${config.bgColor}`}>
                        <Icon name={config.icon} size="xs" className={config.color} />
                        <span className={`text-xs font-medium ${config.color}`}>
                          {config.label}
                        </span>
                      </div>
                    ) : (
                      <div />
                    )}

                    {/* 중분류 */}
                    <div className="text-sm text-text dark:text-white">
                      {item.middleCategory}
                    </div>

                    {/* 업무명 */}
                    <div className="text-sm font-medium text-text dark:text-white">
                      {item.taskName}
                    </div>

                    {/* 현행방식 */}
                    <div className={`flex items-center gap-1 px-2 py-1 rounded-md ${methodConfig.bgColor} w-fit`}>
                      <Icon name={methodConfig.icon} size="xs" className={methodConfig.color} />
                      <span className={`text-xs font-medium ${methodConfig.color}`}>
                        {methodConfig.label}
                      </span>
                    </div>

                    {/* 세부내용 (툴팁 포함) */}
                    <div
                      className="text-xs text-text-secondary line-clamp-2 cursor-help"
                      onMouseEnter={(e) => handleShowTooltip(e, item.id, "details", item.details)}
                      onMouseLeave={handleHideTooltip}
                    >
                      {item.details || "-"}
                    </div>

                    {/* 이슈 요약 (툴팁 포함) */}
                    <div
                      className="text-xs text-text-secondary line-clamp-2 cursor-help"
                      onMouseEnter={(e) => handleShowTooltip(e, item.id, "issue", item.issueSummary)}
                      onMouseLeave={handleHideTooltip}
                    >
                      {item.issueSummary || "-"}
                    </div>

                    {/* 분석 버튼 */}
                    <div className="flex justify-center">
                      <button
                        onClick={() => onSelectItem(item)}
                        className={`size-6 rounded-full flex items-center justify-center transition-colors ${
                          hasAnalysis
                            ? "bg-success/10 hover:bg-success/20"
                            : "bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700"
                        }`}
                        title="단위업무 분석"
                      >
                        <Icon
                          name={hasAnalysis ? "check" : "arrow_forward"}
                          size="xs"
                          className={hasAnalysis ? "text-success" : "text-text-secondary"}
                        />
                      </button>
                    </div>

                    {/* 수정 버튼 */}
                    <div className="flex justify-center">
                      <button
                        onClick={(e) => handleEditClick(e, item)}
                        className="size-6 rounded-full bg-primary/10 hover:bg-primary/20 flex items-center justify-center transition-colors"
                        title="수정"
                      >
                        <Icon name="edit" size="xs" className="text-primary" />
                      </button>
                    </div>

                    {/* 삭제 버튼 */}
                    <div className="flex justify-center">
                      <button
                        onClick={(e) => handleDeleteClick(e, item)}
                        className="size-6 rounded-full bg-error/10 hover:bg-error/20 flex items-center justify-center transition-colors"
                        title="삭제"
                      >
                        <Icon name="delete" size="xs" className="text-error" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>

      {/* 업무 추가 모달 */}
      {showAddModal && overview && (
        <AddItemModal
          overviewId={overview.id}
          projectId={overview.projectId}
          businessUnit={overview.businessUnit}
          onClose={() => setShowAddModal(false)}
        />
      )}

      {/* 업무 수정 모달 */}
      {editTarget && overview && (
        <EditItemModal
          item={editTarget}
          projectId={overview.projectId}
          businessUnit={overview.businessUnit}
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

      {/* 툴팁 (Portal로 body에 렌더링) */}
      {tooltip && typeof document !== "undefined" &&
        createPortal(
          <div
            className="fixed z-[9999] max-w-md pointer-events-none"
            style={{
              left: tooltip.position.x,
              top: tooltip.position.y,
              transform: "translateY(-100%)",
            }}
          >
            <div className="bg-slate-800 dark:bg-slate-900 text-white text-xs rounded-lg shadow-xl p-3 border border-slate-700">
              <div className={`font-semibold mb-1 ${tooltip.field === "details" ? "text-primary" : "text-warning"}`}>
                {tooltip.field === "details" ? "세부내용" : "이슈 요약"}
              </div>
              <div className="whitespace-pre-wrap max-h-60 overflow-y-auto">
                {tooltip.content}
              </div>
            </div>
            {/* 화살표 */}
            <div className="absolute left-4 -bottom-1 w-2 h-2 bg-slate-800 dark:bg-slate-900 border-r border-b border-slate-700 transform rotate-45" />
          </div>,
          document.body
        )
      }
    </div>
  );
}
