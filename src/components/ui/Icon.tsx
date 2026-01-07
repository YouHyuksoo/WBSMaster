/**
 * @file src/components/ui/Icon.tsx
 * @description
 * Material Symbols Outlined 아이콘을 쉽게 사용하기 위한 래퍼 컴포넌트입니다.
 *
 * 초보자 가이드:
 * 1. **name**: Material Symbols 아이콘 이름 (예: "account_tree", "home")
 * 2. **size**: 아이콘 크기 (sm, md, lg, xl)
 * 3. **filled**: 채워진 스타일 사용 여부
 *
 * 아이콘 찾기:
 * - https://fonts.google.com/icons?icon.set=Material+Symbols
 *
 * @example
 * <Icon name="account_tree" size="lg" className="text-primary" />
 * <Icon name="home" filled />
 */

import { HTMLAttributes, forwardRef } from "react";

/** 아이콘 크기 */
type IconSize = "xs" | "sm" | "md" | "lg" | "xl" | "2xl";

/** 아이콘 컴포넌트 Props */
interface IconProps extends HTMLAttributes<HTMLSpanElement> {
  /** Material Symbols 아이콘 이름 */
  name: string;
  /** 아이콘 크기 */
  size?: IconSize;
  /** 채워진 스타일 */
  filled?: boolean;
}

/** 아이콘 크기별 스타일 */
const sizeStyles: Record<IconSize, string> = {
  xs: "text-[16px]",
  sm: "text-[20px]",
  md: "text-[24px]",
  lg: "text-[28px]",
  xl: "text-[32px]",
  "2xl": "text-[40px]",
};

/**
 * 아이콘 컴포넌트
 * @param props - 아이콘 속성
 */
const Icon = forwardRef<HTMLSpanElement, IconProps>(
  ({ name, size = "md", filled = false, className = "", ...props }, ref) => {
    const filledStyle = filled ? "filled" : "";

    return (
      <span
        ref={ref}
        className={`material-symbols-outlined ${sizeStyles[size]} ${filledStyle} ${className}`}
        {...props}
      >
        {name}
      </span>
    );
  }
);

Icon.displayName = "Icon";

export { Icon };
export type { IconProps, IconSize };
