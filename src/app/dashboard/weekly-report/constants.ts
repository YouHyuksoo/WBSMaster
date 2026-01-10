/**
 * @file src/app/dashboard/weekly-report/constants.ts
 * @description
 * 주간보고 관련 상수 정의 파일입니다.
 *
 * 초보자 가이드:
 * 1. **WORK_CATEGORIES**: 업무 카테고리 목록
 * 2. **REPORT_STATUS**: 보고서 상태
 * 3. **getWeekInfo**: ISO 주차 정보 계산 함수
 */

import { WorkCategory, ReportStatus } from "@/lib/api";

/** 업무 카테고리 목록 */
export const WORK_CATEGORIES: { value: WorkCategory; label: string; color: string }[] = [
  { value: "DOCUMENT", label: "문서작업", color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" },
  { value: "ANALYSIS", label: "분석", color: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400" },
  { value: "DEVELOPMENT", label: "개발", color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" },
  { value: "DESIGN", label: "설계", color: "bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400" },
  { value: "SUPPORT", label: "지원", color: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" },
  { value: "MEETING", label: "회의", color: "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400" },
  { value: "REVIEW", label: "검토", color: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400" },
  { value: "OTHER", label: "기타", color: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400" },
];

/** 보고서 상태 목록 */
export const REPORT_STATUS_MAP: Record<ReportStatus, { label: string; color: string }> = {
  DRAFT: { label: "작성 중", color: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400" },
  SUBMITTED: { label: "제출 완료", color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" },
};

/** 카테고리 값으로 정보 찾기 */
export function getCategoryInfo(value: WorkCategory) {
  return WORK_CATEGORIES.find((c) => c.value === value) || WORK_CATEGORIES[7];
}

/**
 * ISO 주차 정보 계산
 * @param date 날짜
 * @returns { year, week, weekStart, weekEnd }
 */
export function getISOWeekInfo(date: Date): {
  year: number;
  week: number;
  weekStart: Date;
  weekEnd: Date;
} {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);

  // 주의 시작일(월요일)과 종료일(일요일) 계산
  const weekStart = new Date(date);
  weekStart.setDate(date.getDate() - (date.getDay() || 7) + 1);
  weekStart.setHours(0, 0, 0, 0);

  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);
  weekEnd.setHours(23, 59, 59, 999);

  return {
    year: d.getUTCFullYear(),
    week: weekNo,
    weekStart,
    weekEnd,
  };
}

/**
 * 특정 연도의 특정 주차에 대한 날짜 범위 계산
 */
export function getWeekDateRange(year: number, weekNumber: number): { start: Date; end: Date } {
  // 해당 연도의 1월 4일이 속한 주가 1주차
  const jan4 = new Date(year, 0, 4);
  const jan4Day = jan4.getDay() || 7;
  const weekStart = new Date(jan4);
  weekStart.setDate(jan4.getDate() - jan4Day + 1 + (weekNumber - 1) * 7);

  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);
  weekEnd.setHours(23, 59, 59, 999);

  return { start: weekStart, end: weekEnd };
}

/**
 * 날짜를 YYYY-MM-DD 형식으로 포맷
 */
export function formatDate(date: Date | string | null | undefined): string {
  if (!date) return "";
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toISOString().split("T")[0];
}

/**
 * 날짜를 MM/DD (요일) 형식으로 포맷
 */
export function formatShortDate(date: Date | string | null | undefined): string {
  if (!date) return "";
  const d = typeof date === "string" ? new Date(date) : date;
  const days = ["일", "월", "화", "수", "목", "금", "토"];
  return `${d.getMonth() + 1}/${d.getDate()} (${days[d.getDay()]})`;
}

/**
 * 프로젝트 시작일 기반 주차 정보 계산
 * 프로젝트 시작일부터 7일 단위로 주차를 계산합니다.
 *
 * @example
 * projectStartDate = 2025-01-01 (수요일)
 * currentDate = 2025-01-15
 * -> week: 3 (1주: 01-01~01-07, 2주: 01-08~01-14, 3주: 01-15~01-21)
 *
 * @param currentDate 현재 날짜
 * @param projectStartDate 프로젝트 시작일
 * @returns { year, week, weekStart, weekEnd }
 */
export function getProjectWeekInfo(
  currentDate: Date,
  projectStartDate: Date
): {
  year: number;
  week: number;
  weekStart: Date;
  weekEnd: Date;
} {
  // 프로젝트 시작일 정규화 (시간 제거)
  const projectStart = new Date(projectStartDate);
  projectStart.setHours(0, 0, 0, 0);

  // 현재 날짜 정규화
  const current = new Date(currentDate);
  current.setHours(0, 0, 0, 0);

  // 프로젝트 시작일부터 현재까지의 일수 계산
  const diffTime = current.getTime() - projectStart.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

  // 주차 계산 (0일차 = 1주차, 7일차 = 2주차)
  const weekNumber = Math.floor(diffDays / 7) + 1;

  // 현재 주차의 시작일(월요일) 계산
  const dayOfWeek = current.getDay();
  const daysFromMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // 월요일 = 0

  const weekStart = new Date(current);
  weekStart.setDate(current.getDate() - daysFromMonday);
  weekStart.setHours(0, 0, 0, 0);

  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);
  weekEnd.setHours(23, 59, 59, 999);

  return {
    year: current.getFullYear(),
    week: weekNumber,
    weekStart,
    weekEnd,
  };
}

/**
 * 프로젝트 시작일 기반으로 특정 주차의 날짜 범위 계산
 *
 * @param projectStartDate 프로젝트 시작일
 * @param weekNumber 주차 번호 (1부터 시작)
 * @returns { start: 주차 시작일(월요일), end: 주차 종료일(일요일) }
 */
export function getProjectWeekDateRange(
  projectStartDate: Date,
  weekNumber: number
): { start: Date; end: Date } {
  // 프로젝트 시작일 정규화
  const projectStart = new Date(projectStartDate);
  projectStart.setHours(0, 0, 0, 0);

  // 프로젝트 시작일부터 weekNumber-1주를 곱한 일수만큼 더함
  const weekStart = new Date(projectStart);
  weekStart.setDate(projectStart.getDate() + (weekNumber - 1) * 7);

  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);
  weekEnd.setHours(23, 59, 59, 999);

  return { start: weekStart, end: weekEnd };
}
