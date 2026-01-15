/**
 * @file src/app/dashboard/field-issues/components/FieldIssueModal.tsx
 * @description
 * 현업이슈 등록/수정 모달 컴포넌트입니다.
 * 폼 입력을 통해 현업이슈를 등록하거나 수정할 수 있습니다.
 *
 * 초보자 가이드:
 * 1. **모드**: 생성(create) 또는 수정(edit) 모드
 * 2. **폼 필드**: 사업부, 업무구분, 이슈관리명, 이슈설명, 등록일, 이슈어, 담당자, 상태, 타겟일, 완료일, 제안된 해결방안, 최종 적용방안, 비고
 * 3. **유효성 검사**: 필수 필드 체크 (사업부, 이슈관리명)
 */

"use client";

import { useState, useEffect, useCallback } from "react";
import { X, Loader2 } from "lucide-react";
import {
  type FieldIssue,
  type FieldIssueFormData,
  type FieldIssueStatus,
  STATUS_LABELS,
  DEFAULT_FORM_DATA,
  BUSINESS_UNITS,
  BUSINESS_CATEGORIES,
} from "../types";

interface FieldIssueModalProps {
  isOpen: boolean;
  mode: "create" | "edit";
  issue?: FieldIssue | null;
  onClose: () => void;
  onSubmit: (data: FieldIssueFormData) => Promise<void>;
}

/**
 * 현업이슈 모달 컴포넌트
 */
export function FieldIssueModal({
  isOpen,
  mode,
  issue,
  onClose,
  onSubmit,
}: FieldIssueModalProps) {
  const [formData, setFormData] = useState<FieldIssueFormData>(DEFAULT_FORM_DATA);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // 수정 모드일 때 기존 데이터 로드
  useEffect(() => {
    if (mode === "edit" && issue) {
      setFormData({
        businessUnit: issue.businessUnit,
        category: issue.category || "",
        title: issue.title,
        description: issue.description || "",
        registeredDate: issue.registeredDate
          ? new Date(issue.registeredDate).toISOString().split("T")[0]
          : "",
        issuer: issue.issuer || "",
        requirementCode: issue.requirementCode || "",
        assignee: issue.assignee || "",
        status: issue.status,
        targetDate: issue.targetDate
          ? new Date(issue.targetDate).toISOString().split("T")[0]
          : "",
        completedDate: issue.completedDate
          ? new Date(issue.completedDate).toISOString().split("T")[0]
          : "",
        proposedSolution: issue.proposedSolution || "",
        finalSolution: issue.finalSolution || "",
        remarks: issue.remarks || "",
      });
    } else {
      setFormData(DEFAULT_FORM_DATA);
    }
    setErrors({});
  }, [mode, issue, isOpen]);

  // 필드 변경 핸들러
  const handleChange = useCallback(
    (field: keyof FieldIssueFormData, value: string) => {
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
    if (!formData.title.trim()) {
      newErrors.title = "이슈관리명을 입력해주세요.";
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
      <div className="relative w-full max-w-3xl max-h-[90vh] overflow-y-auto bg-white dark:bg-slate-800 rounded-xl shadow-xl">
        {/* 헤더 */}
        <div className="sticky top-0 flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
            {mode === "create" ? "현업이슈 등록" : "현업이슈 수정"}
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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
              <select
                value={formData.category}
                onChange={(e) => handleChange("category", e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">선택하세요</option>
                {BUSINESS_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            {/* 상태 */}
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                상태
              </label>
              <select
                value={formData.status}
                onChange={(e) =>
                  handleChange("status", e.target.value as FieldIssueStatus)
                }
                className="w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {Object.entries(STATUS_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>

            {/* 이슈관리명 */}
            <div className="md:col-span-3">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                이슈관리명 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => handleChange("title", e.target.value)}
                placeholder="이슈관리명을 입력하세요"
                className={`w-full px-3 py-2 text-sm border rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.title
                    ? "border-red-500"
                    : "border-slate-300 dark:border-slate-600"
                }`}
              />
              {errors.title && (
                <p className="mt-1 text-xs text-red-500">{errors.title}</p>
              )}
            </div>

            {/* 이슈 설명 */}
            <div className="md:col-span-3">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                이슈 설명
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => handleChange("description", e.target.value)}
                placeholder="이슈 설명을 입력하세요"
                rows={3}
                className="w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              />
            </div>

            {/* 등록일 */}
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                등록일
              </label>
              <input
                type="date"
                value={formData.registeredDate}
                onChange={(e) => handleChange("registeredDate", e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* 이슈어 */}
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                이슈어 (보고자)
              </label>
              <input
                type="text"
                value={formData.issuer}
                onChange={(e) => handleChange("issuer", e.target.value)}
                placeholder="보고자 이름"
                className="w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* 담당자 */}
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                담당자
              </label>
              <input
                type="text"
                value={formData.assignee}
                onChange={(e) => handleChange("assignee", e.target.value)}
                placeholder="담당자 이름"
                className="w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* 요구사항 번호 */}
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                요구사항 번호
              </label>
              <input
                type="text"
                value={formData.requirementCode}
                onChange={(e) => handleChange("requirementCode", e.target.value)}
                placeholder="예: RQVP_00018"
                className="w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* 타겟일 */}
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                타겟일
              </label>
              <input
                type="date"
                value={formData.targetDate}
                onChange={(e) => handleChange("targetDate", e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* 완료일 */}
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                완료일
              </label>
              <input
                type="date"
                value={formData.completedDate}
                onChange={(e) => handleChange("completedDate", e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* 제안된 해결방안 */}
            <div className="md:col-span-3">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                제안된 해결방안
              </label>
              <textarea
                value={formData.proposedSolution}
                onChange={(e) => handleChange("proposedSolution", e.target.value)}
                placeholder="제안된 해결방안을 입력하세요"
                rows={3}
                className="w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              />
            </div>

            {/* 최종 적용방안 */}
            <div className="md:col-span-3">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                최종 적용방안
              </label>
              <textarea
                value={formData.finalSolution}
                onChange={(e) => handleChange("finalSolution", e.target.value)}
                placeholder="최종 적용방안을 입력하세요"
                rows={3}
                className="w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              />
            </div>

            {/* 비고 */}
            <div className="md:col-span-3">
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
