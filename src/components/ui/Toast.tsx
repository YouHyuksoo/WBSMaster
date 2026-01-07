/**
 * @file src/components/ui/Toast.tsx
 * @description
 * 모던한 토스트 알림 컴포넌트입니다.
 * 성공, 에러, 경고, 정보 등의 메시지를 화면 중앙 상단에서 표시합니다.
 *
 * 초보자 가이드:
 * 1. **ToastProvider**: 앱 최상위에 배치하여 토스트 기능 활성화
 * 2. **useToast**: 토스트를 표시하는 훅
 *    - toast.success("성공!") - 성공 메시지
 *    - toast.error("실패!") - 에러 메시지
 *    - toast.warning("주의!") - 경고 메시지
 *    - toast.info("정보") - 정보 메시지
 *
 * @example
 * const toast = useToast();
 * toast.success("저장되었습니다!");
 * toast.error("업로드에 실패했습니다.");
 */

"use client";

import { createContext, useContext, useState, useCallback, useEffect } from "react";
import { Icon } from "./Icon";

/** 토스트 타입 */
type ToastType = "success" | "error" | "warning" | "info";

/** 토스트 아이템 인터페이스 */
interface ToastItem {
  id: string;
  type: ToastType;
  title?: string;
  message: string;
  duration?: number;
}

/** 토스트 컨텍스트 인터페이스 */
interface ToastContextType {
  toasts: ToastItem[];
  addToast: (toast: Omit<ToastItem, "id">) => void;
  removeToast: (id: string) => void;
  success: (message: string, title?: string) => void;
  error: (message: string, title?: string) => void;
  warning: (message: string, title?: string) => void;
  info: (message: string, title?: string) => void;
}

/** 토스트 타입별 설정 (모던 다크 스타일) */
const toastConfig: Record<ToastType, { icon: string; accentColor: string; iconBg: string }> = {
  success: {
    icon: "check_circle",
    accentColor: "from-emerald-500 to-green-500",
    iconBg: "bg-emerald-500/20 text-emerald-400",
  },
  error: {
    icon: "error",
    accentColor: "from-red-500 to-rose-500",
    iconBg: "bg-red-500/20 text-red-400",
  },
  warning: {
    icon: "warning",
    accentColor: "from-amber-500 to-orange-500",
    iconBg: "bg-amber-500/20 text-amber-400",
  },
  info: {
    icon: "info",
    accentColor: "from-blue-500 to-cyan-500",
    iconBg: "bg-blue-500/20 text-blue-400",
  },
};

/** 토스트 컨텍스트 */
const ToastContext = createContext<ToastContextType | null>(null);

/**
 * 토스트 훅
 * @returns 토스트 컨텍스트
 */
export function useToast(): ToastContextType {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
}

/**
 * 개별 토스트 아이템 컴포넌트 (모던 스타일)
 */
function ToastItemComponent({
  toast,
  onRemove,
}: {
  toast: ToastItem;
  onRemove: (id: string) => void;
}) {
  const config = toastConfig[toast.type];
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    const duration = toast.duration ?? 4000;
    const timer = setTimeout(() => {
      setIsExiting(true);
      setTimeout(() => onRemove(toast.id), 300);
    }, duration);

    return () => clearTimeout(timer);
  }, [toast.id, toast.duration, onRemove]);

  const handleClose = () => {
    setIsExiting(true);
    setTimeout(() => onRemove(toast.id), 300);
  };

  return (
    <div
      className={`
        relative overflow-hidden
        flex items-center gap-4 px-5 py-4
        bg-slate-900/95 dark:bg-slate-800/95
        backdrop-blur-xl
        border border-slate-700/50 dark:border-slate-600/50
        rounded-2xl shadow-2xl shadow-black/20
        min-w-[360px] max-w-md
        transition-all duration-300 ease-out
        ${isExiting
          ? "opacity-0 -translate-y-4 scale-95"
          : "opacity-100 translate-y-0 scale-100 animate-toast-in"
        }
      `}
      role="alert"
    >
      {/* 상단 그라데이션 악센트 바 */}
      <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${config.accentColor}`} />

      {/* 아이콘 */}
      <div className={`flex-shrink-0 size-11 rounded-xl ${config.iconBg} flex items-center justify-center`}>
        <Icon name={config.icon} size="md" />
      </div>

      {/* 내용 */}
      <div className="flex-1 min-w-0 pr-2">
        {toast.title && (
          <h4 className="font-bold text-white text-base mb-0.5">
            {toast.title}
          </h4>
        )}
        <p className="text-sm text-slate-300 break-words leading-relaxed">
          {toast.message}
        </p>
      </div>

      {/* 닫기 버튼 */}
      <button
        onClick={handleClose}
        className="flex-shrink-0 size-8 rounded-lg bg-slate-700/50 hover:bg-slate-600/50 flex items-center justify-center text-slate-400 hover:text-white transition-all"
      >
        <Icon name="close" size="sm" />
      </button>

      {/* 프로그레스 바 */}
      <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-slate-700/50">
        <div
          className={`h-full bg-gradient-to-r ${config.accentColor} animate-toast-progress`}
          style={{
            animationDuration: `${toast.duration ?? 4000}ms`,
          }}
        />
      </div>
    </div>
  );
}

/**
 * 토스트 프로바이더
 * 앱 최상위에 배치하여 전역에서 토스트 사용 가능
 */
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  /** 토스트 추가 */
  const addToast = useCallback((toast: Omit<ToastItem, "id">) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    setToasts((prev) => [...prev, { ...toast, id }]);
  }, []);

  /** 토스트 제거 */
  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  /** 성공 토스트 */
  const success = useCallback(
    (message: string, title?: string) => {
      addToast({ type: "success", message, title });
    },
    [addToast]
  );

  /** 에러 토스트 */
  const error = useCallback(
    (message: string, title?: string) => {
      addToast({ type: "error", message, title, duration: 6000 });
    },
    [addToast]
  );

  /** 경고 토스트 */
  const warning = useCallback(
    (message: string, title?: string) => {
      addToast({ type: "warning", message, title, duration: 5000 });
    },
    [addToast]
  );

  /** 정보 토스트 */
  const info = useCallback(
    (message: string, title?: string) => {
      addToast({ type: "info", message, title });
    },
    [addToast]
  );

  return (
    <ToastContext.Provider
      value={{ toasts, addToast, removeToast, success, error, warning, info }}
    >
      {children}

      {/* 토스트 컨테이너 - 중앙 상단 */}
      <div
        className="fixed top-6 left-1/2 -translate-x-1/2 z-[100] flex flex-col items-center gap-3 pointer-events-none"
        aria-live="polite"
      >
        {toasts.map((toast) => (
          <div key={toast.id} className="pointer-events-auto">
            <ToastItemComponent toast={toast} onRemove={removeToast} />
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
