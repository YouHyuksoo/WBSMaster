/**
 * @file src/app/dashboard/weekly-report/summary/types.ts
 * @description
 * 주간보고 취합 페이지 관련 타입 정의입니다.
 *
 * 초보자 가이드:
 * 1. **SummaryItem**: 취합 테이블에 표시될 개별 항목
 * 2. **SummaryTableProps**: 테이블 컴포넌트 props
 */

/** 분류 카테고리 (취합용) */
export type SummaryCategory =
  | "MES_DEVELOPMENT"  // MES 개발
  | "MAINTENANCE"      // 유지보수
  | "PERSONAL"         // 개인업무
  | "MEETING"          // 회의
  | "SUPPORT"          // 지원
  | "DOCUMENT"         // 문서작업
  | "OTHER";           // 기타

/** 취합 항목 상태 */
export type SummaryItemStatus =
  | "NOT_STARTED"   // 미착수
  | "IN_PROGRESS"   // 진행중
  | "COMPLETED"     // 완료
  | "DELAYED"       // 지연
  | "HOLD";         // 보류

/** 취합 테이블 항목 */
export interface SummaryItem {
  id: string;
  department: string;       // 부서
  category: SummaryCategory; // 분류
  content: string;          // 내용
  assignee: string;         // 담당자
  schedule: string;         // 추진일정
  status: SummaryItemStatus; // 상태
  progress?: number;        // 진척률 (0-100)
  remarks?: string;         // 비고
}

/** 분류 설정 */
export const SUMMARY_CATEGORY_CONFIG: Record<SummaryCategory, {
  label: string;
  color: string;
  bgColor: string;
}> = {
  MES_DEVELOPMENT: {
    label: "MES 개발",
    color: "text-emerald-600 dark:text-emerald-400",
    bgColor: "bg-emerald-100 dark:bg-emerald-900/30",
  },
  MAINTENANCE: {
    label: "유지보수",
    color: "text-blue-600 dark:text-blue-400",
    bgColor: "bg-blue-100 dark:bg-blue-900/30",
  },
  PERSONAL: {
    label: "개인업무",
    color: "text-purple-600 dark:text-purple-400",
    bgColor: "bg-purple-100 dark:bg-purple-900/30",
  },
  MEETING: {
    label: "회의",
    color: "text-cyan-600 dark:text-cyan-400",
    bgColor: "bg-cyan-100 dark:bg-cyan-900/30",
  },
  SUPPORT: {
    label: "지원",
    color: "text-amber-600 dark:text-amber-400",
    bgColor: "bg-amber-100 dark:bg-amber-900/30",
  },
  DOCUMENT: {
    label: "문서작업",
    color: "text-pink-600 dark:text-pink-400",
    bgColor: "bg-pink-100 dark:bg-pink-900/30",
  },
  OTHER: {
    label: "기타",
    color: "text-slate-600 dark:text-slate-400",
    bgColor: "bg-slate-100 dark:bg-slate-800",
  },
};

/** 상태 설정 */
export const SUMMARY_STATUS_CONFIG: Record<SummaryItemStatus, {
  label: string;
  color: string;
  bgColor: string;
  icon: string;
}> = {
  NOT_STARTED: {
    label: "미착수",
    color: "text-slate-600 dark:text-slate-400",
    bgColor: "bg-slate-100 dark:bg-slate-800",
    icon: "pending",
  },
  IN_PROGRESS: {
    label: "진행중",
    color: "text-blue-600 dark:text-blue-400",
    bgColor: "bg-blue-100 dark:bg-blue-900/30",
    icon: "autorenew",
  },
  COMPLETED: {
    label: "완료",
    color: "text-emerald-600 dark:text-emerald-400",
    bgColor: "bg-emerald-100 dark:bg-emerald-900/30",
    icon: "check_circle",
  },
  DELAYED: {
    label: "지연",
    color: "text-red-600 dark:text-red-400",
    bgColor: "bg-red-100 dark:bg-red-900/30",
    icon: "warning",
  },
  HOLD: {
    label: "보류",
    color: "text-amber-600 dark:text-amber-400",
    bgColor: "bg-amber-100 dark:bg-amber-900/30",
    icon: "pause_circle",
  },
};

/** 기존 WorkCategory를 SummaryCategory로 매핑 */
export function mapWorkCategoryToSummary(category: string): SummaryCategory {
  const mapping: Record<string, SummaryCategory> = {
    DEVELOPMENT: "MES_DEVELOPMENT",
    DOCUMENT: "DOCUMENT",
    MEETING: "MEETING",
    SUPPORT: "SUPPORT",
    ANALYSIS: "OTHER",
    DESIGN: "MES_DEVELOPMENT",
    REVIEW: "OTHER",
    OTHER: "OTHER",
  };
  return mapping[category] || "OTHER";
}

/** 진척률/완료 상태를 SummaryItemStatus로 변환 */
export function mapProgressToStatus(
  isCompleted: boolean,
  progress: number
): SummaryItemStatus {
  if (isCompleted || progress >= 100) return "COMPLETED";
  if (progress > 0) return "IN_PROGRESS";
  return "NOT_STARTED";
}
