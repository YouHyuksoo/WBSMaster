/**
 * @file src/components/ui/ConfirmModal.tsx
 * @description
 * 확인/취소 모달 컴포넌트입니다.
 * alert, confirm을 대체하여 일관된 UI를 제공합니다.
 *
 * 초보자 가이드:
 * 1. **isOpen**: 모달 표시 여부
 * 2. **title**: 모달 제목
 * 3. **message**: 확인 메시지
 * 4. **onConfirm**: 확인 버튼 클릭 시 콜백
 * 5. **onCancel**: 취소 버튼 클릭 시 콜백
 * 6. **confirmText**: 확인 버튼 텍스트 (기본: "확인")
 * 7. **cancelText**: 취소 버튼 텍스트 (기본: "취소")
 * 8. **variant**: 모달 타입 ("danger", "warning", "info")
 *
 * @example
 * <ConfirmModal
 *   isOpen={showConfirm}
 *   title="삭제 확인"
 *   message="정말 삭제하시겠습니까?"
 *   onConfirm={handleDelete}
 *   onCancel={() => setShowConfirm(false)}
 *   variant="danger"
 * />
 */

"use client";

import { Icon } from "./Icon";
import { Button } from "./Button";

/** 확인 모달 Props */
export interface ConfirmModalProps {
  /** 모달 표시 여부 */
  isOpen: boolean;
  /** 모달 제목 */
  title: string;
  /** 확인 메시지 */
  message: string;
  /** 확인 버튼 클릭 시 콜백 */
  onConfirm: () => void;
  /** 취소 버튼 클릭 시 콜백 */
  onCancel: () => void;
  /** 확인 버튼 텍스트 */
  confirmText?: string;
  /** 취소 버튼 텍스트 */
  cancelText?: string;
  /** 모달 타입 (색상) */
  variant?: "danger" | "warning" | "info";
  /** 확인 중 로딩 상태 */
  isLoading?: boolean;
}

/**
 * 확인 모달 컴포넌트
 * alert, confirm을 대체하는 UI 컴포넌트
 */
export function ConfirmModal({
  isOpen,
  title,
  message,
  onConfirm,
  onCancel,
  confirmText = "확인",
  cancelText = "취소",
  variant = "info",
  isLoading = false,
}: ConfirmModalProps) {
  if (!isOpen) return null;

  // 타입별 아이콘 및 색상
  const variantConfig = {
    danger: {
      icon: "warning",
      iconColor: "text-error",
      bgColor: "bg-error/10",
      borderColor: "border-error/20",
    },
    warning: {
      icon: "error",
      iconColor: "text-warning",
      bgColor: "bg-warning/10",
      borderColor: "border-warning/20",
    },
    info: {
      icon: "info",
      iconColor: "text-primary",
      bgColor: "bg-primary/10",
      borderColor: "border-primary/20",
    },
  };

  const config = variantConfig[variant];

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 animate-fadeIn">
      <div className="bg-background-white dark:bg-surface-dark rounded-xl shadow-2xl w-full max-w-md transform animate-slideUp">
        {/* 헤더 */}
        <div className="flex items-center justify-between p-5 border-b border-border dark:border-border-dark">
          <div className="flex items-center gap-2">
            <div className={`p-2 rounded-lg ${config.bgColor} border ${config.borderColor}`}>
              <Icon name={config.icon} size="md" className={config.iconColor} />
            </div>
            <h2 className="text-lg font-bold text-text dark:text-white">{title}</h2>
          </div>
          <button
            onClick={onCancel}
            disabled={isLoading}
            className="text-text-secondary hover:text-text dark:hover:text-white transition-colors disabled:opacity-50"
          >
            <Icon name="close" size="md" />
          </button>
        </div>

        {/* 메시지 */}
        <div className="p-6">
          <p className="text-text dark:text-white whitespace-pre-line">{message}</p>
        </div>

        {/* 버튼 */}
        <div className="flex gap-3 p-5 border-t border-border dark:border-border-dark">
          <Button
            type="button"
            variant="ghost"
            fullWidth
            onClick={onCancel}
            disabled={isLoading}
          >
            {cancelText}
          </Button>
          <Button
            type="button"
            variant={variant === "danger" ? "ghost" : "primary"}
            fullWidth
            onClick={onConfirm}
            disabled={isLoading}
            className={variant === "danger" ? "text-error hover:bg-error/10" : ""}
          >
            {isLoading ? "처리 중..." : confirmText}
          </Button>
        </div>
      </div>
    </div>
  );
}
