/**
 * @file src/contexts/ToastContext.tsx
 * @description
 * 토스트 알림을 관리하는 Context입니다.
 * 앱 전체에서 토스트 메시지를 표시할 수 있습니다.
 *
 * 초보자 가이드:
 * 1. **ToastProvider**: 앱 최상위에서 감싸서 사용
 * 2. **useToast**: 토스트 표시 함수 사용
 *
 * @example
 * // 사용법
 * const { showToast } = useToast();
 * showToast("저장되었습니다!", "success");
 */

"use client";

import { createContext, useContext, useState, useCallback, ReactNode } from "react";
import { Icon } from "@/components/ui";

/** 토스트 타입 */
type ToastType = "success" | "error" | "warning" | "info";

/** 토스트 아이템 */
interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

/** 토스트 Context 값 */
interface ToastContextValue {
  showToast: (message: string, type?: ToastType) => void;
  success: (message: string) => void;
  error: (message: string) => void;
  warning: (message: string) => void;
  info: (message: string) => void;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

/**
 * 토스트 Provider
 */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  /**
   * 토스트 표시
   */
  const showToast = useCallback((message: string, type: ToastType = "info") => {
    const id = Math.random().toString(36).slice(2, 11);
    setToasts((prev) => [...prev, { id, message, type }]);

    // 3초 후 자동 제거
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3000);
  }, []);

  /** 성공 토스트 */
  const success = useCallback((message: string) => showToast(message, "success"), [showToast]);

  /** 에러 토스트 */
  const error = useCallback((message: string) => showToast(message, "error"), [showToast]);

  /** 경고 토스트 */
  const warning = useCallback((message: string) => showToast(message, "warning"), [showToast]);

  /** 정보 토스트 */
  const info = useCallback((message: string) => showToast(message, "info"), [showToast]);

  /**
   * 토스트 제거
   */
  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  /**
   * 토스트 타입별 아이콘 및 색상
   */
  const getToastStyle = (type: ToastType) => {
    switch (type) {
      case "success":
        return {
          icon: "check_circle",
          bgColor: "bg-success/10 border-success/30",
          textColor: "text-success",
        };
      case "error":
        return {
          icon: "error",
          bgColor: "bg-error/10 border-error/30",
          textColor: "text-error",
        };
      case "warning":
        return {
          icon: "warning",
          bgColor: "bg-warning/10 border-warning/30",
          textColor: "text-warning",
        };
      case "info":
      default:
        return {
          icon: "info",
          bgColor: "bg-info/10 border-info/30",
          textColor: "text-info",
        };
    }
  };

  return (
    <ToastContext.Provider value={{ showToast, success, error, warning, info }}>
      {children}

      {/* 토스트 컨테이너 */}
      <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2">
        {toasts.map((toast) => {
          const style = getToastStyle(toast.type);
          return (
            <div
              key={toast.id}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg border shadow-lg bg-background-white dark:bg-surface-dark ${style.bgColor} animate-slide-in-right`}
            >
              <Icon name={style.icon} size="sm" className={style.textColor} />
              <span className="text-sm text-text dark:text-white">{toast.message}</span>
              <button
                onClick={() => removeToast(toast.id)}
                className="ml-2 text-text-secondary hover:text-text dark:hover:text-white transition-colors"
              >
                <Icon name="close" size="xs" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

/**
 * 토스트 사용 Hook
 */
export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
}
