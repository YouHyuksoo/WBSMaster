/**
 * @file src/app/dashboard/wbs/utils/ganttHelpers.ts
 * @description
 * 간트 차트 관련 헬퍼 함수들을 정의합니다.
 * 날짜 생성, 위치 계산 등의 유틸리티 함수를 제공합니다.
 *
 * 초보자 가이드:
 * 1. **generateDates**: 간트 차트 날짜 배열 생성
 * 2. **getItemPosition**: 항목의 간트 바 위치 계산
 * 3. **calculateDateFromDelta**: 드래그 델타로부터 새 날짜 계산
 *
 * 수정 방법:
 * - 새로운 간트 관련 로직 추가 시 이 파일에 함수 추가
 */

import type { WbsItem } from "@/lib/api";
import type { GanttDateInfo } from "../types";
import { rowHeight } from "../constants";

/** 요일명 배열 */
const dayNames = ["일", "월", "화", "수", "목", "금", "토"];

/**
 * 간트 차트용 날짜 배열 생성
 * @param startDate 시작일
 * @param days 일수
 * @returns 날짜 정보 배열
 */
export const generateDates = (
  startDate: Date,
  days: number
): GanttDateInfo[] => {
  const dates: GanttDateInfo[] = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (let i = 0; i < days; i++) {
    const date = new Date(startDate);
    date.setDate(date.getDate() + i);
    dates.push({
      date,
      day: date.getDate(),
      month: date.getMonth() + 1,
      dayName: dayNames[date.getDay()],
      isWeekend: date.getDay() === 0 || date.getDay() === 6,
      isToday:
        date.getFullYear() === today.getFullYear() &&
        date.getMonth() === today.getMonth() &&
        date.getDate() === today.getDate(),
    });
  }
  return dates;
};

/**
 * 간트 바의 위치와 너비 계산
 * @param item WBS 항목
 * @param chartStartDate 차트 시작일
 * @param cellWidth 셀 너비 (px)
 * @returns 위치 정보 또는 null
 */
export const getItemPosition = (
  item: WbsItem,
  chartStartDate: Date,
  cellWidth: number
): { left: number; width: number } | null => {
  if (!item.startDate || !item.endDate) return null;

  const itemStart = new Date(item.startDate);
  const itemEnd = new Date(item.endDate);
  itemStart.setHours(0, 0, 0, 0);
  itemEnd.setHours(0, 0, 0, 0);
  const chartStart = new Date(chartStartDate);
  chartStart.setHours(0, 0, 0, 0);

  const startDiff = Math.floor(
    (itemStart.getTime() - chartStart.getTime()) / (1000 * 60 * 60 * 24)
  );
  const duration =
    Math.floor(
      (itemEnd.getTime() - itemStart.getTime()) / (1000 * 60 * 60 * 24)
    ) + 1;

  return {
    left: startDiff * cellWidth,
    width: duration * cellWidth,
  };
};

/**
 * 드래그 델타값으로부터 새 날짜 계산
 * @param originalDate 원본 날짜
 * @param deltaDays 이동할 일수
 * @returns 새 날짜 문자열 (ISO)
 */
export const calculateDateFromDelta = (
  originalDate: string,
  deltaDays: number
): string => {
  const date = new Date(originalDate);
  date.setDate(date.getDate() + deltaDays);
  return date.toISOString();
};

/**
 * 오늘 날짜 표시선 위치 계산
 * @param chartStartDate 차트 시작일
 * @param cellWidth 셀 너비 (px)
 * @returns 왼쪽 위치 (px) 또는 null
 */
export const getTodayLinePosition = (
  chartStartDate: Date,
  cellWidth: number
): number | null => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const chartStart = new Date(chartStartDate);
  chartStart.setHours(0, 0, 0, 0);

  const diff = Math.floor(
    (today.getTime() - chartStart.getTime()) / (1000 * 60 * 60 * 24)
  );

  if (diff < 0) return null;
  return diff * cellWidth + cellWidth / 2;
};

/**
 * 간트 바 색상 결정
 * @param item WBS 항목
 * @param isDelayed 지연 여부
 * @returns Tailwind 색상 클래스
 */
export const getBarColor = (item: WbsItem, isDelayed: boolean): string => {
  if (isDelayed) return "bg-rose-500";
  if (item.status === "COMPLETED") return "bg-success";
  if (item.status === "IN_PROGRESS") return "bg-primary";
  if (item.status === "HOLDING") return "bg-warning";
  return "bg-gray-400";
};

/**
 * 드래그 중 표시할 날짜 포맷
 * @param date 날짜 문자열
 * @returns 포맷된 문자열 (MM/DD)
 */
export const formatDragDate = (date: string): string => {
  const d = new Date(date);
  return `${d.getMonth() + 1}/${d.getDate()}`;
};

/**
 * 간트 차트 날짜 범위 계산
 * @param projectStartDate 프로젝트 시작일
 * @param projectEndDate 프로젝트 종료일
 * @returns 차트 시작일과 일수
 */
export const calculateChartRange = (
  projectStartDate: string | null | undefined,
  projectEndDate: string | null | undefined
): { chartStartDate: Date; chartDays: number } => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let chartStartDate: Date;
  let chartEndDate: Date;

  if (projectStartDate && projectEndDate) {
    chartStartDate = new Date(projectStartDate);
    chartEndDate = new Date(projectEndDate);
  } else {
    // 프로젝트 날짜가 없으면 오늘 기준 ±30일
    chartStartDate = new Date(today);
    chartStartDate.setDate(chartStartDate.getDate() - 7);
    chartEndDate = new Date(today);
    chartEndDate.setDate(chartEndDate.getDate() + 60);
  }

  chartStartDate.setHours(0, 0, 0, 0);
  chartEndDate.setHours(0, 0, 0, 0);

  // 여유 기간 추가 (앞뒤로 7일)
  chartStartDate.setDate(chartStartDate.getDate() - 7);
  chartEndDate.setDate(chartEndDate.getDate() + 7);

  const chartDays =
    Math.ceil(
      (chartEndDate.getTime() - chartStartDate.getTime()) / (1000 * 60 * 60 * 24)
    ) + 1;

  return { chartStartDate, chartDays };
};

/**
 * 스크롤 동기화 헬퍼
 * @param sourceRef 스크롤 소스 요소
 * @param targetRef 스크롤 타겟 요소
 * @param direction 동기화 방향 ('vertical' | 'horizontal')
 */
export const syncScroll = (
  sourceElement: HTMLElement,
  targetElement: HTMLElement,
  direction: "vertical" | "horizontal"
): void => {
  if (direction === "vertical") {
    targetElement.scrollTop = sourceElement.scrollTop;
  } else {
    targetElement.scrollLeft = sourceElement.scrollLeft;
  }
};

/**
 * 간트 바 높이 및 Y 위치 계산
 * @param rowIndex 행 인덱스
 * @returns top과 height (px)
 */
export const getBarVerticalPosition = (
  rowIndex: number
): { top: number; height: number } => {
  const barHeight = rowHeight - 8; // 패딩 고려
  const top = rowIndex * rowHeight + 4;
  return { top, height: barHeight };
};
