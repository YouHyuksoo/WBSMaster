/**
 * @file src/app/dashboard/as-is-analysis/components/SectionHeader.tsx
 * @description
 * 섹션 헤더 컴포넌트입니다.
 * 각 섹션의 제목, 아이콘, 배지를 표시합니다.
 *
 * 초보자 가이드:
 * 1. **아이콘**: Material Symbols 아이콘 표시
 * 2. **제목**: 한글/영문 제목
 * 3. **배지**: 필수/조건부 표시
 */

"use client";

import { Icon } from "@/components/ui";
import type { SectionStyleConfig } from "../constants";

interface SectionHeaderProps {
  /** 섹션 스타일 설정 */
  style: SectionStyleConfig;
  /** 제목 (커스텀) */
  title?: string;
  /** 필수 여부 */
  isRequired?: boolean;
  /** 조건부 여부 */
  isConditional?: boolean;
  /** 접기/펴기 가능 여부 */
  collapsible?: boolean;
  /** 접힌 상태 */
  isCollapsed?: boolean;
  /** 토글 핸들러 */
  onToggle?: () => void;
  /** 우측 추가 요소 */
  rightElement?: React.ReactNode;
}

/**
 * 섹션 헤더 컴포넌트
 */
export function SectionHeader({
  style,
  title,
  isRequired = false,
  isConditional = false,
  collapsible = false,
  isCollapsed = false,
  onToggle,
  rightElement,
}: SectionHeaderProps) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        {/* 접기/펴기 버튼 */}
        {collapsible && (
          <button
            onClick={onToggle}
            className="p-0.5 rounded hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
          >
            <Icon
              name={isCollapsed ? "chevron_right" : "expand_more"}
              size="sm"
              className="text-text-secondary"
            />
          </button>
        )}

        {/* 아이콘 */}
        <div
          className={`size-8 rounded-lg flex items-center justify-center`}
          style={{ backgroundColor: `${style.color}15` }}
        >
          <Icon
            name={style.icon}
            size="sm"
            style={{ color: style.color }}
          />
        </div>

        {/* 제목 */}
        <div>
          <h3 className="text-base font-bold text-text dark:text-white">
            {title || style.label}
          </h3>
          <span className="text-xs text-text-secondary uppercase tracking-wider">
            {style.labelEn}
          </span>
        </div>

        {/* 배지 */}
        {isRequired && (
          <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300">
            필수
          </span>
        )}
        {isConditional && (
          <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300">
            조건부
          </span>
        )}
      </div>

      {/* 우측 요소 */}
      {rightElement}
    </div>
  );
}
