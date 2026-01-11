/**
 * @file src/app/dashboard/customer-requirements/components/CustomerRequirementModal.tsx
 * @description
 * 고객요구사항 등록/수정 모달 컴포넌트입니다.
 * 폼 입력을 통해 고객요구사항을 등록하거나 수정할 수 있습니다.
 *
 * 초보자 가이드:
 * 1. **모드**: 생성(create) 또는 수정(edit) 모드
 * 2. **폼 필드**: 사업부, 업무구분, 기능명, 요구사항, 요청일, 요청자, 적용방안, 적용여부, 비고, To-Be
 * 3. **유효성 검사**: 필수 필드 체크 (사업부, 기능명, 요구사항)
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
  BUSINESS_UNITS,
} from "../types";

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
        businessUnit: requirement.businessUnit,
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

    if (!formData.businessUnit.trim()) {
      newErrors.businessUnit = "사업부를 선택해주세요.";
    }
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

      {/* 모달 */}
      <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-white dark:bg-slate-800 rounded-xl shadow-xl">
        {/* 헤더 */}
        <div className="sticky top-0 flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
            {mode === "create" ? "고객요구사항 등록" : "고객요구사항 수정"}
          </h2>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 폼 */}
        <form onSubmit={handleSubmit} className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* 사업부 */}
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                사업부 <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.businessUnit}
                onChange={(e) => handleChange("businessUnit", e.target.value)}
                className={`w-full px-3 py-2 text-sm border rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.businessUnit
                    ? "border-red-500"
                    : "border-slate-300 dark:border-slate-600"
                }`}
              >
                <option value="">선택하세요</option>
                {BUSINESS_UNITS.map((unit) => (
                  <option key={unit} value={unit}>
                    {unit}
                  </option>
                ))}
              </select>
              {errors.businessUnit && (
                <p className="mt-1 text-xs text-red-500">{errors.businessUnit}</p>
              )}
            </div>

            {/* 업무구분 */}
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                업무구분
              </label>
              <input
                type="text"
                value={formData.category}
                onChange={(e) => handleChange("category", e.target.value)}
                placeholder="예: 공통, 프로세스"
                className="w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* 기능명 */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                기능명 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.functionName}
                onChange={(e) => handleChange("functionName", e.target.value)}
                placeholder="기능명을 입력하세요"
                className={`w-full px-3 py-2 text-sm border rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.functionName
                    ? "border-red-500"
                    : "border-slate-300 dark:border-slate-600"
                }`}
              />
              {errors.functionName && (
                <p className="mt-1 text-xs text-red-500">{errors.functionName}</p>
              )}
            </div>

            {/* 요구사항 */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                요구사항 <span className="text-red-500">*</span>
              </label>
              <textarea
                value={formData.content}
                onChange={(e) => handleChange("content", e.target.value)}
                placeholder="요구사항 내용을 입력하세요"
                rows={4}
                className={`w-full px-3 py-2 text-sm border rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none ${
                  errors.content
                    ? "border-red-500"
                    : "border-slate-300 dark:border-slate-600"
                }`}
              />
              {errors.content && (
                <p className="mt-1 text-xs text-red-500">{errors.content}</p>
              )}
            </div>

            {/* 요청일 */}
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                요청일
              </label>
              <input
                type="date"
                value={formData.requestDate}
                onChange={(e) => handleChange("requestDate", e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* 요청자 */}
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                요청자
              </label>
              <input
                type="text"
                value={formData.requester}
                onChange={(e) => handleChange("requester", e.target.value)}
                placeholder="요청자 이름"
                className="w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* 적용방안 */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                적용방안
              </label>
              <textarea
                value={formData.solution}
                onChange={(e) => handleChange("solution", e.target.value)}
                placeholder="적용방안을 입력하세요"
                rows={3}
                className="w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              />
            </div>

            {/* 적용여부 */}
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                적용여부
              </label>
              <select
                value={formData.applyStatus}
                onChange={(e) =>
                  handleChange("applyStatus", e.target.value as ApplyStatus)
                }
                className="w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {Object.entries(APPLY_STATUS_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>

            {/* To-Be 관리번호 */}
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                To-Be 관리번호
              </label>
              <input
                type="text"
                value={formData.toBeCode}
                onChange={(e) => handleChange("toBeCode", e.target.value)}
                placeholder="예: TOBE_00001"
                className="w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* 비고 */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                비고
              </label>
              <textarea
                value={formData.remarks}
                onChange={(e) => handleChange("remarks", e.target.value)}
                placeholder="추가 메모"
                rows={2}
                className="w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
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
