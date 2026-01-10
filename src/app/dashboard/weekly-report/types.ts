/**
 * @file src/app/dashboard/weekly-report/types.ts
 * @description
 * 주간보고 관련 타입 정의 파일입니다.
 *
 * 초보자 가이드:
 * 1. **ViewMode**: 화면 모드 ('list' | 'detail')
 * 2. **WeekInfo**: 주차 정보 타입
 * 3. **ReportWithUser**: 사용자 정보가 포함된 주간보고 타입
 */

import { WeeklyReport, WeeklyReportItem, ReportItemType, WorkCategory } from "@/lib/api";

/** 화면 모드 타입 */
export type ViewMode = "list" | "detail";

/** 주차 정보 타입 */
export interface WeekInfo {
  year: number;
  week: number;
  weekStart: Date;
  weekEnd: Date;
}

/** 사용자 정보 */
export interface ReportUser {
  id: string;
  name: string | null;
  email: string;
  avatar: string | null;
}

/** 프로젝트 정보 */
export interface ReportProject {
  id: string;
  name: string;
}

/** 사용자/프로젝트 정보가 포함된 주간보고 */
export interface ReportWithRelations extends WeeklyReport {
  user?: ReportUser;
  project?: ReportProject;
}

/** 항목 모달 폼 데이터 */
export interface ItemFormData {
  category: WorkCategory;
  title: string;
  description: string;
  targetDate: string;
  remarks: string;
  isAdditional: boolean;
  isCompleted: boolean;
  progress: number;
}

/** 주차별 제출 상태 */
export interface WeekSubmitStatus {
  weekNumber: number;
  status: "DRAFT" | "SUBMITTED" | null;
}
