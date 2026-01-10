/**
 * @file src/components/dashboard/TimelineHeader.tsx
 * @description
 * 타임라인 월별 헤더 컴포넌트입니다.
 * 프로젝트 기간에 맞춰 월별 구분선과 레이블을 표시합니다.
 * 오늘 날짜 표시선(NOW)도 포함됩니다.
 *
 * 초보자 가이드:
 * 1. **startDate, endDate**: 타임라인 시작/종료 날짜
 * 2. **months**: 계산된 월 목록 (시작~종료 사이의 모든 월)
 * 3. **labelWidth**: 왼쪽 행 라벨 영역 너비 (px)
 *
 * 수정 방법:
 * - 월 레이블 스타일 변경: 월 레이블 div의 클래스 수정
 * - 라벨 너비 변경: labelWidth prop 조정
 */

"use client";

import { useMemo } from "react";

interface TimelineHeaderProps {
  /** 타임라인 시작 날짜 */
  startDate: Date;
  /** 타임라인 종료 날짜 */
  endDate: Date;
  /** 왼쪽 라벨 영역 너비 (px) */
  labelWidth?: number;
  /** 오늘 날짜 표시선 렌더링 여부 */
  showTodayLine?: boolean;
}

/**
 * 두 날짜 사이의 월 목록 생성
 */
function getMonthsBetween(start: Date, end: Date) {
  const months: { year: number; month: number; label: string }[] = [];
  const current = new Date(start.getFullYear(), start.getMonth(), 1);
  const endMonth = new Date(end.getFullYear(), end.getMonth(), 1);

  while (current <= endMonth) {
    months.push({
      year: current.getFullYear(),
      month: current.getMonth(),
      label: `${current.getMonth() + 1}월`,
    });
    current.setMonth(current.getMonth() + 1);
  }

  return months;
}

/**
 * 날짜로부터 ISO 주차 계산 (ISO 8601)
 */
function getWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}

/**
 * 두 날짜 사이의 주차 목록 생성
 */
function getWeeksBetween(start: Date, end: Date) {
  const weeks: { date: Date; weekNumber: number; year: number }[] = [];
  const current = new Date(start);
  current.setDate(current.getDate() - current.getDay() + (current.getDay() === 0 ? -6 : 1)); // 주의 시작일(월요일)로 이동

  while (current <= end) {
    weeks.push({
      date: new Date(current),
      weekNumber: getWeekNumber(current),
      year: current.getFullYear(),
    });
    current.setDate(current.getDate() + 7);
  }

  return weeks;
}

/**
 * 특정 월의 일수 계산
 */
function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

/**
 * 타임라인 전체 일수 계산
 */
export function getTotalDays(start: Date, end: Date) {
  const diffTime = end.getTime() - start.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
}

/**
 * 날짜를 타임라인 위치(퍼센트)로 변환하는 유틸 함수
 * @param date - 변환할 날짜
 * @param startDate - 타임라인 시작 날짜
 * @param endDate - 타임라인 종료 날짜
 * @returns 퍼센트 위치 (0-100)
 */
export function getDatePosition(
  date: Date,
  startDate: Date,
  endDate: Date
): number {
  const totalDays = getTotalDays(startDate, endDate);
  const daysFromStart = Math.ceil(
    (date.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
  );
  return Math.max(0, Math.min(100, (daysFromStart / totalDays) * 100));
}

/**
 * 오늘 날짜 표시선 위치 계산
 */
export function getTodayPosition(startDate: Date, endDate: Date): number | null {
  const today = new Date();
  if (today < startDate || today > endDate) return null;
  return getDatePosition(today, startDate, endDate);
}

/**
 * 타임라인 위치(퍼센트)를 날짜로 역변환하는 유틸 함수
 * @param percentPosition - 타임라인 내 위치 (0-100)
 * @param timelineStart - 타임라인 시작 날짜
 * @param timelineEnd - 타임라인 종료 날짜
 * @returns 변환된 Date 객체
 */
export function getDateFromPosition(
  percentPosition: number,
  timelineStart: Date,
  timelineEnd: Date
): Date {
  const totalDays = getTotalDays(timelineStart, timelineEnd);
  const daysFromStart = Math.round((percentPosition / 100) * totalDays);

  const resultDate = new Date(timelineStart);
  resultDate.setDate(resultDate.getDate() + daysFromStart);

  return resultDate;
}

/**
 * 마우스 X 좌표를 타임라인 퍼센트 위치로 변환
 * @param mouseX - 마우스의 X 좌표 (px)
 * @param containerRect - 타임라인 컨테이너의 DOMRect
 * @returns 퍼센트 위치 (0-100, 범위 내로 제한됨)
 */
export function getPercentFromMouseX(
  mouseX: number,
  containerRect: DOMRect
): number {
  const relativeX = mouseX - containerRect.left;
  const percent = (relativeX / containerRect.width) * 100;
  return Math.max(0, Math.min(100, percent));
}

/**
 * 타임라인 헤더 컴포넌트
 */
export function TimelineHeader({
  startDate,
  endDate,
  labelWidth = 100,
  showTodayLine = true,
}: TimelineHeaderProps) {
  // 월 목록 계산
  const months = useMemo(
    () => getMonthsBetween(startDate, endDate),
    [startDate, endDate]
  );

  // 전체 일수
  const totalDays = useMemo(
    () => getTotalDays(startDate, endDate),
    [startDate, endDate]
  );

  // 오늘 날짜 위치 계산 (퍼센트)
  const todayPosition = useMemo(
    () => getTodayPosition(startDate, endDate),
    [startDate, endDate]
  );

  // 각 월의 너비 계산 (퍼센트)
  const monthWidths = useMemo(() => {
    return months.map(({ year, month }, index) => {
      // 첫 번째 월: 시작일부터 월말까지
      if (index === 0) {
        const daysInFirstMonth =
          getDaysInMonth(year, month) - startDate.getDate() + 1;
        return (daysInFirstMonth / totalDays) * 100;
      }
      // 마지막 월: 1일부터 종료일까지
      if (index === months.length - 1) {
        return (endDate.getDate() / totalDays) * 100;
      }
      // 중간 월: 전체 일수
      return (getDaysInMonth(year, month) / totalDays) * 100;
    });
  }, [months, startDate, endDate, totalDays]);

  // 주차 목록
  const weeks = useMemo(() => getWeeksBetween(startDate, endDate), [startDate, endDate]);

  // 각 주차의 너비 계산 (퍼센트)
  const weekWidths = useMemo(() => {
    return weeks.map((week) => {
      const weekStart = new Date(week.date);
      const weekEnd = new Date(week.date);
      weekEnd.setDate(weekEnd.getDate() + 6);

      // 주차가 타임라인 범위를 벗어나면 조정
      const displayStart = weekStart < startDate ? startDate : weekStart;
      const displayEnd = weekEnd > endDate ? endDate : weekEnd;

      const daysInWeek =
        (displayEnd.getTime() - displayStart.getTime()) / (1000 * 60 * 60 * 24) + 1;
      return (daysInWeek / totalDays) * 100;
    });
  }, [weeks, startDate, endDate, totalDays]);

  return (
    <div className="flex border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
      {/* 왼쪽 라벨 영역 (빈 공간) */}
      <div
        className="flex-shrink-0 px-3 border-r border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-500 dark:text-slate-400 flex flex-col"
        style={{ width: labelWidth }}
      >
        <div className="py-2 border-b border-slate-200 dark:border-slate-700 flex-1 flex items-center justify-center">
          월
        </div>
        <div className="py-2 flex-1 flex items-center justify-center">
          주
        </div>
      </div>

      {/* 월별 + 주별 헤더 */}
      <div className="flex-1 flex flex-col relative">
        {/* 상단: 월별 헤더 */}
        <div className="flex relative border-b border-slate-200 dark:border-slate-700">
          {months.map(({ year, month, label }, index) => (
            <div
              key={`${year}-${month}`}
              className="flex-shrink-0 px-2 py-2 text-xs font-medium text-slate-600 dark:text-slate-400 border-r border-slate-200 dark:border-slate-700 last:border-r-0 text-center"
              style={{ width: `${monthWidths[index]}%` }}
            >
              {label}
            </div>
          ))}
        </div>

        {/* 하단: 주별 헤더 */}
        <div className="flex relative">
          {weeks.map((week, index) => (
            <div
              key={`${week.year}-w${week.weekNumber}`}
              className="flex-shrink-0 px-1 py-2 text-xs font-medium text-slate-500 dark:text-slate-500 border-r border-slate-200 dark:border-slate-700 last:border-r-0 text-center"
              style={{ width: `${weekWidths[index]}%` }}
            >
              W{week.weekNumber}
            </div>
          ))}

          {/* 오늘 날짜 표시선 */}
          {showTodayLine && todayPosition !== null && (
            <div
              className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-20 pointer-events-none"
              style={{ left: `${todayPosition}%` }}
            >
              <div className="absolute -top-0.5 left-1/2 -translate-x-1/2 px-1 py-0.5 bg-red-500 text-white text-[10px] rounded whitespace-nowrap font-bold">
                NOW
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * 타임라인 그리드 배경 컴포넌트
 * 각 행에서 사용되는 월별 구분선 배경
 */
export function TimelineGridBackground({
  startDate,
  endDate,
}: {
  startDate: Date;
  endDate: Date;
}) {
  // 월 목록 계산
  const months = useMemo(
    () => getMonthsBetween(startDate, endDate),
    [startDate, endDate]
  );

  // 전체 일수
  const totalDays = useMemo(
    () => getTotalDays(startDate, endDate),
    [startDate, endDate]
  );

  // 각 월의 너비 계산 (퍼센트)
  const monthWidths = useMemo(() => {
    return months.map(({ year, month }, index) => {
      if (index === 0) {
        const daysInFirstMonth =
          getDaysInMonth(year, month) - startDate.getDate() + 1;
        return (daysInFirstMonth / totalDays) * 100;
      }
      if (index === months.length - 1) {
        return (endDate.getDate() / totalDays) * 100;
      }
      return (getDaysInMonth(year, month) / totalDays) * 100;
    });
  }, [months, startDate, endDate, totalDays]);

  // 오늘 날짜 위치
  const todayPosition = useMemo(
    () => getTodayPosition(startDate, endDate),
    [startDate, endDate]
  );

  return (
    <div className="absolute inset-0 flex pointer-events-none">
      {months.map(({ year, month }, index) => (
        <div
          key={`grid-${year}-${month}`}
          className="flex-shrink-0 border-r border-slate-100 dark:border-slate-800 last:border-r-0"
          style={{ width: `${monthWidths[index]}%` }}
        />
      ))}

      {/* 오늘 날짜 표시선 */}
      {todayPosition !== null && (
        <div
          className="absolute top-0 bottom-0 w-0.5 bg-red-500/50 z-10"
          style={{ left: `${todayPosition}%` }}
        />
      )}
    </div>
  );
}
