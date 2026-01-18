/**
 * @file src/app/dashboard/interviews/components/InterviewModal.tsx
 * @description
 * 인터뷰 등록/수정 모달 컴포넌트입니다.
 * 폼 입력을 통해 인터뷰를 등록하거나 수정할 수 있습니다.
 *
 * 초보자 가이드:
 * 1. **모드**: 생성(create) 또는 수정(edit) 모드
 * 2. **폼 필드**: 제목, 인터뷰 일자, 진행자, 대상자, 사업부, 5가지 카테고리(현재 운영 방식, 문제점, 원하는 결과, 기술적 제약, 궁금한 점), 비고
 * 3. **유효성 검사**: 필수 필드 체크 (제목, 사업부)
 * 4. **5가지 카테고리**: textarea로 각각 입력받아 구조화된 인터뷰 내용 저장
 */

"use client";

import { useState, useEffect, useCallback } from "react";
import { X, Loader2 } from "lucide-react";
import {
  type Interview,
  type InterviewFormData,
  BUSINESS_UNITS,
  BUSINESS_CATEGORIES,
} from "../types";

interface InterviewModalProps {
  isOpen: boolean;
  mode: "create" | "edit";
  interview?: Interview | null;
  onClose: () => void;
  onSubmit: (data: InterviewFormData) => Promise<void>;
}

/** 기본 폼 데이터 */
const DEFAULT_FORM_DATA: InterviewFormData = {
  title: "",
  interviewDate: "",
  interviewer: "",
  interviewee: "",
  businessUnit: "",
  category: "",
  currentProcess: "",
  painPoints: "",
  desiredResults: "",
  technicalConstraints: "",
  questions: "",
  remarks: "",
};

/**
 * 인터뷰 모달 컴포넌트
 */
export function InterviewModal({
  isOpen,
  mode,
  interview,
  onClose,
  onSubmit,
}: InterviewModalProps) {
  const [formData, setFormData] = useState<InterviewFormData>(DEFAULT_FORM_DATA);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // 수정 모드일 때 기존 데이터 로드
  useEffect(() => {
    if (mode === "edit" && interview) {
      setFormData({
        title: interview.title,
        interviewDate: interview.interviewDate
          ? new Date(interview.interviewDate).toISOString().split("T")[0]
          : "",
        interviewer: interview.interviewer || "",
        interviewee: interview.interviewee || "",
        businessUnit: interview.businessUnit,
        category: interview.category || "",
        currentProcess: interview.currentProcess || "",
        painPoints: interview.painPoints || "",
        desiredResults: interview.desiredResults || "",
        technicalConstraints: interview.technicalConstraints || "",
        questions: interview.questions || "",
        remarks: interview.remarks || "",
      });
    } else {
      setFormData(DEFAULT_FORM_DATA);
    }
    setErrors({});
  }, [mode, interview, isOpen]);

  // 필드 변경 핸들러
  const handleChange = useCallback(
    (field: keyof InterviewFormData, value: string) => {
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

    if (!formData.title.trim()) {
      newErrors.title = "제목을 입력해주세요.";
    }
    if (!formData.businessUnit.trim()) {
      newErrors.businessUnit = "사업부를 선택해주세요.";
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
      <div className="relative w-full max-w-4xl max-h-[90vh] overflow-y-auto bg-white dark:bg-slate-800 rounded-xl shadow-xl">
        {/* 헤더 */}
        <div className="sticky top-0 flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 z-10">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
            {mode === "create" ? "인터뷰 등록" : "인터뷰 수정"}
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
          <div className="space-y-6">
            {/* 기본 정보 섹션 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* 제목 */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  제목 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => handleChange("title", e.target.value)}
                  placeholder="인터뷰 제목을 입력하세요"
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

              {/* 인터뷰 일자 */}
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  인터뷰 일자
                </label>
                <input
                  type="date"
                  value={formData.interviewDate}
                  onChange={(e) => handleChange("interviewDate", e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

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

              {/* 업무영역 */}
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  업무영역
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

              {/* 진행자 */}
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  진행자
                </label>
                <input
                  type="text"
                  value={formData.interviewer}
                  onChange={(e) => handleChange("interviewer", e.target.value)}
                  placeholder="진행자 이름"
                  className="w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* 대상자 */}
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  대상자
                </label>
                <input
                  type="text"
                  value={formData.interviewee}
                  onChange={(e) => handleChange("interviewee", e.target.value)}
                  placeholder="인터뷰 대상자 이름"
                  className="w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* 5가지 카테고리 섹션 */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b border-slate-200 dark:border-slate-700">
                <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                  인터뷰 내용
                </span>
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  (5가지 카테고리로 구조화)
                </span>
              </div>

              {/* 1. 현재 운영 방식 (AS-IS) */}
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  1. 현재 운영 방식 (AS-IS)
                </label>
                <textarea
                  value={formData.currentProcess}
                  onChange={(e) => handleChange("currentProcess", e.target.value)}
                  placeholder="현재 어떻게 업무를 진행하고 있는지 설명해주세요"
                  rows={3}
                  className="w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>

              {/* 2. 문제점 (Pain Points) */}
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  2. 문제점 (Pain Points)
                </label>
                <textarea
                  value={formData.painPoints}
                  onChange={(e) => handleChange("painPoints", e.target.value)}
                  placeholder="현재 겪고 있는 문제점이나 불편한 점을 설명해주세요"
                  rows={3}
                  className="w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>

              {/* 3. 원하는 결과 (TO-BE) */}
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  3. 원하는 결과 (TO-BE)
                </label>
                <textarea
                  value={formData.desiredResults}
                  onChange={(e) => handleChange("desiredResults", e.target.value)}
                  placeholder="개선 후 어떤 결과를 원하는지 설명해주세요"
                  rows={3}
                  className="w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>

              {/* 4. 기술적 제약 (Technical Limits) */}
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  4. 기술적 제약 (Technical Limits)
                </label>
                <textarea
                  value={formData.technicalConstraints}
                  onChange={(e) => handleChange("technicalConstraints", e.target.value)}
                  placeholder="기술적으로 제약이 있는 부분이나 고려사항을 설명해주세요"
                  rows={3}
                  className="w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>

              {/* 5. 궁금한 점 (Questions) */}
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  5. 궁금한 점 (Questions)
                </label>
                <textarea
                  value={formData.questions}
                  onChange={(e) => handleChange("questions", e.target.value)}
                  placeholder="추가로 궁금한 점이나 확인이 필요한 사항을 기재해주세요"
                  rows={3}
                  className="w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>
            </div>

            {/* 비고 */}
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                비고
              </label>
              <textarea
                value={formData.remarks}
                onChange={(e) => handleChange("remarks", e.target.value)}
                placeholder="추가 메모나 참고사항"
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
