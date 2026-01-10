/**
 * @file src/components/dashboard/TimelineGrid.tsx
 * @description
 * 타임라인 월별 그리드 컴포넌트입니다.
 * 프로젝트 기간에 맞춰 월별 구분선과 레이블을 표시합니다.
 *
 * 초보자 가이드:
 * 1. **startDate, endDate**: 타임라인 시작/종료 날짜
 * 2. **months**: 계산된 월 목록 (시작~종료 사이의 모든 월)
 * 3. **getMonthWidth**: 각 월의 너비를 계산 (일수 기준)
 *
 * 수정 방법:
 * - 월 레이블 스타일 변경: monthLabel 클래스 수정
 * - 구분선 스타일 변경: border 클래스 수정
 */

"use client";

import { useMemo } from "react";

interface TimelineGridProps {
  /** 타임라인 시작 날짜 */
  startDate: Date;
  /** 타임라인 종료 날짜 */
  endDate: Date;
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
 * 특정 월의 일수 계산
 */
function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

/**
 * 타임라인 전체 일수 계산
 */
function getTotalDays(start: Date, end: Date) {
  const diffTime = end.getTime() - start.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
}

/**
 * 타임라인 월별 그리드 컴포넌트
 */
export function TimelineGrid({
  startDate,
  endDate,
  showTodayLine = true,
}: TimelineGridProps) {
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
  const todayPosition = useMemo(() => {
    const today = new Date();
    if (today < startDate || today > endDate) return null;

    const daysFromStart = Math.ceil(
      (today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
    );
    return (daysFromStart / totalDays) * 100;
  }, [startDate, endDate, totalDays]);

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

  return (
    <div className="relative w-full">
      {/* 월별 헤더 */}
      <div className="flex border-b border-slate-200 dark:border-slate-700">
        {months.map(({ year, month, label }, index) => (
          <div
            key={`${year}-${month}`}
            className="flex-shrink-0 px-2 py-1 text-xs font-medium text-slate-600 dark:text-slate-400 border-r border-slate-200 dark:border-slate-700 last:border-r-0"
            style={{ width: `${monthWidths[index]}%` }}
          >
            {label}
          </div>
        ))}
      </div>

      {/* 그리드 영역 */}
      <div className="relative h-16 flex">
        {months.map(({ year, month }, index) => (
          <div
            key={`grid-${year}-${month}`}
            className="flex-shrink-0 border-r border-slate-100 dark:border-slate-800 last:border-r-0"
            style={{ width: `${monthWidths[index]}%` }}
          />
        ))}

        {/* 오늘 날짜 표시선 */}
        {showTodayLine && todayPosition !== null && (
          <div
            className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-10"
            style={{ left: `${todayPosition}%` }}
          >
            <div className="absolute -top-5 left-1/2 -translate-x-1/2 px-1 py-0.5 bg-red-500 text-white text-[10px] rounded whitespace-nowrap">
              NOW
            </div>
          </div>
        )}
      </div>
    </div>
  );
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
