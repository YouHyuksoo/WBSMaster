/**
 * @file src/app/dashboard/holidays/components/MonthlyCalendar.tsx
 * @description
 * 월간 달력 컴포넌트입니다.
 * 월별 달력 그리드와 일정을 표시합니다.
 *
 * 초보자 가이드:
 * 1. **달력 그리드**: 7열 x 5~6행의 그리드
 * 2. **일정 표시**: 각 날짜 셀에 일정 최대 2개 표시
 * 3. **오늘 표시**: 현재 날짜 강조
 * 4. **일정 등록**: 날짜 셀 hover 시 등록 버튼 표시
 */

"use client";

import { Icon } from "@/components/ui";
import type { Holiday } from "@/lib/api";
import { holidayTypeConfig, dayNames } from "../types";

interface MonthlyCalendarProps {
  /** 현재 년도 */
  year: number;
  /** 현재 월 (0-11) */
  month: number;
  /** 해당 날짜의 일정 목록을 반환하는 함수 */
  getHolidaysForDate: (day: number) => Holiday[];
  /** 일정 클릭 핸들러 */
  onHolidayClick: (holiday: Holiday) => void;
  /** 일정 추가 핸들러 (날짜 문자열: YYYY-MM-DD) */
  onAddHoliday?: (dateStr: string) => void;
}

/**
 * 월간 달력 컴포넌트
 */
export function MonthlyCalendar({
  year,
  month,
  getHolidaysForDate,
  onHolidayClick,
  onAddHoliday,
}: MonthlyCalendarProps) {
  // 월의 첫날과 마지막날
  const firstDayOfMonth = new Date(year, month, 1);
  const lastDayOfMonth = new Date(year, month + 1, 0);
  const daysInMonth = lastDayOfMonth.getDate();
  const startingDay = firstDayOfMonth.getDay();

  // 달력 셀 생성
  const renderCalendarDays = () => {
    const days = [];
    const today = new Date();

    // 이전 달의 빈 칸
    for (let i = 0; i < startingDay; i++) {
      days.push(<div key={`empty-${i}`} className="h-24 bg-surface/50 dark:bg-background-dark/50" />);
    }

    // 현재 달의 날짜
    for (let day = 1; day <= daysInMonth; day++) {
      const isToday = today.getFullYear() === year && today.getMonth() === month && today.getDate() === day;
      const isWeekend = (startingDay + day - 1) % 7 === 0 || (startingDay + day - 1) % 7 === 6;
      const dayHolidays = getHolidaysForDate(day);
      // 날짜 문자열 생성 (YYYY-MM-DD)
      const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

      days.push(
        <div
          key={day}
          className={`group relative h-24 p-2 border-b border-r border-border dark:border-border-dark overflow-hidden transition-colors hover:bg-primary/5 ${
            isWeekend ? "bg-surface/50 dark:bg-background-dark/50" : "bg-background-white dark:bg-surface-dark"
          }`}
        >
          <div className="flex items-center justify-between mb-1">
            <span
              className={`text-sm font-medium ${
                isToday
                  ? "size-6 rounded-full bg-primary text-white flex items-center justify-center"
                  : isWeekend
                  ? "text-error"
                  : "text-text dark:text-white"
              }`}
            >
              {day}
            </span>
            {/* hover 시 일정등록 버튼 표시 */}
            {onAddHoliday && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onAddHoliday(dateStr);
                }}
                className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded bg-primary hover:bg-primary-dark text-white text-[10px] flex items-center gap-0.5 shrink-0"
                title="일정 등록"
              >
                <Icon name="add" size="xs" />
                <span className="hidden sm:inline">등록</span>
              </button>
            )}
          </div>
          <div className="space-y-1">
            {dayHolidays.slice(0, 2).map((holiday) => {
              const config = holidayTypeConfig[holiday.type] || holidayTypeConfig.COMPANY_HOLIDAY;
              return (
                <div
                  key={holiday.id}
                  onClick={() => onHolidayClick(holiday)}
                  className={`text-[10px] px-1.5 py-0.5 rounded truncate ${config.bgColor} text-white flex items-center gap-1 cursor-pointer hover:opacity-80`}
                >
                  {/* 개인 일정인 경우 사용자 아바타 표시 */}
                  {holiday.user?.avatar ? (
                    <img
                      src={holiday.user.avatar}
                      alt={holiday.user.name || "사용자"}
                      className="size-4 rounded-full object-cover shrink-0 border border-white/30"
                    />
                  ) : holiday.user ? (
                    <div className="size-4 rounded-full bg-white/30 flex items-center justify-center shrink-0">
                      <Icon name="person" size="xs" className="text-white text-[8px]" />
                    </div>
                  ) : null}
                  <span className="truncate">{holiday.title}</span>
                </div>
              );
            })}
            {dayHolidays.length > 2 && (
              <div className="text-[10px] text-text-secondary">+{dayHolidays.length - 2}개 더</div>
            )}
          </div>
        </div>
      );
    }

    return days;
  };

  return (
    <>
      {/* 요일 헤더 */}
      <div className="grid grid-cols-7 border-b border-border dark:border-border-dark">
        {dayNames.map((day, index) => (
          <div
            key={day}
            className={`py-3 text-center text-sm font-semibold ${
              index === 0 ? "text-error" : index === 6 ? "text-primary" : "text-text dark:text-white"
            }`}
          >
            {day}
          </div>
        ))}
      </div>
      {/* 달력 그리드 */}
      <div className="grid grid-cols-7">{renderCalendarDays()}</div>
    </>
  );
}
