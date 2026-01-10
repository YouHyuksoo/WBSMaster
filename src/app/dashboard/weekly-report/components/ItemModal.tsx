/**
 * @file src/app/dashboard/weekly-report/components/ItemModal.tsx
 * @description
 * 주간보고 항목 추가/수정 모달 컴포넌트입니다.
 * 업무 카테고리, 내용, 진행률 등을 입력받습니다.
 *
 * 초보자 가이드:
 * 1. **카테고리 선택**: 업무 구분 드롭다운
 * 2. **업무 내용**: 제목과 상세 설명 입력
 * 3. **목표일**: 날짜 선택
 * 4. **진행률/완료**: 전주 실적인 경우에만 표시
 * 5. **추가 업무 체크**: 계획에 없던 추가 업무 표시
 */

"use client";

import React, { useState, useEffect } from "react";
import { Modal, Button } from "@/components/ui";
import { WeeklyReportItem, WorkCategory } from "@/lib/api";
import { WORK_CATEGORIES, formatDate } from "../constants";
import { ItemFormData } from "../types";

interface ItemModalProps {
  /** 모달 표시 여부 */
  isOpen: boolean;
  /** 편집할 항목 (null이면 새 항목 생성) */
  item: WeeklyReportItem | null;
  /** 모달 닫기 핸들러 */
  onClose: () => void;
  /** 저장 핸들러 */
  onSave: (item: Partial<WeeklyReportItem>) => void;
}

/**
 * 항목 추가/수정 모달 컴포넌트
 */
export function ItemModal({ isOpen, item, onClose, onSave }: ItemModalProps) {
  // 폼 상태
  const [formData, setFormData] = useState<ItemFormData>({
    category: "DEVELOPMENT",
    title: "",
    description: "",
    targetDate: "",
    remarks: "",
    isAdditional: false,
    isCompleted: false,
    progress: 0,
  });

  // 항목 데이터가 변경되면 폼 초기화
  useEffect(() => {
    if (item) {
      setFormData({
        category: item.category || "DEVELOPMENT",
        title: item.title || "",
        description: item.description || "",
        targetDate: item.targetDate ? formatDate(item.targetDate) : "",
        remarks: item.remarks || "",
        isAdditional: item.isAdditional || false,
        isCompleted: item.isCompleted || false,
        progress: item.progress || 0,
      });
    }
  }, [item]);

  /** 폼 제출 핸들러 */
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim()) return;

    onSave({
      type: item?.type,
      category: formData.category,
      title: formData.title,
      description: formData.description || undefined,
      targetDate: formData.targetDate || undefined,
      remarks: formData.remarks || undefined,
      isAdditional: formData.isAdditional,
      isCompleted: formData.isCompleted,
      progress: formData.progress,
    });
  };

  const isPreviousType = item?.type === "PREVIOUS_RESULT";
  const isEditing = item?.id && item.id !== "";

  // 모달 제목: 생성/수정 + 전주실적/차주계획 조합
  const getModalTitle = () => {
    const action = isEditing ? "수정" : "추가";
    const type = isPreviousType ? "전주 실적" : "차주 계획";
    return `${type} ${action}`;
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={getModalTitle()} size="md">
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* 카테고리 */}
        <div>
          <label className="block text-sm font-medium text-foreground mb-1">
            업무 구분
          </label>
          <select
            value={formData.category}
            onChange={(e) =>
              setFormData({ ...formData, category: e.target.value as WorkCategory })
            }
            className="w-full px-3 py-2 rounded-lg border border-border bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          >
            {WORK_CATEGORIES.map((cat) => (
              <option key={cat.value} value={cat.value}>
                {cat.label}
              </option>
            ))}
          </select>
        </div>

        {/* 제목 */}
        <div>
          <label className="block text-sm font-medium text-foreground mb-1">
            업무 내용 *
          </label>
          <input
            type="text"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            placeholder="업무 내용을 입력하세요"
            className="w-full px-3 py-2 rounded-lg border border-border bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            required
          />
        </div>

        {/* 상세 설명 */}
        <div>
          <label className="block text-sm font-medium text-foreground mb-1">
            상세 설명
          </label>
          <textarea
            value={formData.description}
            onChange={(e) =>
              setFormData({ ...formData, description: e.target.value })
            }
            placeholder="상세 설명을 입력하세요"
            rows={3}
            className="w-full px-3 py-2 rounded-lg border border-border bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-none"
          />
        </div>

        {/* 목표일 */}
        <div>
          <label className="block text-sm font-medium text-foreground mb-1">
            목표일
          </label>
          <input
            type="date"
            value={formData.targetDate}
            onChange={(e) =>
              setFormData({ ...formData, targetDate: e.target.value })
            }
            className="w-full px-3 py-2 rounded-lg border border-border bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        {/* 전주 실적인 경우에만 진행률/완료 표시 */}
        {isPreviousType && (
          <>
            {/* 진행률 */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                진행률: {formData.progress}%
              </label>
              <input
                type="range"
                min="0"
                max="100"
                step="10"
                value={formData.progress}
                onChange={(e) =>
                  setFormData({ ...formData, progress: parseInt(e.target.value) })
                }
                className="w-full"
              />
            </div>

            {/* 완료 여부 */}
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="isCompleted"
                checked={formData.isCompleted}
                onChange={(e) =>
                  setFormData({ ...formData, isCompleted: e.target.checked })
                }
                className="rounded border-border"
              />
              <label htmlFor="isCompleted" className="text-sm text-foreground">
                완료됨
              </label>
            </div>

            {/* 추가 업무 여부 */}
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="isAdditional"
                checked={formData.isAdditional}
                onChange={(e) =>
                  setFormData({ ...formData, isAdditional: e.target.checked })
                }
                className="rounded border-border"
              />
              <label htmlFor="isAdditional" className="text-sm text-foreground">
                계획에 없던 추가 업무
              </label>
            </div>
          </>
        )}

        {/* 버튼 */}
        <div className="flex justify-end gap-2 pt-4">
          <Button type="button" variant="outline" onClick={onClose}>
            취소
          </Button>
          <Button type="submit">{isEditing ? "수정" : "저장"}</Button>
        </div>
      </form>
    </Modal>
  );
}
