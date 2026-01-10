/**
 * @file src/components/ui/Modal.tsx
 * @description
 * 범용 모달 다이얼로그 컴포넌트입니다.
 * 다양한 크기와 애니메이션을 지원합니다.
 *
 * 초보자 가이드:
 * 1. **isOpen**: 모달 열림/닫힘 상태
 * 2. **onClose**: 모달 닫기 핸들러
 * 3. **title**: 모달 제목
 * 4. **size**: 모달 크기 (sm, md, lg, xl, full)
 *
 * @example
 * <Modal isOpen={isOpen} onClose={() => setIsOpen(false)} title="모달 제목">
 *   <p>모달 내용</p>
 * </Modal>
 */

"use client";

import React, { useEffect, useCallback } from "react";
import { Icon } from "./Icon";

/** 모달 크기 타입 */
export type ModalSize = "sm" | "md" | "lg" | "xl" | "full";

/** 모달 Props */
export interface ModalProps {
  /** 모달 열림 상태 */
  isOpen: boolean;
  /** 모달 닫기 핸들러 */
  onClose: () => void;
  /** 모달 제목 */
  title?: string;
  /** 모달 크기 */
  size?: ModalSize;
  /** 모달 내용 */
  children: React.ReactNode;
  /** 배경 클릭으로 닫기 허용 여부 */
  closeOnOverlayClick?: boolean;
  /** ESC 키로 닫기 허용 여부 */
  closeOnEscape?: boolean;
  /** 닫기 버튼 표시 여부 */
  showCloseButton?: boolean;
}

/** 모달 크기별 너비 클래스 */
const sizeClasses: Record<ModalSize, string> = {
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-lg",
  xl: "max-w-xl",
  full: "max-w-4xl",
};

/**
 * 범용 모달 컴포넌트
 */
export function Modal({
  isOpen,
  onClose,
  title,
  size = "md",
  children,
  closeOnOverlayClick = true,
  closeOnEscape = true,
  showCloseButton = true,
}: ModalProps) {
  // ESC 키 핸들러
  const handleEscape = useCallback(
    (e: KeyboardEvent) => {
      if (closeOnEscape && e.key === "Escape") {
        onClose();
      }
    },
    [closeOnEscape, onClose]
  );

  // ESC 키 이벤트 등록
  useEffect(() => {
    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
      // 스크롤 방지
      document.body.style.overflow = "hidden";
    }

    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "";
    };
  }, [isOpen, handleEscape]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* 오버레이 */}
      <div
        className="absolute inset-0 bg-black/50 transition-opacity"
        onClick={closeOnOverlayClick ? onClose : undefined}
      />

      {/* 모달 컨텐츠 */}
      <div
        className={`
          relative w-full ${sizeClasses[size]}
          bg-background-white dark:bg-surface-dark
          rounded-xl shadow-xl
          transform transition-all
          animate-in fade-in zoom-in-95 duration-200
        `}
      >
        {/* 헤더 */}
        {(title || showCloseButton) && (
          <div className="flex items-center justify-between px-6 py-4 border-b border-border dark:border-border-dark">
            {title && (
              <h2 className="text-lg font-bold text-text dark:text-white">
                {title}
              </h2>
            )}
            {showCloseButton && (
              <button
                onClick={onClose}
                className="p-1 rounded-lg hover:bg-surface dark:hover:bg-background-dark transition-colors ml-auto"
              >
                <Icon name="close" size="sm" className="text-text-secondary" />
              </button>
            )}
          </div>
        )}

        {/* 본문 */}
        <div className="p-6 max-h-[calc(100vh-200px)] overflow-y-auto">
          {children}
        </div>
      </div>
    </div>
  );
}

export default Modal;
