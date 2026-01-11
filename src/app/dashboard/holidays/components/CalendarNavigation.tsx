/**
 * @file src/app/dashboard/holidays/components/CalendarNavigation.tsx
 * @description
 * 달력 네비게이션 컴포넌트입니다.
 * 뷰 모드 전환, 이전/다음 이동, 오늘 버튼, 필터를 제공합니다.
 *
 * 초보자 가이드:
 * 1. **뷰 모드 전환**: 월간/주간 버튼
 * 2. **날짜 이동**: 이전/다음 버튼 + 오늘 버튼
 * 3. **유형 필터**: 일정 유형별 필터 버튼
 */

"use client";

import { Icon } from "@/components/ui";
import { ViewMode, holidayTypeConfig, holidayTypeList } from "../types";

interface CalendarNavigationProps {
  /** 현재 뷰 모드 */
  viewMode: ViewMode;
  /** 뷰 모드 변경 핸들러 */
  onViewModeChange: (mode: ViewMode) => void;
  /** 현재 표시 중인 날짜 텍스트 */
  dateLabel: string;
  /** 이전 이동 핸들러 */
  onPrev: () => void;
  /** 다음 이동 핸들러 */
  onNext: () => void;
  /** 오늘로 이동 핸들러 */
  onToday: () => void;
  /** 선택된 일정 유형 필터 */
  selectedType: string;
  /** 일정 유형 필터 변경 핸들러 */
  onTypeChange: (type: string) => void;
}

/**
 * 달력 네비게이션 컴포넌트
 */
export function CalendarNavigation({
  viewMode,
  onViewModeChange,
  dateLabel,
  onPrev,
  onNext,
  onToday,
  selectedType,
  onTypeChange,
}: CalendarNavigationProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-4">
      <div className="flex items-center gap-2">
        {/* 뷰 모드 전환 */}
        <div className="flex rounded-lg border border-border dark:border-border-dark overflow-hidden mr-2">
          <button
            onClick={() => onViewModeChange("month")}
            className={`px-3 py-1.5 text-xs font-medium transition-colors ${
              viewMode === "month"
                ? "bg-primary text-white"
                : "bg-surface dark:bg-surface-dark text-text-secondary hover:text-text dark:hover:text-white"
            }`}
          >
            <Icon name="calendar_month" size="xs" className="mr-1" />
            월간
          </button>
          <button
            onClick={() => onViewModeChange("week")}
            className={`px-3 py-1.5 text-xs font-medium transition-colors border-l border-border dark:border-border-dark ${
              viewMode === "week"
                ? "bg-primary text-white"
                : "bg-surface dark:bg-surface-dark text-text-secondary hover:text-text dark:hover:text-white"
            }`}
          >
            <Icon name="view_week" size="xs" className="mr-1" />
            주간
          </button>
        </div>

        {/* 날짜 이동 */}
        <button
          onClick={onPrev}
          className="p-2 rounded-lg hover:bg-surface dark:hover:bg-surface-dark transition-colors"
        >
          <Icon name="chevron_left" size="sm" className="text-text dark:text-white" />
        </button>
        <h2 className="text-lg font-bold text-text dark:text-white min-w-[180px] text-center">
          {dateLabel}
        </h2>
        <button
          onClick={onNext}
          className="p-2 rounded-lg hover:bg-surface dark:hover:bg-surface-dark transition-colors"
        >
          <Icon name="chevron_right" size="sm" className="text-text dark:text-white" />
        </button>
        <button
          onClick={onToday}
          className="ml-2 px-3 py-1.5 text-sm font-medium text-primary hover:bg-primary/10 rounded-lg transition-colors"
        >
          오늘
        </button>
      </div>

      {/* 유형 필터 */}
      <div className="flex items-center gap-2 flex-wrap">
        {holidayTypeList.map((type) => (
          <button
            key={type}
            onClick={() => onTypeChange(type)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
              selectedType === type
                ? type === "all"
                  ? "bg-primary/10 text-primary"
                  : `${holidayTypeConfig[type]?.bgColor || "bg-primary"} text-white`
                : "bg-surface dark:bg-surface-dark text-text-secondary hover:text-text dark:hover:text-white"
            }`}
          >
            {type === "all" ? "전체" : holidayTypeConfig[type]?.label || type}
          </button>
        ))}
      </div>
    </div>
  );
}
