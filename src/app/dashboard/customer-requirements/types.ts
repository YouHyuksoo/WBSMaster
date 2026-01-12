/**
 * @file src/app/dashboard/customer-requirements/types.ts
 * @description
 * 고객요구사항 페이지에서 사용하는 타입 정의입니다.
 *
 * 초보자 가이드:
 * 1. **ApplyStatus**: 적용여부 상태 (검토중, 적용, 미적용, 보류)
 * 2. **CustomerRequirement**: 고객요구사항 데이터 타입
 * 3. **FilterState**: 필터 상태 타입
 */

import type { CustomerRequirement, ApplyStatus } from "@/lib/api";

/** 고객요구사항 타입 re-export */
export type { CustomerRequirement, ApplyStatus };

/** 적용여부 상태 라벨 */
export const APPLY_STATUS_LABELS: Record<ApplyStatus, string> = {
  REVIEWING: "검토중",
  APPLIED: "적용",
  REJECTED: "미적용",
  HOLD: "보류",
};

/** 적용여부 상태 색상 (Tailwind 클래스) */
export const APPLY_STATUS_COLORS: Record<ApplyStatus, string> = {
  REVIEWING: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  APPLIED: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  REJECTED: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  HOLD: "bg-slate-100 text-slate-800 dark:bg-slate-700 dark:text-slate-200",
};

/** 적용여부 상태 설정 (아이콘, 색상 포함) - Issues 페이지 스타일 */
export const APPLY_STATUS_CONFIG: Record<string, { label: string; icon: string; color: string; bgColor: string }> = {
  REVIEWING: { label: "검토중", icon: "pending", color: "text-warning", bgColor: "bg-warning/10" },
  APPLIED: { label: "적용", icon: "check_circle", color: "text-success", bgColor: "bg-success/10" },
  REJECTED: { label: "미적용", icon: "cancel", color: "text-error", bgColor: "bg-error/10" },
  HOLD: { label: "보류", icon: "pause_circle", color: "text-text-secondary", bgColor: "bg-slate-100 dark:bg-slate-800" },
};

/** 필터 상태 타입 */
export interface FilterState {
  projectId: string;
  businessUnit: string;
  applyStatus: string;
  search: string;
}

/** 폼 데이터 타입 (생성/수정 시 사용) */
export interface CustomerRequirementFormData {
  businessUnit: string;
  category?: string;
  functionName: string;
  content: string;
  requestDate?: string;
  requester?: string;
  solution?: string;
  applyStatus: ApplyStatus;
  remarks?: string;
  toBeCode?: string;
}

/** 기본 폼 값 */
export const DEFAULT_FORM_DATA: CustomerRequirementFormData = {
  businessUnit: "",
  category: "",
  functionName: "",
  content: "",
  requestDate: "",
  requester: "",
  solution: "",
  applyStatus: "REVIEWING",
  remarks: "",
  toBeCode: "",
};

/** 사업부 목록 (공통 상수에서 import) */
export { BUSINESS_UNITS } from "@/constants/business-units";
