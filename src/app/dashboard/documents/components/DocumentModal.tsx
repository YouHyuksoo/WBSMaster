/**
 * @file src/app/dashboard/documents/components/DocumentModal.tsx
 * @description
 * 문서 등록/수정 모달 컴포넌트입니다.
 */

"use client";

import { useState, useEffect } from "react";
import { Icon, Button, Input } from "@/components/ui";
import {
  type Document,
  type DocumentFormData,
  type DocumentCategory,
  type DocumentSourceType,
  DOCUMENT_CATEGORY_CONFIG,
  SOURCE_TYPE_CONFIG,
  DOCUMENT_CATEGORIES,
  SOURCE_TYPES,
  createDefaultFormData,
} from "../types";

interface DocumentModalProps {
  isOpen: boolean;
  mode: "create" | "edit";
  document: Document | null;
  /** 개인문서함 여부 */
  isPersonal?: boolean;
  onClose: () => void;
  onSubmit: (data: DocumentFormData) => Promise<void>;
}

export function DocumentModal({
  isOpen,
  mode,
  document,
  isPersonal = false,
  onClose,
  onSubmit,
}: DocumentModalProps) {
  const [formData, setFormData] = useState<DocumentFormData>(createDefaultFormData(isPersonal));
  const [tagInput, setTagInput] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 모달 열릴 때 폼 초기화
  useEffect(() => {
    if (isOpen) {
      if (mode === "edit" && document) {
        setFormData({
          name: document.name,
          description: document.description || "",
          category: document.category,
          version: document.version || "1.0",
          sourceType: document.sourceType,
          url: document.url || "",
          tags: document.tags || [],
          isPersonal,
        });
      } else {
        setFormData(createDefaultFormData(isPersonal));
      }
      setTagInput("");
    }
  }, [isOpen, mode, document, isPersonal]);

  // 태그 추가
  const handleAddTag = () => {
    if (tagInput.trim() && !formData.tags?.includes(tagInput.trim())) {
      setFormData({
        ...formData,
        tags: [...(formData.tags || []), tagInput.trim()],
      });
      setTagInput("");
    }
  };

  // 태그 삭제
  const handleRemoveTag = (tag: string) => {
    setFormData({
      ...formData,
      tags: formData.tags?.filter((t) => t !== tag) || [],
    });
  };

  // 제출
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    setIsSubmitting(true);
    try {
      await onSubmit(formData);
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-background-white dark:bg-surface-dark rounded-xl p-6 w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
        <h2 className="text-lg font-semibold text-text dark:text-white mb-4">
          {mode === "create" ? "새 문서 등록" : "문서 수정"}
        </h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* 문서명 */}
          <div>
            <label className="block text-sm font-medium text-text dark:text-white mb-1">
              문서명 *
            </label>
            <Input
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="문서 제목을 입력하세요"
              required
            />
          </div>

          {/* 설명 */}
          <div>
            <label className="block text-sm font-medium text-text dark:text-white mb-1">
              설명
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="문서에 대한 간단한 설명"
              className="w-full px-3 py-2 rounded-lg bg-surface dark:bg-background-dark border border-border dark:border-border-dark text-text dark:text-white placeholder:text-text-secondary resize-none h-20"
            />
          </div>

          {/* 종류 & 버전 */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-text dark:text-white mb-1">
                문서 종류 *
              </label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value as DocumentCategory })}
                className="w-full px-3 py-2 rounded-lg bg-surface dark:bg-background-dark border border-border dark:border-border-dark text-text dark:text-white"
              >
                {DOCUMENT_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {DOCUMENT_CATEGORY_CONFIG[cat].label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-text dark:text-white mb-1">
                버전
              </label>
              <Input
                value={formData.version}
                onChange={(e) => setFormData({ ...formData, version: e.target.value })}
                placeholder="1.0"
              />
            </div>
          </div>

          {/* 소스 타입 */}
          <div>
            <label className="block text-sm font-medium text-text dark:text-white mb-1">
              문서 위치 *
            </label>
            <div className="grid grid-cols-2 gap-2">
              {SOURCE_TYPES.map((type) => {
                const config = SOURCE_TYPE_CONFIG[type];
                return (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setFormData({ ...formData, sourceType: type })}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-colors ${
                      formData.sourceType === type
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border dark:border-border-dark text-text-secondary hover:border-primary/50"
                    }`}
                  >
                    <Icon name={config.icon} size="sm" />
                    <span className="text-sm">{config.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* URL 입력 (외부 링크인 경우) */}
          {(formData.sourceType === "ONEDRIVE" || formData.sourceType === "GOOGLE" || formData.sourceType === "EXTERNAL_LINK") && (
            <div>
              <label className="block text-sm font-medium text-text dark:text-white mb-1">
                문서 URL *
              </label>
              <Input
                value={formData.url}
                onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                placeholder={
                  formData.sourceType === "ONEDRIVE"
                    ? "https://1drv.ms/... 또는 SharePoint 링크"
                    : formData.sourceType === "GOOGLE"
                    ? "https://docs.google.com/..."
                    : "https://..."
                }
                leftIcon="link"
                required
              />
              <p className="text-xs text-text-secondary mt-1">
                {formData.sourceType === "ONEDRIVE" && "OneDrive 또는 SharePoint 공유 링크를 입력하세요"}
                {formData.sourceType === "GOOGLE" && "Google Drive 또는 Google Docs 공유 링크를 입력하세요"}
                {formData.sourceType === "EXTERNAL_LINK" && "외부 문서 URL을 입력하세요"}
              </p>
            </div>
          )}

          {/* 서버 업로드 안내 */}
          {formData.sourceType === "SERVER_UPLOAD" && (
            <div className="p-4 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
              <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
                <Icon name="info" size="sm" />
                <span className="text-sm font-medium">서버 업로드 기능</span>
              </div>
              <p className="text-xs text-amber-600/80 dark:text-amber-400/80 mt-1">
                서버 업로드 기능은 추후 지원 예정입니다. 현재는 외부 링크를 사용해주세요.
              </p>
            </div>
          )}

          {/* 태그 */}
          <div>
            <label className="block text-sm font-medium text-text dark:text-white mb-1">
              태그
            </label>
            <div className="flex gap-2 mb-2">
              <Input
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                placeholder="태그 입력 후 Enter"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAddTag();
                  }
                }}
              />
              <Button type="button" variant="outline" onClick={handleAddTag}>
                추가
              </Button>
            </div>
            {formData.tags && formData.tags.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {formData.tags.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-primary/10 text-primary"
                  >
                    {tag}
                    <button
                      type="button"
                      onClick={() => handleRemoveTag(tag)}
                      className="hover:text-error"
                    >
                      <Icon name="close" size="xs" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* 버튼 */}
          <div className="flex gap-2 pt-2">
            <Button type="button" variant="outline" className="flex-1" onClick={onClose}>
              취소
            </Button>
            <Button
              type="submit"
              variant="primary"
              className="flex-1"
              disabled={isSubmitting || !formData.name.trim()}
            >
              {isSubmitting ? "저장 중..." : mode === "create" ? "등록" : "저장"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
