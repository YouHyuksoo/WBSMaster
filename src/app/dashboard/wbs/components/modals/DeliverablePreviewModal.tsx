/**
 * @file src/app/dashboard/wbs/components/modals/DeliverablePreviewModal.tsx
 * @description
 * 산출물 미리보기 모달 컴포넌트입니다.
 * OneDrive/SharePoint/Google Drive 등 외부 문서를 iframe으로 임베드하여 표시합니다.
 *
 * 초보자 가이드:
 * 1. **url**: 미리보기할 산출물 URL
 * 2. **onClose**: 모달 닫기 핸들러
 *
 * 수정 방법:
 * - iframe 옵션 변경: allow 속성 수정
 * - 크기 변경: max-w, h 클래스 수정
 */

"use client";

import { useState, useCallback } from "react";
import { Icon } from "@/components/ui";
import { getEmbedUrl } from "../../utils/wbsHelpers";

interface DeliverablePreviewModalProps {
  /** 미리보기 URL (null이면 모달 숨김) */
  url: string | null;
  /** 닫기 핸들러 */
  onClose: () => void;
}

/**
 * 산출물 미리보기 모달 컴포넌트
 */
export function DeliverablePreviewModal({
  url,
  onClose,
}: DeliverablePreviewModalProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  const handleLoad = useCallback(() => {
    setIsLoading(false);
  }, []);

  const handleError = useCallback(() => {
    setIsLoading(false);
    setHasError(true);
  }, []);

  if (!url) return null;

  const embedUrl = getEmbedUrl(url);

  return (
    <div
      className="fixed inset-0 bg-black/70 flex items-center justify-center z-50"
      onClick={onClose}
    >
      <div
        className="bg-background-white dark:bg-surface-dark rounded-xl w-full max-w-5xl h-[85vh] mx-4 flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 모달 헤더 */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border dark:border-border-dark">
          <div className="flex items-center gap-2">
            <Icon name="description" size="sm" className="text-primary" />
            <h3 className="font-semibold text-text dark:text-white">
              산출물 미리보기
            </h3>
          </div>
          <div className="flex items-center gap-2">
            {/* 새 창에서 열기 버튼 */}
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium bg-surface dark:bg-background-dark text-text-secondary hover:text-primary hover:bg-primary/10 transition-colors"
            >
              <Icon name="open_in_new" size="xs" />
              <span>새 창에서 열기</span>
            </a>
            {/* 닫기 버튼 */}
            <button
              onClick={onClose}
              className="size-8 rounded-lg flex items-center justify-center hover:bg-surface dark:hover:bg-background-dark text-text-secondary hover:text-text transition-colors"
            >
              <Icon name="close" size="sm" />
            </button>
          </div>
        </div>
        {/* iframe 컨테이너 */}
        <div className="flex-1 bg-surface dark:bg-background-dark relative">
          {/* 로딩 스피너 */}
          {isLoading && !hasError && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 z-10">
              <div className="size-10 border-3 border-primary/30 border-t-primary rounded-full animate-spin" />
              <p className="text-sm text-text-secondary">문서를 불러오는 중...</p>
            </div>
          )}

          {/* 에러 폴백 */}
          {hasError && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 z-10 p-8">
              <div className="size-16 rounded-full bg-warning/10 flex items-center justify-center">
                <Icon name="error_outline" size="xl" className="text-warning" />
              </div>
              <div className="text-center">
                <p className="font-semibold text-text dark:text-white mb-1">
                  미리보기를 표시할 수 없습니다
                </p>
                <p className="text-sm text-text-secondary max-w-md">
                  이 문서는 iframe 임베딩이 제한되어 있을 수 있습니다.
                  새 창에서 열기를 사용해주세요.
                </p>
              </div>
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-primary text-white hover:bg-primary/90 transition-colors"
              >
                <Icon name="open_in_new" size="xs" />
                <span>새 창에서 열기</span>
              </a>
            </div>
          )}

          <iframe
            src={embedUrl}
            className={`w-full h-full border-0 ${hasError ? "hidden" : ""}`}
            title="산출물 미리보기"
            allow="fullscreen; clipboard-write; clipboard-read"
            referrerPolicy="no-referrer-when-downgrade"
            onLoad={handleLoad}
            onError={handleError}
          />
        </div>
      </div>
    </div>
  );
}
