/**
 * @file src/app/dashboard/interviews/types.ts
 * @description
 * 인터뷰 관리 페이지에서 사용하는 타입 정의 파일입니다.
 */

import type { Interview, InterviewTransferStatus, InterviewTransferType } from "@/lib/api";

export type { Interview, InterviewTransferStatus, InterviewTransferType };

/** 인터뷰 폼 데이터 타입 */
export interface InterviewFormData {
  title: string;
  interviewDate?: string;
  interviewer?: string;
  interviewee?: string;
  businessUnit: string;
  category?: string;  // 업무영역
  currentProcess?: string;
  painPoints?: string;
  desiredResults?: string;
  technicalConstraints?: string;
  questions?: string;
  remarks?: string;
}

/** 인터뷰 이관 상태 설정 */
export const TRANSFER_STATUS_CONFIG: Record<
  InterviewTransferStatus,
  { label: string; icon: string; color: string; bgColor: string }
> = {
  NOT_TRANSFERRED: {
    label: "미이관",
    icon: "pending",
    color: "text-text-secondary",
    bgColor: "bg-surface dark:bg-background-dark",
  },
  TRANSFERRED: {
    label: "이관완료",
    icon: "check_circle",
    color: "text-success",
    bgColor: "bg-success/10",
  },
};

/** 인터뷰 이관 유형 설정 */
export const TRANSFER_TYPE_CONFIG: Record<
  InterviewTransferType,
  { label: string; icon: string; color: string }
> = {
  CUSTOMER_REQUIREMENT: {
    label: "고객요구사항",
    icon: "contact_page",
    color: "text-primary",
  },
  FIELD_ISSUE: {
    label: "현업이슈",
    icon: "support_agent",
    color: "text-error",
  },
  DISCUSSION_ITEM: {
    label: "협의요청",
    icon: "forum",
    color: "text-warning",
  },
};

/** 사업부 목록 */
export const BUSINESS_UNITS = [
  "V_HNS",
  "V_DISP",
  "V_IVI",
  "V_PCBA",
  "공통",
] as const;

/** 업무영역 목록 (고객요구사항과 동일) */
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
] as const;
