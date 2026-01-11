/**
 * @file src/app/dashboard/holidays/components/HolidayList.tsx
 * @description
 * 일정 목록 컴포넌트입니다.
 * 월간/주간 뷰에 따라 해당 기간의 일정 목록을 표시합니다.
 *
 * 초보자 가이드:
 * 1. **일정 목록**: 날짜순 정렬된 일정 리스트
 * 2. **일정 카드**: 유형별 아이콘/색상, 담당자 표시
 * 3. **액션 버튼**: 수정/삭제 버튼 (호버 시 표시)
 */

"use client";

import { Icon } from "@/components/ui";
import type { Holiday } from "@/lib/api";
import { holidayTypeConfig, dayNames } from "../types";

interface HolidayListProps {
  /** 일정 목록 */
  holidays: Holiday[];
  /** 목록 제목 */
  title: string;
  /** 일정 클릭 핸들러 */
  onHolidayClick: (holiday: Holiday) => void;
  /** 일정 삭제 핸들러 */
  onHolidayDelete: (id: string) => void;
}

/**
 * 일정 목록 컴포넌트
 */
export function HolidayList({
  holidays,
  title,
  onHolidayClick,
  onHolidayDelete,
}: HolidayListProps) {
  return (
    <div className="bg-background-white dark:bg-surface-dark border border-border dark:border-border-dark rounded-xl p-4">
      <h3 className="font-bold text-text dark:text-white mb-4">{title}</h3>
      <div className="space-y-3 max-h-[500px] overflow-y-auto">
        {holidays.length === 0 ? (
          <p className="text-sm text-text-secondary text-center py-4">휴무일이 없습니다</p>
        ) : (
          holidays
            .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
            .map((holiday) => {
              const config = holidayTypeConfig[holiday.type] || holidayTypeConfig.COMPANY_HOLIDAY;
              const date = new Date(holiday.date);
              return (
                <div
                  key={holiday.id}
                  className="flex items-start gap-3 p-3 rounded-lg bg-surface dark:bg-background-dark group hover:bg-surface-hover dark:hover:bg-surface-dark transition-colors cursor-pointer"
                  onClick={() => onHolidayClick(holiday)}
                >
                  {/* 아바타 또는 유형 아이콘 */}
                  {holiday.user?.avatar ? (
                    <img
                      src={holiday.user.avatar}
                      alt={holiday.user.name || "사용자"}
                      className="size-8 rounded-full object-cover shrink-0"
                    />
                  ) : (
                    <div className={`size-8 rounded-lg flex items-center justify-center shrink-0 ${config.bgColor}`}>
                      <Icon name={config.icon} size="sm" className="text-white" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-text dark:text-white truncate">
                        {holiday.title}
                      </p>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${config.bgColor} text-white shrink-0`}>
                        {config.label}
                      </span>
                    </div>
                    <p className="text-xs text-text-secondary mt-0.5">
                      {date.getMonth() + 1}/{date.getDate()} ({dayNames[date.getDay()]})
                      {!holiday.isAllDay && holiday.startTime && ` ${holiday.startTime}`}
                    </p>
                    {/* 사용자 이름 표시 */}
                    {holiday.user && (
                      <p className="text-xs text-primary mt-0.5 flex items-center gap-1">
                        <Icon name="person" size="xs" />
                        {holiday.user.name || holiday.user.email}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onHolidayClick(holiday);
                      }}
                      className="p-1 hover:bg-primary/10 rounded"
                      title="수정"
                    >
                      <Icon name="edit" size="xs" className="text-primary" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onHolidayDelete(holiday.id);
                      }}
                      className="p-1 hover:bg-error/10 rounded"
                      title="삭제"
                    >
                      <Icon name="close" size="xs" className="text-error" />
                    </button>
                  </div>
                </div>
              );
            })
        )}
      </div>
    </div>
  );
}

/**
 * 범례 컴포넌트
 */
export function HolidayLegend() {
  return (
    <div className="mt-4 bg-background-white dark:bg-surface-dark border border-border dark:border-border-dark rounded-xl p-4">
      <h3 className="font-bold text-text dark:text-white mb-3">범례</h3>
      <div className="space-y-2">
        {Object.entries(holidayTypeConfig).map(([type, config]) => (
          <div key={type} className="flex items-center gap-2">
            <div className={`size-3 rounded ${config.bgColor}`} />
            <span className="text-sm text-text dark:text-white">{config.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
