/**
 * @file src/app/dashboard/wbs/components/modals/DeliverablePreviewModal.tsx
 * @description
 * 산출물 미리보기 모달 컴포넌트입니다.
 * OneDrive/SharePoint 문서를 iframe으로 임베드하여 표시합니다.
 *
 * 초보자 가이드:
 * 1. **url**: 미리보기할 산출물 URL
 * 2. **onClose**: 모달 닫기 핸들러
 *
 * 수정 방법:
 * - iframe 옵션 변경: sandbox, allow 속성 수정
 * - 크기 변경: max-w, h 클래스 수정
 */

"use client";

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
  if (!url) return null;

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
      <div className="bg-background-white dark:bg-surface-dark rounded-xl w-full max-w-5xl h-[85vh] mx-4 flex flex-col overflow-hidden">
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
        <div className="flex-1 bg-surface dark:bg-background-dark">
          <iframe
            src={getEmbedUrl(url)}
            className="w-full h-full border-0"
            title="산출물 미리보기"
            allow="fullscreen"
            sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
          />
        </div>
      </div>
    </div>
  );
}
