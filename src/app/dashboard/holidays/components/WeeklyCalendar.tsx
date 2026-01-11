/**
 * @file src/app/dashboard/holidays/components/WeeklyCalendar.tsx
 * @description
 * 주간 달력 컴포넌트입니다.
 * 주별 달력 그리드와 일정을 세로로 표시합니다.
 *
 * 초보자 가이드:
 * 1. **주간 그리드**: 7열의 세로 레이아웃
 * 2. **일정 카드**: 각 날짜 열에 일정 카드 표시
 * 3. **오늘 표시**: 현재 날짜 강조
 * 4. **일정 등록**: 날짜 영역 hover 시 등록 버튼 표시
 */

"use client";

import { Icon } from "@/components/ui";
import type { Holiday } from "@/lib/api";
import { holidayTypeConfig, dayNames } from "../types";

interface WeeklyCalendarProps {
  /** 주간 날짜 배열 (7일) */
  weekDays: Date[];
  /** 해당 날짜의 일정 목록을 반환하는 함수 */
  getHolidaysForDate: (date: Date) => Holiday[];
  /** 일정 클릭 핸들러 */
  onHolidayClick: (holiday: Holiday) => void;
  /** 일정 추가 핸들러 (날짜 문자열: YYYY-MM-DD) */
  onAddHoliday?: (dateStr: string) => void;
}

/**
 * 날짜를 YYYY-MM-DD 문자열로 변환
 */
const formatDateStr = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

/**
 * 주간 달력 컴포넌트
 */
export function WeeklyCalendar({
  weekDays,
  getHolidaysForDate,
  onHolidayClick,
  onAddHoliday,
}: WeeklyCalendarProps) {
  return (
    <>
      {/* 주간 뷰: 요일 헤더 (날짜 포함) */}
      <div className="grid grid-cols-7 border-b border-border dark:border-border-dark">
        {weekDays.map((date, index) => {
          const isToday = date.toDateString() === new Date().toDateString();
          return (
            <div
              key={index}
              className={`py-3 text-center ${
                index === 0 ? "text-error" : index === 6 ? "text-primary" : "text-text dark:text-white"
              }`}
            >
              <div className="text-xs text-text-secondary">{dayNames[index]}</div>
              <div className={`text-lg font-bold ${isToday ? "bg-primary text-white rounded-full w-8 h-8 flex items-center justify-center mx-auto" : ""}`}>
                {date.getDate()}
              </div>
            </div>
          );
        })}
      </div>

      {/* 주간 뷰: 일정 그리드 */}
      <div className="grid grid-cols-7 min-h-[400px]">
        {weekDays.map((date, dayIndex) => {
          const dayHolidays = getHolidaysForDate(date);
          const isToday = date.toDateString() === new Date().toDateString();
          const dateStr = formatDateStr(date);
          return (
            <div
              key={dayIndex}
              className={`group relative border-r border-border dark:border-border-dark last:border-r-0 p-2 min-h-[400px] transition-colors hover:bg-primary/5 ${
                isToday ? "bg-primary/5" : ""
              } ${dayIndex === 0 ? "bg-error/5" : dayIndex === 6 ? "bg-primary/5" : ""}`}
            >
              {/* hover 시 일정등록 버튼 표시 */}
              {onAddHoliday && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onAddHoliday(dateStr);
                  }}
                  className="opacity-0 group-hover:opacity-100 transition-opacity absolute top-2 right-2 p-1.5 rounded bg-primary hover:bg-primary-dark text-white text-[10px] flex items-center gap-0.5 z-10"
                  title="일정 등록"
                >
                  <Icon name="add" size="xs" />
                  <span>등록</span>
                </button>
              )}
              {dayHolidays.length === 0 ? (
                <p className="text-xs text-text-secondary text-center py-4">-</p>
              ) : (
                <div className="space-y-2">
                  {dayHolidays.map((holiday) => {
                    const config = holidayTypeConfig[holiday.type] || holidayTypeConfig.COMPANY_HOLIDAY;
                    return (
                      <div
                        key={holiday.id}
                        onClick={() => onHolidayClick(holiday)}
                        className={`p-2 rounded-lg cursor-pointer hover:opacity-80 transition-opacity ${config.bgColor}`}
                      >
                        <p className="text-xs font-medium text-white truncate">{holiday.title}</p>
                        {!holiday.isAllDay && holiday.startTime && (
                          <p className="text-[10px] text-white/80 mt-0.5">{holiday.startTime}</p>
                        )}
                        {holiday.user && (
                          <p className="text-[10px] text-white/70 mt-0.5 truncate">
                            {holiday.user.name || holiday.user.email}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </>
  );
}
