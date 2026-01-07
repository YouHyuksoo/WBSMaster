/**
 * @file src/components/ui/Card.tsx
 * @description
 * 공통 카드 컴포넌트입니다.
 * 콘텐츠를 감싸는 컨테이너로 사용됩니다.
 *
 * 초보자 가이드:
 * 1. **Card**: 기본 카드 컨테이너
 * 2. **CardHeader**: 카드 상단 영역
 * 3. **CardContent**: 카드 본문 영역
 * 4. **CardFooter**: 카드 하단 영역
 *
 * @example
 * <Card hover>
 *   <CardHeader>
 *     <Icon name="account_tree" className="text-primary" />
 *   </CardHeader>
 *   <CardContent>
 *     <h3>WBS Visualization</h3>
 *     <p>설명 텍스트</p>
 *   </CardContent>
 * </Card>
 */

import { HTMLAttributes, forwardRef } from "react";

/** 카드 컴포넌트 Props */
interface CardProps extends HTMLAttributes<HTMLDivElement> {
  /** 호버 효과 활성화 */
  hover?: boolean;
  /** 패딩 없음 */
  noPadding?: boolean;
}

/**
 * 카드 컴포넌트 - 메인 컨테이너
 */
const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ hover = false, noPadding = false, className = "", children, ...props }, ref) => {
    const baseStyles = "rounded-2xl border border-border bg-card transition-all duration-200";
    const hoverStyles = hover
      ? "hover:shadow-lg hover:border-primary/50"
      : "";
    const paddingStyles = noPadding ? "" : "p-8";

    return (
      <div
        ref={ref}
        className={`${baseStyles} ${hoverStyles} ${paddingStyles} ${className}`}
        {...props}
      >
        {children}
      </div>
    );
  }
);

Card.displayName = "Card";

/**
 * 카드 헤더 - 상단 영역
 */
const CardHeader = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className = "", children, ...props }, ref) => {
    return (
      <div ref={ref} className={`mb-4 ${className}`} {...props}>
        {children}
      </div>
    );
  }
);

CardHeader.displayName = "CardHeader";

/**
 * 카드 콘텐츠 - 본문 영역
 */
const CardContent = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className = "", children, ...props }, ref) => {
    return (
      <div ref={ref} className={`${className}`} {...props}>
        {children}
      </div>
    );
  }
);

CardContent.displayName = "CardContent";

/**
 * 카드 푸터 - 하단 영역
 */
const CardFooter = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className = "", children, ...props }, ref) => {
    return (
      <div ref={ref} className={`mt-4 ${className}`} {...props}>
        {children}
      </div>
    );
  }
);

CardFooter.displayName = "CardFooter";

export { Card, CardHeader, CardContent, CardFooter };
export type { CardProps };
