/**
 * @file src/app/dashboard/holidays/types.ts
 * @description
 * 일정 관리 페이지의 타입 및 설정을 정의합니다.
 *
 * 초보자 가이드:
 * 1. **ViewMode**: 월간/주간 뷰 모드
 * 2. **HolidayTypeConfig**: 일정 유형별 스타일 설정
 * 3. **HolidayFormState**: 일정 폼 상태 타입
 */

import type { Holiday } from "@/lib/api";

/** 뷰 모드 타입 */
export type ViewMode = "month" | "week";

/** 일정 유형 설정 타입 */
export interface HolidayTypeConfigItem {
  label: string;
  color: string;
  bgColor: string;
  icon: string;
}

/** 일정 유형 설정 */
export const holidayTypeConfig: Record<string, HolidayTypeConfigItem> = {
  COMPANY_HOLIDAY: { label: "회사 휴일", color: "text-rose-500", bgColor: "bg-rose-500", icon: "event_busy" },
  TEAM_OFFSITE: { label: "팀 오프사이트", color: "text-primary", bgColor: "bg-primary", icon: "groups" },
  PERSONAL_LEAVE: { label: "개인 휴가", color: "text-emerald-500", bgColor: "bg-emerald-500", icon: "beach_access" },
  PERSONAL_SCHEDULE: { label: "개인 일정", color: "text-violet-500", bgColor: "bg-violet-500", icon: "person" },
  MEETING: { label: "회의", color: "text-sky-500", bgColor: "bg-sky-500", icon: "videocam" },
  DEADLINE: { label: "마감일", color: "text-amber-500", bgColor: "bg-amber-500", icon: "flag" },
  OTHER: { label: "기타", color: "text-slate-500", bgColor: "bg-slate-500", icon: "event" },
};

/** 일정 폼 상태 타입 */
export interface HolidayFormState {
  title: string;
  description: string;
  date: string;
  endDate: string;
  type: string;
  isAllDay: boolean;
  startTime: string;
  endTime: string;
  userId: string;
}

/** 일정 폼 초기 상태 */
export const initialHolidayFormState: HolidayFormState = {
  title: "",
  description: "",
  date: "",
  endDate: "",
  type: "PERSONAL_SCHEDULE",
  isAllDay: true,
  startTime: "",
  endTime: "",
  userId: "",
};

/** 요일 이름 */
export const dayNames = ["일", "월", "화", "수", "목", "금", "토"];

/** 일정 유형 목록 (필터용) */
export const holidayTypeList = [
  "all",
  "COMPANY_HOLIDAY",
  "PERSONAL_LEAVE",
  "PERSONAL_SCHEDULE",
  "MEETING",
  "DEADLINE",
  "OTHER",
] as const;

export type HolidayType = typeof holidayTypeList[number];
