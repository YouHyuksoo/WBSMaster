/**
 * @file src/app/dashboard/as-is-analysis/components/EditItemModal.tsx
 * @description
 * 업무 항목 수정 모달 컴포넌트입니다.
 * 기존 항목의 대분류, 중분류, 업무명, 현행방식, 이슈요약을 수정합니다.
 *
 * 초보자 가이드:
 * 1. **초기값 설정**: item prop의 데이터로 폼 초기화
 * 2. **수정 저장**: updateItem mutation으로 변경사항 저장
 * 3. **유효성 검사**: 중분류와 업무명 필수 확인
 */

"use client";

import { useState } from "react";
import { Icon, Button, Input } from "@/components/ui";
import { useAsIsOverview } from "../hooks/useAsIsOverview";
import { MAJOR_CATEGORY_OPTIONS, CURRENT_METHOD_OPTIONS } from "../constants";
import type { AsIsMajorCategory, AsIsCurrentMethod, AsIsOverviewItem } from "../types";

interface EditItemModalProps {
  /** 수정할 항목 */
  item: AsIsOverviewItem;
  /** 프로젝트 ID (캐시 무효화용) */
  projectId: string;
  /** 사업부 코드 (캐시 무효화용) */
  businessUnit: string;
  /** 모달 닫기 핸들러 */
  onClose: () => void;
}

/**
 * 업무 항목 수정 모달 컴포넌트
 */
export function EditItemModal({ item, projectId, businessUnit, onClose }: EditItemModalProps) {
  // projectId, businessUnit을 전달해야 mutation 성공 시 올바른 캐시가 무효화됨
  const { updateItem, isUpdatingItem } = useAsIsOverview(projectId, businessUnit);

  // 초기값: 기존 항목 데이터
  const [asIsManagementNo, setAsIsManagementNo] = useState(item.asIsManagementNo || ""); // AS-IS 관리번호
  const [majorCategory, setMajorCategory] = useState<AsIsMajorCategory>(item.majorCategory);
  const [middleCategory, setMiddleCategory] = useState(item.middleCategory);
  const [taskName, setTaskName] = useState(item.taskName);
  const [currentMethod, setCurrentMethod] = useState<AsIsCurrentMethod>(item.currentMethod);
  const [issueSummary, setIssueSummary] = useState(item.issueSummary || "");
  const [details, setDetails] = useState(item.details || "");

  // 저장 핸들러
  const handleSave = () => {
    if (!middleCategory.trim() || !taskName.trim()) {
      alert("중분류와 업무명은 필수입니다.");
      return;
    }

    updateItem(
      {
        id: item.id,
        data: {
          asIsManagementNo: asIsManagementNo.trim() || undefined, // AS-IS 관리번호
          majorCategory,
          middleCategory: middleCategory.trim(),
          taskName: taskName.trim(),
          currentMethod,
          issueSummary: issueSummary.trim() || undefined,
          details: details.trim() || undefined,
        },
      },
      {
        onSuccess: () => {
          onClose();
        },
      }
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* 오버레이 */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
      />

      {/* 모달 */}
      <div className="relative bg-background-white dark:bg-surface-dark rounded-xl shadow-xl w-full max-w-lg mx-4">
        {/* 헤더 */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border dark:border-border-dark">
          <h2 className="text-lg font-bold text-text dark:text-white flex items-center gap-2">
            <Icon name="edit" size="sm" className="text-primary" />
            업무 수정
          </h2>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-surface dark:hover:bg-background-dark transition-colors"
          >
            <Icon name="close" size="sm" className="text-text-secondary" />
          </button>
        </div>

        {/* 본문 */}
        <div className="p-6 space-y-4">
          {/* AS-IS 관리번호 */}
          <div>
            <label className="block text-sm font-medium text-text dark:text-white mb-1.5">
              AS-IS 관리번호
            </label>
            <Input
              value={asIsManagementNo}
              onChange={(e) => setAsIsManagementNo(e.target.value)}
              placeholder="예: AS-001, AS-002"
            />
          </div>

          {/* 대분류 */}
          <div>
            <label className="block text-sm font-medium text-text dark:text-white mb-1.5">
              대분류 <span className="text-error">*</span>
            </label>
            <select
              value={majorCategory}
              onChange={(e) => setMajorCategory(e.target.value as AsIsMajorCategory)}
              className="w-full px-3 py-2 rounded-lg bg-surface dark:bg-background-dark border border-border dark:border-border-dark text-sm text-text dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/50"
            >
              {MAJOR_CATEGORY_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          {/* 중분류 */}
          <div>
            <label className="block text-sm font-medium text-text dark:text-white mb-1.5">
              중분류 <span className="text-error">*</span>
            </label>
            <Input
              value={middleCategory}
              onChange={(e) => setMiddleCategory(e.target.value)}
              placeholder="예: 입고관리, 재고조정"
            />
          </div>

          {/* 업무명 */}
          <div>
            <label className="block text-sm font-medium text-text dark:text-white mb-1.5">
              업무명 <span className="text-error">*</span>
            </label>
            <Input
              value={taskName}
              onChange={(e) => setTaskName(e.target.value)}
              placeholder="예: 입고검수, 재고실사"
            />
          </div>

          {/* 현행방식 */}
          <div>
            <label className="block text-sm font-medium text-text dark:text-white mb-1.5">
              현행방식
            </label>
            <select
              value={currentMethod}
              onChange={(e) => setCurrentMethod(e.target.value as AsIsCurrentMethod)}
              className="w-full px-3 py-2 rounded-lg bg-surface dark:bg-background-dark border border-border dark:border-border-dark text-sm text-text dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/50"
            >
              {CURRENT_METHOD_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label} - {option.description}
                </option>
              ))}
            </select>
          </div>

          {/* 이슈 요약 */}
          <div>
            <label className="block text-sm font-medium text-text dark:text-white mb-1.5">
              이슈 요약
            </label>
            <textarea
              value={issueSummary}
              onChange={(e) => setIssueSummary(e.target.value)}
              placeholder="현행 업무의 주요 이슈를 입력하세요"
              rows={3}
              className="w-full px-3 py-2 rounded-lg bg-surface dark:bg-background-dark border border-border dark:border-border-dark text-sm text-text dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
            />
          </div>

          {/* 세부내용 */}
          <div>
            <label className="block text-sm font-medium text-text dark:text-white mb-1.5">
              세부내용
            </label>
            <textarea
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              placeholder="업무의 세부 내용을 입력하세요"
              rows={3}
              className="w-full px-3 py-2 rounded-lg bg-surface dark:bg-background-dark border border-border dark:border-border-dark text-sm text-text dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
            />
          </div>
        </div>

        {/* 푸터 */}
        <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-border dark:border-border-dark">
          <Button variant="outline" onClick={onClose}>
            취소
          </Button>
          <Button
            variant="primary"
            leftIcon="check"
            onClick={handleSave}
            isLoading={isUpdatingItem}
          >
            저장
          </Button>
        </div>
      </div>
    </div>
  );
}
