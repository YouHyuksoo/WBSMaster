/**
 * @file src/app/dashboard/weekly-report/components/ReportItemRow.tsx
 * @description
 * 주간보고 항목 행 컴포넌트입니다.
 * 각 업무 항목을 표시하고, 클릭 시 편집 모달을 열 수 있습니다.
 *
 * 초보자 가이드:
 * 1. **카테고리 표시**: 업무 구분을 컬러 태그로 표시
 * 2. **추가 업무 태그**: 계획에 없던 추가 업무 표시
 * 3. **진행률/완료 상태**: 전주 실적의 경우 진행률과 완료 상태 표시
 * 4. **편집/삭제**: 클릭으로 편집, 휴지통 아이콘으로 삭제
 */

"use client";

import React, { useState } from "react";
import { Icon, ConfirmModal } from "@/components/ui";
import { WeeklyReportItem } from "@/lib/api";
import { getCategoryInfo, formatShortDate } from "../constants";

interface ReportItemRowProps {
  /** 항목 데이터 */
  item: WeeklyReportItem;
  /** 편집 버튼 클릭 핸들러 */
  onEdit: () => void;
  /** 삭제 버튼 클릭 핸들러 */
  onDelete: () => void | Promise<void>;
  /** 완료 상태 인라인 토글 핸들러 */
  onToggleComplete?: (completed: boolean) => void;
  /** 진행률 표시 여부 (기본값: true) */
  showProgress?: boolean;
  /** 읽기 전용 모드 (다른 사람의 보고서 열람 시) */
  readOnly?: boolean;
}

/**
 * 주간보고 항목 행 컴포넌트
 * 클릭 시 편집 모달 열기, 삭제 버튼으로 삭제
 */
export function ReportItemRow({
  item,
  onEdit,
  onDelete,
  onToggleComplete,
  showProgress = true,
  readOnly = false,
}: ReportItemRowProps) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  return (
    <div
      className={`px-4 py-3 transition-colors ${readOnly ? "" : "hover:bg-muted/50 cursor-pointer group"}`}
      onClick={readOnly ? undefined : onEdit}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          {/* 카테고리 + 추가 태그 */}
          <div className="flex items-center gap-2 mb-1">
            <span
              className={`px-2 py-0.5 rounded text-xs font-medium ${
                getCategoryInfo(item.category).color
              }`}
            >
              {getCategoryInfo(item.category).label}
            </span>
            {item.isAdditional && (
              <span className="px-1.5 py-0.5 bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400 rounded text-[10px]">
                추가
              </span>
            )}
            {item.targetDate && (
              <span className="text-xs text-muted-foreground">
                {formatShortDate(item.targetDate)}
              </span>
            )}
            {/* 편집 힌트 아이콘 (읽기 전용일 때 숨김) */}
            {!readOnly && (
              <Icon
                name="edit"
                size="xs"
                className="text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity"
              />
            )}
          </div>
          {/* 제목 */}
          <div className="text-sm font-medium text-foreground">{item.title}</div>
          {/* 설명 */}
          {item.description && (
            <div className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
              {item.description}
            </div>
          )}
        </div>
        {/* 우측: 진행률 + 완료 + 삭제 */}
        <div className="flex items-center gap-3 flex-shrink-0">
          {showProgress && (
            <>
              <span className="text-sm font-medium text-foreground w-10 text-right">
                {item.progress}%
              </span>
              {!readOnly && onToggleComplete ? (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleComplete(!item.isCompleted);
                  }}
                  className="p-0.5 rounded hover:bg-muted transition-colors"
                  title={item.isCompleted ? "완료 해제" : "완료 처리"}
                >
                  {item.isCompleted ? (
                    <Icon name="check_circle" className="text-emerald-500" size="sm" />
                  ) : (
                    <Icon name="radio_button_unchecked" className="text-muted-foreground hover:text-emerald-400" size="sm" />
                  )}
                </button>
              ) : (
                item.isCompleted ? (
                  <Icon name="check_circle" className="text-emerald-500" size="sm" />
                ) : (
                  <Icon name="radio_button_unchecked" className="text-muted-foreground" size="sm" />
                )
              )}
            </>
          )}
          {!readOnly && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowDeleteConfirm(true);
              }}
              disabled={isDeleting}
              className={`p-1.5 rounded-md transition-all ${
                isDeleting
                  ? "bg-rose-100 dark:bg-rose-900/30"
                  : "hover:bg-rose-100 dark:hover:bg-rose-900/30 active:scale-90"
              }`}
              title="삭제"
            >
              {isDeleting ? (
                <Icon name="sync" size="sm" className="text-rose-500 animate-spin" />
              ) : (
                <Icon name="delete" size="sm" className="text-rose-400 hover:text-rose-600 dark:hover:text-rose-300 transition-colors" />
              )}
            </button>
          )}
        </div>
      </div>

      {/* 삭제 확인 모달 (클릭 버블링 차단) */}
      {/* eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions */}
      <div onClick={(e) => e.stopPropagation()}>
      <ConfirmModal
        isOpen={showDeleteConfirm}
        title="항목 삭제"
        message={`"${item.title}" 항목을 삭제하시겠습니까?`}
        confirmText="삭제"
        cancelText="취소"
        variant="danger"
        isLoading={isDeleting}
        onConfirm={async () => {
          setIsDeleting(true);
          try {
            await onDelete();
          } finally {
            setIsDeleting(false);
            setShowDeleteConfirm(false);
          }
        }}
        onCancel={() => setShowDeleteConfirm(false)}
      />
      </div>
    </div>
  );
}
