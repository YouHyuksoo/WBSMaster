/**
 * @file src/components/ui/Input.tsx
 * @description
 * 공통 입력 필드 컴포넌트입니다.
 * 아이콘, 에러 상태, 비밀번호 토글 등을 지원합니다.
 *
 * 초보자 가이드:
 * 1. **leftIcon**: 입력 필드 왼쪽에 표시할 아이콘
 * 2. **error**: 에러 메시지 (표시 시 빨간색 테두리)
 * 3. **type="password"**: 비밀번호 보기/숨기기 토글 자동 추가
 *
 * @example
 * <Input
 *   label="이메일"
 *   type="email"
 *   leftIcon="mail"
 *   placeholder="name@company.com"
 * />
 *
 * <Input
 *   label="비밀번호"
 *   type="password"
 *   leftIcon="lock"
 * />
 */

"use client";

import { InputHTMLAttributes, forwardRef, useState } from "react";
import { Icon } from "./Icon";

/** Input 컴포넌트 Props */
interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  /** 입력 필드 라벨 */
  label?: string;
  /** 왼쪽 아이콘 (Material Symbols 이름) */
  leftIcon?: string;
  /** 에러 메시지 */
  error?: string;
  /** 도움말 텍스트 */
  helperText?: string;
}

/**
 * Input 컴포넌트
 */
const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      label,
      leftIcon,
      error,
      helperText,
      type = "text",
      className = "",
      id,
      ...props
    },
    ref
  ) => {
    const [showPassword, setShowPassword] = useState(false);
    const isPassword = type === "password";
    const inputId = id || label?.toLowerCase().replace(/\s/g, "-");

    // 실제 input type (비밀번호 토글 고려)
    const inputType = isPassword ? (showPassword ? "text" : "password") : type;

    // 기본 입력 필드 스타일
    const inputStyles = `
      block w-full rounded-lg border-0
      bg-[#f0f2f4] dark:bg-[#1c2730]
      py-3.5 text-text dark:text-white
      shadow-sm ring-1 ring-inset
      ${error ? "ring-error" : "ring-transparent"}
      placeholder:text-text-secondary
      focus:ring-2 focus:ring-inset focus:ring-primary
      focus:bg-background-white dark:focus:bg-[#1c2730]
      transition-all text-sm
      ${leftIcon ? "pl-11" : "pl-4"}
      ${isPassword ? "pr-12" : "pr-4"}
    `;

    return (
      <div className={className}>
        {/* 라벨 */}
        {label && (
          <label
            htmlFor={inputId}
            className="block text-sm font-medium text-text dark:text-gray-200 mb-2"
          >
            {label}
          </label>
        )}

        {/* 입력 필드 컨테이너 */}
        <div className="relative">
          {/* 왼쪽 아이콘 */}
          {leftIcon && (
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4 text-text-secondary">
              <Icon name={leftIcon} size="sm" />
            </div>
          )}

          {/* 입력 필드 */}
          <input
            ref={ref}
            id={inputId}
            type={inputType}
            className={inputStyles}
            {...props}
          />

          {/* 비밀번호 토글 버튼 */}
          {isPassword && (
            <button
              type="button"
              className="absolute inset-y-0 right-0 flex items-center pr-4 text-text-secondary hover:text-text transition-colors"
              onClick={() => setShowPassword(!showPassword)}
            >
              <Icon name={showPassword ? "visibility_off" : "visibility"} size="sm" />
            </button>
          )}
        </div>

        {/* 에러 메시지 */}
        {error && (
          <p className="mt-2 text-sm text-error">{error}</p>
        )}

        {/* 도움말 텍스트 */}
        {helperText && !error && (
          <p className="mt-2 text-sm text-text-secondary">{helperText}</p>
        )}
      </div>
    );
  }
);

Input.displayName = "Input";

export { Input };
export type { InputProps };
