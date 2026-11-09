/**
 * @file src/app/dashboard/customer-requirements/components/CustomerRequirementModal.tsx
 * @description
 * 고객요구사항 등록/수정 모달 컴포넌트입니다.
 * 폼 입력을 통해 고객요구사항을 등록하거나 수정할 수 있습니다.
 *
 * 초보자 가이드:
 * 1. **모드**: 생성(create) 또는 수정(edit) 모드
 * 2. **폼 필드**: 업무구분, 기능명, 요구사항, 요청일, 요청자, 적용방안, 적용여부, 비고, To-Be
 * 3. **유효성 검사**: 필수 필드 체크 (기능명, 요구사항)
 * 4. **사업부**: 묻지 않는다. 저장 시 DB 기본값(POLE)이 채워진다.
 * 5. **배치**: max-w-5xl, 4칸 격자 (기능명·업무구분·적용여부 / 요청자·요청일·완료일·To-Be / 요구사항·적용방안 / 비고)
 */

"use client";

import { useState, useEffect, useCallback } from "react";
import { X, Loader2 } from "lucide-react";
import {
  type CustomerRequirement,
  type CustomerRequirementFormData,
  type ApplyStatus,
  APPLY_STATUS_LABELS,
  DEFAULT_FORM_DATA,
  BUSINESS_CATEGORIES,
} from "../types";

/** 라벨 · 입력 공통 클래스 */
const LABEL = "block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1";
const FIELD = "w-full px-3 py-2 text-sm border rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500";
const FIELD_BORDER = "border-slate-300 dark:border-slate-600";
/** 긴 입력칸: 내용 길이에 맞춰 늘어나고(field-sizing), 너무 길면 그때만 칸 안에서 스크롤 */
const GROW_LARGE = "field-sizing-content min-h-40 max-h-[38vh] resize-y";
const GROW_SMALL = "field-sizing-content min-h-16 max-h-[18vh] resize-y";
interface CustomerRequirementModalProps {
  isOpen: boolean;
  mode: "create" | "edit";
  requirement?: CustomerRequirement | null;
  onClose: () => void;
  onSubmit: (data: CustomerRequirementFormData) => Promise<void>;
}

/**
 * 고객요구사항 모달 컴포넌트
 */
export function CustomerRequirementModal({
  isOpen,
  mode,
  requirement,
  onClose,
  onSubmit,
}: CustomerRequirementModalProps) {
  const [formData, setFormData] = useState<CustomerRequirementFormData>(DEFAULT_FORM_DATA);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // 수정 모드일 때 기존 데이터 로드
  useEffect(() => {
    if (mode === "edit" && requirement) {
      setFormData({
        category: requirement.category || "",
        functionName: requirement.functionName,
        content: requirement.content,
        requestDate: requirement.requestDate
          ? new Date(requirement.requestDate).toISOString().split("T")[0]
          : "",
        requester: requirement.requester || "",
        solution: requirement.solution || "",
        applyStatus: requirement.applyStatus,
        remarks: requirement.remarks || "",
        toBeCode: requirement.toBeCode || "",
        completeDate: requirement.completeDate
          ? new Date(requirement.completeDate).toISOString().split("T")[0]
          : "",
      });
    } else {
      setFormData(DEFAULT_FORM_DATA);
    }
    setErrors({});
  }, [mode, requirement, isOpen]);

  // 필드 변경 핸들러
  const handleChange = useCallback(
    (field: keyof CustomerRequirementFormData, value: string) => {
      setFormData((prev) => ({ ...prev, [field]: value }));
      // 에러 제거
      if (errors[field]) {
        setErrors((prev) => {
          const next = { ...prev };
          delete next[field];
          return next;
        });
      }
    },
    [errors]
  );

  // 유효성 검사
  const validate = useCallback((): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.functionName.trim()) {
      newErrors.functionName = "기능명을 입력해주세요.";
    }
    if (!formData.content.trim()) {
      newErrors.content = "요구사항 내용을 입력해주세요.";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formData]);

  // 제출 핸들러
  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();

      if (!validate()) return;

      setIsSubmitting(true);
      try {
        await onSubmit(formData);
        onClose();
      } catch (error) {
        console.error("제출 실패:", error);
      } finally {
        setIsSubmitting(false);
      }
    },
    [formData, validate, onSubmit, onClose]
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* 백드롭 */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
      />

      {/* 모달: 넓은 폭 + 4칸 격자로 스크롤 없이 한 화면에 (작은 화면은 1칸으로 쌓이고 스크롤) */}
      <div className="relative w-full max-w-5xl mx-4 max-h-[92vh] overflow-y-auto bg-white dark:bg-slate-800 rounded-xl shadow-xl">
        {/* 헤더 */}
        <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-3 border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
            {mode === "create" ? "고객요구사항 등록" : "고객요구사항 수정"}
            {mode === "edit" && requirement?.code && (
              <span className="ml-2 text-sm font-normal text-slate-500 dark:text-slate-400 tabular-nums">{requirement.code}</span>
            )}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="닫기"
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 폼 */}
        <form onSubmit={handleSubmit} className="px-6 py-5">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-x-4 gap-y-4">
            {/* 1줄: 기능명(2칸) · 업무구분 · 적용여부 */}
            <div className="md:col-span-2">
              <label className={LABEL}>
                기능명 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.functionName}
                onChange={(e) => handleChange("functionName", e.target.value)}
                placeholder="기능명을 입력하세요"
                className={`${FIELD} ${errors.functionName ? "border-red-500" : FIELD_BORDER}`}
              />
              {errors.functionName && <p className="mt-1 text-xs text-red-500">{errors.functionName}</p>}
            </div>

            <div>
              <label className={LABEL}>업무구분</label>
              <select
                value={formData.category}
                onChange={(e) => handleChange("category", e.target.value)}
                className={`${FIELD} ${FIELD_BORDER}`}
              >
                <option value="">선택하세요</option>
                {BUSINESS_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className={LABEL}>적용여부</label>
              <select
                value={formData.applyStatus}
                onChange={(e) => handleChange("applyStatus", e.target.value as ApplyStatus)}
                className={`${FIELD} ${FIELD_BORDER}`}
              >
                {Object.entries(APPLY_STATUS_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>

            {/* 2줄: 요청자 · 요청일 · 처리완료일 · To-Be */}
            <div>
              <label className={LABEL}>요청자</label>
              <input
                type="text"
                value={formData.requester}
                onChange={(e) => handleChange("requester", e.target.value)}
                placeholder="요청자 이름"
                className={`${FIELD} ${FIELD_BORDER}`}
              />
            </div>

            <div>
              <label className={LABEL}>요청일</label>
              <input
                type="date"
                value={formData.requestDate}
                onChange={(e) => handleChange("requestDate", e.target.value)}
                className={`${FIELD} ${FIELD_BORDER}`}
              />
            </div>

            <div>
              <label className={LABEL}>요청처리완료 일자</label>
              <input
                type="date"
                value={formData.completeDate}
                onChange={(e) => handleChange("completeDate", e.target.value)}
                className={`${FIELD} ${FIELD_BORDER}`}
              />
            </div>

            <div>
              <label className={LABEL}>To-Be 관리번호</label>
              <input
                type="text"
                value={formData.toBeCode}
                onChange={(e) => handleChange("toBeCode", e.target.value)}
                placeholder="예: TOBE_00001"
                className={`${FIELD} ${FIELD_BORDER}`}
              />
            </div>

            {/* 3줄: 요구사항 · 적용방안 나란히 */}
            <div className="md:col-span-2">
              <label className={LABEL}>
                요구사항 <span className="text-red-500">*</span>
              </label>
              <textarea
                value={formData.content}
                onChange={(e) => handleChange("content", e.target.value)}
                placeholder="요구사항 내용을 입력하세요"
                rows={7}
                className={`${FIELD} ${GROW_LARGE} ${errors.content ? "border-red-500" : FIELD_BORDER}`}
              />
              {errors.content && <p className="mt-1 text-xs text-red-500">{errors.content}</p>}
            </div>

            <div className="md:col-span-2">
              <label className={LABEL}>적용방안</label>
              <textarea
                value={formData.solution}
                onChange={(e) => handleChange("solution", e.target.value)}
                placeholder="적용방안을 입력하세요"
                rows={7}
                className={`${FIELD} ${GROW_LARGE} ${FIELD_BORDER}`}
              />
            </div>

            {/* 4줄: 비고 */}
            <div className="md:col-span-4">
              <label className={LABEL}>비고</label>
              <textarea
                value={formData.remarks}
                onChange={(e) => handleChange("remarks", e.target.value)}
                placeholder="추가 메모"
                rows={2}
                className={`${FIELD} ${GROW_SMALL} ${FIELD_BORDER}`}
              />
            </div>
          </div>

          {/* 버튼 */}
          <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-slate-200 dark:border-slate-700">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 rounded-lg transition-colors"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 rounded-lg transition-colors"
            >
              {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
              {mode === "create" ? "등록" : "수정"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
