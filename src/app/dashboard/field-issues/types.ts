/**
 * @file src/app/dashboard/field-issues/types.ts
 * @description
 * 현업이슈관리 페이지에서 사용하는 타입 정의입니다.
 *
 * 초보자 가이드:
 * 1. **FieldIssueStatus**: 이슈 상태 (필독 가이드 기준)
 *    - OPEN: 발견 (초기 상태)
 *    - IN_PROGRESS: 수정 중
 *    - RESOLVED: 해결
 *    - WONT_FIX: 수정 안함
 *    - CLOSED: 완료
 * 2. **FieldIssue**: 현업이슈 데이터 타입
 * 3. **STATUS_CONFIG**: 상태별 설정 (아이콘, 색상)
 *
 * 상태 흐름 (필독 가이드 기준):
 * OPEN (발견) → IN_PROGRESS (수정 중) → RESOLVED (해결) / WONT_FIX (수정 안함) → CLOSED (완료)
 */

import type { FieldIssue, FieldIssueStatus } from "@/lib/api";

/** 현업이슈 타입 re-export */
export type { FieldIssue, FieldIssueStatus };

/** 상태 라벨 (필독 가이드 기준) */
export const STATUS_LABELS: Record<FieldIssueStatus, string> = {
  OPEN: "발견",
  IN_PROGRESS: "수정 중",
  RESOLVED: "해결",
  WONT_FIX: "수정안함",
  CLOSED: "완료",
  // 레거시 (기존 데이터 호환용)
  PENDING: "대기",
  COMPLETED: "처리완료",
};

/**
 * 상태 설정 (아이콘, 색상 포함)
 * 필독 가이드 기준 상태 흐름:
 * OPEN (발견) → IN_PROGRESS (수정 중) → RESOLVED (해결) / WONT_FIX (수정 안함) → CLOSED (완료)
 */
export const STATUS_CONFIG: Record<FieldIssueStatus, {
  label: string;
  icon: string;
  color: string;
  bgColor: string;
}> = {
  OPEN: {
    label: "발견",
    icon: "radio_button_checked",
    color: "text-error",
    bgColor: "bg-error/10",
  },
  IN_PROGRESS: {
    label: "수정 중",
    icon: "build",
    color: "text-warning",
    bgColor: "bg-warning/10",
  },
  RESOLVED: {
    label: "해결",
    icon: "check_circle",
    color: "text-success",
    bgColor: "bg-success/10",
  },
  WONT_FIX: {
    label: "수정안함",
    icon: "block",
    color: "text-text-secondary",
    bgColor: "bg-slate-100 dark:bg-slate-800",
  },
  CLOSED: {
    label: "완료",
    icon: "done_all",
    color: "text-primary",
    bgColor: "bg-primary/10",
  },
  // 레거시 (기존 데이터 호환용)
  PENDING: {
    label: "대기",
    icon: "pending",
    color: "text-orange-500",
    bgColor: "bg-orange-500/10",
  },
  COMPLETED: {
    label: "처리완료",
    icon: "task_alt",
    color: "text-cyan-500",
    bgColor: "bg-cyan-500/10",
  },
};

/** 폼 데이터 타입 (생성/수정 시 사용) */
export interface FieldIssueFormData {
  businessUnit: string;
  category?: string;
  title: string;
  description?: string;
  registeredDate?: string;
  issuer?: string;
  requirementCode?: string;
  assignee?: string;
  status: FieldIssueStatus;
  targetDate?: string;
  completedDate?: string;
  proposedSolution?: string;
  finalSolution?: string;
  remarks?: string;
}

/** 기본 폼 값 */
export const DEFAULT_FORM_DATA: FieldIssueFormData = {
  businessUnit: "",
  category: "",
  title: "",
  description: "",
  registeredDate: "",
  issuer: "",
  requirementCode: "",
  assignee: "",
  status: "OPEN",
  targetDate: "",
  completedDate: "",
  proposedSolution: "",
  finalSolution: "",
  remarks: "",
};

/** 사업부 목록 (공통 상수에서 import) */
export { BUSINESS_UNITS } from "@/constants/business-units";

/** 업무구분 목록 (고객요구사항과 동일) */
export const BUSINESS_CATEGORIES = [
  "생산",
  "구매",
  "자재",
  "품질",
  "설계",
  "영업",
  "기술",
  "제조",
  "지원",
  "외주",
  "통관",
  "물류",
  "인사",
  "총무",
  "회계",
  "무역",
];
