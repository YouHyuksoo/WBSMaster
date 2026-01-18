/**
 * @file src/app/dashboard/discussion-items/components/DiscussionItemModal.tsx
 * @description
 * 협의요청 등록/수정 모달 컴포넌트입니다.
 * 폼 입력을 통해 협의요청을 등록하거나 수정할 수 있습니다.
 *
 * 초보자 가이드:
 * 1. **모드**: 생성(create) 또는 수정(edit) 모드
 * 2. **필수 필드**: 사업부, 협의 주제, 발생 단계, 선택지 (최소 2개)
 * 3. **선택지 관리**: 동적으로 추가/삭제 가능
 */

"use client";

import { useState, useEffect, useCallback } from "react";
import { X, Loader2, Plus, Trash2 } from "lucide-react";
import {
  type DiscussionItem,
  type DiscussionItemFormData,
  type DiscussionOption,
  type DiscussionStage,
  type DiscussionPriority,
  STAGE_CONFIG,
  PRIORITY_CONFIG,
} from "../types";
import { BUSINESS_UNITS } from "@/constants/business-units";

interface DiscussionItemModalProps {
  isOpen: boolean;
  mode: "create" | "edit";
  item?: DiscussionItem | null;
  onClose: () => void;
  onSubmit: (data: DiscussionItemFormData) => Promise<void>;
}

/** 기본 폼 데이터 */
const DEFAULT_FORM_DATA: DiscussionItemFormData = {
  businessUnit: "",
  title: "",
  description: "",
  stage: "ANALYSIS",
  priority: "MEDIUM",
  options: [
    { label: "A안", description: "" },
    { label: "B안", description: "" },
  ],
  requesterName: "",
  dueDate: "",
};

/**
 * 협의요청 모달 컴포넌트
 */
export function DiscussionItemModal({
  isOpen,
  mode,
  item,
  onClose,
  onSubmit,
}: DiscussionItemModalProps) {
  const [formData, setFormData] = useState<DiscussionItemFormData>(DEFAULT_FORM_DATA);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // 수정 모드일 때 기존 데이터 로드
  useEffect(() => {
    if (mode === "edit" && item) {
      setFormData({
        businessUnit: item.businessUnit,
        title: item.title,
        description: item.description || "",
        stage: item.stage,
        priority: item.priority,
        options: item.options || [
          { label: "A안", description: "" },
          { label: "B안", description: "" },
        ],
        requesterName: item.requesterName || "",
        dueDate: item.dueDate
          ? new Date(item.dueDate).toISOString().split("T")[0]
          : "",
      });
    } else {
      setFormData(DEFAULT_FORM_DATA);
    }
    setErrors({});
  }, [mode, item, isOpen]);

  // 필드 변경 핸들러
  const handleChange = useCallback(
    (field: keyof DiscussionItemFormData, value: string) => {
      setFormData((prev) => ({ ...prev, [field]: value }));
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

  // 선택지 추가
  const handleAddOption = useCallback(() => {
    const nextLabel = String.fromCharCode(65 + formData.options.length) + "안"; // A안, B안, C안...
    setFormData((prev) => ({
      ...prev,
      options: [...prev.options, { label: nextLabel, description: "" }],
    }));
  }, [formData.options.length]);

  // 선택지 삭제
  const handleRemoveOption = useCallback((index: number) => {
    setFormData((prev) => ({
      ...prev,
      options: prev.options.filter((_, i) => i !== index),
    }));
  }, []);

  // 선택지 변경
  const handleOptionChange = useCallback(
    (index: number, field: keyof DiscussionOption, value: string | number) => {
      setFormData((prev) => ({
        ...prev,
        options: prev.options.map((opt, i) =>
          i === index ? { ...opt, [field]: value } : opt
        ),
      }));
    },
    []
  );

  // 유효성 검사
  const validate = useCallback((): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.businessUnit.trim()) {
      newErrors.businessUnit = "사업부를 선택해주세요.";
    }
    if (!formData.title.trim()) {
      newErrors.title = "협의 주제를 입력해주세요.";
    }
    if (!formData.stage) {
      newErrors.stage = "발생 단계를 선택해주세요.";
    }
    if (formData.options.length < 2) {
      newErrors.options = "선택지는 최소 2개 이상이어야 합니다.";
    }
    // 각 선택지의 설명 필수
    const emptyOptions = formData.options.filter(opt => !opt.description.trim());
    if (emptyOptions.length > 0) {
      newErrors.options = "모든 선택지의 설명을 입력해주세요.";
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* 백드롭 */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
      />

      {/* 모달 */}
      <div className="relative w-full max-w-3xl max-h-[90vh] overflow-y-auto bg-white dark:bg-slate-800 rounded-xl shadow-xl">
        {/* 헤더 */}
        <div className="sticky top-0 flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 z-10">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
            {mode === "create" ? "협의요청 등록" : "협의요청 수정"}
          </h2>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 폼 */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* 기본 정보 */}
          <div className="grid grid-cols-2 gap-4">
            {/* 사업부구분 */}
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                사업부구분 <span className="text-error">*</span>
              </label>
              <select
                value={formData.businessUnit}
                onChange={(e) => handleChange("businessUnit", e.target.value)}
                className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm"
              >
                <option value="">선택</option>
                {BUSINESS_UNITS.map((unit) => (
                  <option key={unit} value={unit}>
                    {unit}
                  </option>
                ))}
              </select>
              {errors.businessUnit && (
                <p className="mt-1 text-xs text-error">{errors.businessUnit}</p>
              )}
            </div>

            {/* 발생 단계 */}
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                발생 단계 <span className="text-error">*</span>
              </label>
              <select
                value={formData.stage}
                onChange={(e) => handleChange("stage", e.target.value as DiscussionStage)}
                className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm"
              >
                {Object.entries(STAGE_CONFIG).map(([key, config]) => (
                  <option key={key} value={key}>
                    {config.label}
                  </option>
                ))}
              </select>
              {errors.stage && (
                <p className="mt-1 text-xs text-error">{errors.stage}</p>
              )}
            </div>
          </div>

          {/* 요청자, 협의 주제 */}
          <div className="grid grid-cols-4 gap-4">
            {/* 요청자 */}
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                요청자
              </label>
              <input
                type="text"
                value={formData.requesterName || ""}
                onChange={(e) => handleChange("requesterName", e.target.value)}
                className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm"
                placeholder="요청자명"
              />
            </div>

            {/* 협의 주제 */}
            <div className="col-span-3">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                협의 주제 <span className="text-error">*</span>
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => handleChange("title", e.target.value)}
                className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm"
                placeholder="예: 화면 레이아웃 결정, 프로세스 변경 여부 등"
              />
              {errors.title && (
                <p className="mt-1 text-xs text-error">{errors.title}</p>
              )}
            </div>
          </div>

          {/* 상세 내용 */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              상세 내용
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => handleChange("description", e.target.value)}
              rows={3}
              className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm"
              placeholder="협의가 필요한 이유와 배경을 입력하세요."
            />
          </div>

          {/* 선택지 */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                선택지 <span className="text-error">*</span> (최소 2개)
              </label>
              <button
                type="button"
                onClick={handleAddOption}
                className="flex items-center gap-1 px-2 py-1 text-xs text-primary hover:text-primary-hover"
              >
                <Plus className="w-4 h-4" />
                <span>선택지 추가</span>
              </button>
            </div>

            <div className="space-y-3">
              {formData.options.map((option, index) => (
                <div
                  key={index}
                  className="p-3 border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-900"
                >
                  <div className="flex items-start gap-3">
                    <div className="flex-1 space-y-2">
                      {/* 레이블 */}
                      <input
                        type="text"
                        value={option.label}
                        onChange={(e) => handleOptionChange(index, "label", e.target.value)}
                        className="w-full px-2 py-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-sm font-medium"
                        placeholder="A안"
                      />
                      {/* 설명 */}
                      <textarea
                        value={option.description}
                        onChange={(e) => handleOptionChange(index, "description", e.target.value)}
                        rows={2}
                        className="w-full px-2 py-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-sm"
                        placeholder="선택지 설명을 입력하세요."
                      />
                      {/* 선택: 비용, 기간 */}
                      <div className="grid grid-cols-2 gap-2">
                        <input
                          type="number"
                          value={option.cost || ""}
                          onChange={(e) => handleOptionChange(index, "cost", e.target.value ? Number(e.target.value) : "")}
                          className="w-full px-2 py-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-sm"
                          placeholder="예상 비용 (선택)"
                        />
                        <input
                          type="number"
                          value={option.duration || ""}
                          onChange={(e) => handleOptionChange(index, "duration", e.target.value ? Number(e.target.value) : "")}
                          className="w-full px-2 py-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-sm"
                          placeholder="소요 기간(일) (선택)"
                        />
                      </div>
                    </div>

                    {/* 삭제 버튼 */}
                    {formData.options.length > 2 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveOption(index)}
                        className="p-1 text-error hover:bg-error/10 rounded"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
            {errors.options && (
              <p className="mt-1 text-xs text-error">{errors.options}</p>
            )}
          </div>

          {/* 우선순위, 협의 기한 */}
          <div className="grid grid-cols-2 gap-4">
            {/* 우선순위 */}
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                우선순위
              </label>
              <select
                value={formData.priority}
                onChange={(e) => handleChange("priority", e.target.value as DiscussionPriority)}
                className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm"
              >
                {Object.entries(PRIORITY_CONFIG).map(([key, config]) => (
                  <option key={key} value={key}>
                    {config.label}
                  </option>
                ))}
              </select>
            </div>

            {/* 협의 기한 */}
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                협의 기한
              </label>
              <input
                type="date"
                value={formData.dueDate}
                onChange={(e) => handleChange("dueDate", e.target.value)}
                className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm"
              />
            </div>
          </div>

          {/* 버튼 */}
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-700">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-600"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 text-sm font-medium text-white bg-primary hover:bg-primary-hover rounded-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
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
