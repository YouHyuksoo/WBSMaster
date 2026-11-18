/**
 * @file src/app/dashboard/documents/components/DocumentModal.tsx
 * @description
 * 문서 등록/수정 모달 컴포넌트입니다.
 *
 * 초보자 가이드:
 * - 문서 위치가 "서버"면 내 PC 파일을 고른다 (DocumentFileField). 실제 업로드는 page.tsx 가 문서를 저장한 뒤 한다.
 * - uploadProgress(0~1)가 오면 올리는 중이라 취소 · 저장 버튼을 막는다. 저장 실패 문구는 모달 안에 보여 준다.
 */

"use client";

import { useState, useEffect } from "react";
import { Icon, Button, Input } from "@/components/ui";
import { DocumentFileField } from "./DocumentFileField";
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
  /** 파일 올리는 진행률 (0~1, 올리는 중이 아니면 null) */
  uploadProgress?: number | null;
}

export function DocumentModal({
  isOpen,
  mode,
  document,
  isPersonal = false,
  onClose,
  onSubmit,
  uploadProgress = null,
}: DocumentModalProps) {
  const [formData, setFormData] = useState<DocumentFormData>(createDefaultFormData(isPersonal));
  const [tagInput, setTagInput] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

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
      setSubmitError(null);
    }
  }, [isOpen, mode, document, isPersonal]);

  // 서버 업로드인데 파일이 없으면 저장할 수 없다 (수정 모드는 이미 올린 파일이 있으면 된다)
  const needsFile = formData.sourceType === "SERVER_UPLOAD" && !formData.file && !(mode === "edit" && document?.filePath);

  // 파일을 고르면 비어 있는 문서명을 파일 이름(확장자 제외)으로 채운다
  const handleFileChange = (file: File | null) => {
    setFormData((prev) => ({
      ...prev,
      file,
      name: prev.name.trim() || !file ? prev.name : file.name.replace(/\.[^.]+$/, ""),
    }));
  };

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
    if (!formData.name.trim() || needsFile) return;

    setIsSubmitting(true);
    setSubmitError(null);
    try {
      await onSubmit(formData);
      onClose();
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "저장하지 못했습니다.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-background-white dark:bg-surface-dark rounded-xl p-6 w-full max-w-3xl mx-4 max-h-[90vh] overflow-y-auto">
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
              className="w-full px-3 py-2 rounded-lg bg-surface dark:bg-background-dark border border-border dark:border-border-dark text-text dark:text-white placeholder:text-text-secondary field-sizing-content min-h-20 max-h-[40vh] resize-y"
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

          {/* 서버 업로드: 내 PC 파일 */}
          {formData.sourceType === "SERVER_UPLOAD" && (
            <DocumentFileField
              file={formData.file ?? null}
              currentFileName={mode === "edit" ? document?.fileName : null}
              currentFileSize={mode === "edit" ? document?.fileSize : null}
              progress={uploadProgress}
              onChange={handleFileChange}
            />
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

          {submitError && (
            <p role="alert" className="px-3 py-2 rounded-lg border border-error/20 bg-error/10 text-sm text-error">
              {submitError}
            </p>
          )}

          {/* 버튼 */}
          <div className="flex gap-2 pt-2">
            <Button type="button" variant="outline" className="flex-1" onClick={onClose} disabled={isSubmitting}>
              취소
            </Button>
            <Button
              type="submit"
              variant="primary"
              className="flex-1"
              disabled={isSubmitting || !formData.name.trim() || needsFile}
            >
              {uploadProgress !== null ? "파일 올리는 중..." : isSubmitting ? "저장 중..." : mode === "create" ? "등록" : "저장"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
