/**
 * @file src/components/ui/Button.tsx
 * @description
 * 공통 버튼 컴포넌트입니다.
 * 다양한 스타일 변형(variant)과 크기(size)를 지원합니다.
 *
 * 초보자 가이드:
 * 1. **variant**: 버튼 스타일 (primary, secondary, ghost, outline)
 * 2. **size**: 버튼 크기 (sm, md, lg)
 * 3. **leftIcon/rightIcon**: 버튼 양쪽에 아이콘 추가
 *
 * @example
 * <Button variant="primary" size="lg">
 *   Get Started for Free
 * </Button>
 *
 * <Button variant="secondary" leftIcon="play_circle">
 *   Watch Demo
 * </Button>
 */

import { ButtonHTMLAttributes, forwardRef } from "react";

/** 버튼 스타일 변형 */
type ButtonVariant = "primary" | "secondary" | "ghost" | "outline";

/** 버튼 크기 */
type ButtonSize = "sm" | "md" | "lg";

/** 버튼 컴포넌트 Props */
interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** 버튼 스타일 변형 */
  variant?: ButtonVariant;
  /** 버튼 크기 */
  size?: ButtonSize;
  /** 왼쪽 아이콘 (Material Symbols 이름) */
  leftIcon?: string;
  /** 오른쪽 아이콘 (Material Symbols 이름) */
  rightIcon?: string;
  /** 로딩 상태 */
  isLoading?: boolean;
  /** 전체 너비 사용 */
  fullWidth?: boolean;
}

/** 버튼 변형별 스타일 클래스 */
const variantStyles: Record<ButtonVariant, string> = {
  primary:
    "bg-primary text-white shadow-lg shadow-primary/25 hover:bg-primary-hover hover:-translate-y-0.5",
  secondary:
    "bg-card border border-border text-text hover:bg-card-hover",
  ghost:
    "bg-transparent text-text hover:bg-black/5 dark:hover:bg-white/5",
  outline:
    "bg-transparent border border-border text-text hover:bg-card-hover hover:border-border-hover",
};

/** 버튼 크기별 스타일 클래스 */
const sizeStyles: Record<ButtonSize, string> = {
  sm: "h-9 px-4 text-sm",
  md: "h-10 px-6 text-sm",
  lg: "h-12 px-8 text-base",
};

/**
 * 버튼 컴포넌트
 * @param props - 버튼 속성
 */
const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = "primary",
      size = "md",
      leftIcon,
      rightIcon,
      isLoading = false,
      fullWidth = false,
      className = "",
      children,
      disabled,
      ...props
    },
    ref
  ) => {
    // 기본 스타일 클래스
    const baseStyles =
      "inline-flex items-center justify-center gap-2 rounded-lg font-bold transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:transform-none";

    // 전체 너비 스타일
    const widthStyle = fullWidth ? "w-full" : "";

    return (
      <button
        ref={ref}
        className={`${baseStyles} ${variantStyles[variant]} ${sizeStyles[size]} ${widthStyle} ${className}`}
        disabled={disabled || isLoading}
        {...props}
      >
        {/* 로딩 스피너 */}
        {isLoading && (
          <span className="material-symbols-outlined animate-spin text-[20px]">
            progress_activity
          </span>
        )}

        {/* 왼쪽 아이콘 */}
        {!isLoading && leftIcon && (
          <span className="material-symbols-outlined text-[20px]">
            {leftIcon}
          </span>
        )}

        {/* 버튼 텍스트 */}
        {children}

        {/* 오른쪽 아이콘 */}
        {rightIcon && (
          <span className="material-symbols-outlined text-[20px]">
            {rightIcon}
          </span>
        )}
      </button>
    );
  }
);

Button.displayName = "Button";

export { Button };
export type { ButtonProps, ButtonVariant, ButtonSize };
