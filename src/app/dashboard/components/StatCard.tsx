/**
 * @file src/app/dashboard/components/StatCard.tsx
 * @description
 * 대시보드 통계 카드 컴포넌트입니다.
 * React.memo로 감싸서 props가 변경되지 않으면 리렌더링하지 않습니다.
 *
 * 기능:
 * - 통계 값 표시 (아이콘, 제목, 값)
 * - 클릭 시 페이지 이동
 * - 호버 시 툴팁 표시
 * - 등장 애니메이션
 */

"use client";

import React, { memo, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/ui";

/**
 * 통계 카드 Props
 */
export interface StatCardProps {
  /** 카드 제목 */
  title: string;
  /** 통계 값 */
  value: string | number;
  /** 아이콘 이름 (Material Icons) */
  icon: string;
  /** 아이콘 배경색 클래스 */
  iconBgColor: string;
  /** 아이콘 색상 클래스 */
  iconColor: string;
  /** 변화량 텍스트 */
  change?: string;
  /** 변화 방향 (증가/감소) */
  changeType?: "up" | "down";
  /** 클릭 시 이동할 경로 */
  href?: string;
  /** 툴팁 텍스트 */
  tooltip?: string;
  /** 애니메이션 딜레이 (staggered animation) */
  animationDelay?: number;
}

/**
 * 통계 카드 컴포넌트 - 클릭 가능, 호버 효과, 애니메이션 적용
 */
const StatCard = memo(function StatCard({
  title,
  value,
  icon,
  iconBgColor,
  iconColor,
  change,
  changeType,
  href,
  tooltip,
  animationDelay = 0,
}: StatCardProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);
  const router = useRouter();

  /** 마운트 시 애니메이션 트리거 */
  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), animationDelay);
    return () => clearTimeout(timer);
  }, [animationDelay]);

  /** 카드 클릭 핸들러 */
  const handleClick = () => {
    if (href) router.push(href);
  };

  return (
    <div
      onClick={handleClick}
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
      className={`
        relative bg-background-white dark:bg-surface-dark border border-border dark:border-border-dark rounded-xl p-5
        flex items-center gap-4
        transform transition-all duration-500 ease-out
        ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}
        ${href ? "cursor-pointer hover:border-primary hover:shadow-lg hover:shadow-primary/10 hover:scale-[1.02] active:scale-[0.98]" : ""}
      `}
    >
      {/* 툴팁 */}
      {tooltip && showTooltip && (
        <div className="absolute -top-10 left-1/2 -translate-x-1/2 px-3 py-1.5 bg-slate-900 dark:bg-slate-700 text-white text-xs rounded-lg shadow-lg z-50 whitespace-nowrap animate-fadeIn">
          {tooltip}
          <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-900 dark:border-t-slate-700" />
        </div>
      )}

      <div
        className={`size-12 rounded-xl ${iconBgColor} flex items-center justify-center shrink-0 transition-transform duration-300 group-hover:scale-110`}
      >
        <Icon name={icon} size="md" className={iconColor} />
      </div>
      <div>
        <p className="text-sm text-text-secondary font-medium">{title}</p>
        <div className="flex items-baseline gap-2">
          <p className="text-2xl font-bold text-text dark:text-white">{value}</p>
          {change && (
            <span
              className={`text-xs font-medium ${
                changeType === "up" ? "text-success" : "text-error"
              }`}
            >
              {changeType === "up" ? "+" : "-"}
              {change}
            </span>
          )}
        </div>
      </div>

      {/* 클릭 가능 표시 */}
      {href && (
        <Icon name="arrow_forward" size="sm" className="absolute right-4 top-1/2 -translate-y-1/2 text-text-secondary opacity-0 group-hover:opacity-100 transition-opacity" />
      )}
    </div>
  );
});

export default StatCard;
