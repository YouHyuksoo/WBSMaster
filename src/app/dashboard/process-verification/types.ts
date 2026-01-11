/**
 * @file src/app/dashboard/process-verification/types.ts
 * @description
 * 기능추적표(공정검증) 관련 타입 정의 파일입니다.
 */

/**
 * 검증 상태 Enum
 */
export type VerificationStatus = "PENDING" | "IN_PROGRESS" | "VERIFIED" | "NOT_APPLICABLE";

/**
 * 검증 상태 설정 (다크 모드 지원)
 */
export const verificationStatusConfig: Record<VerificationStatus, { label: string; color: string; bgColor: string }> = {
  PENDING: { label: "대기", color: "text-slate-600 dark:text-slate-400", bgColor: "bg-slate-100 dark:bg-slate-700" },
  IN_PROGRESS: { label: "진행중", color: "text-blue-600 dark:text-blue-400", bgColor: "bg-blue-100 dark:bg-blue-900/30" },
  VERIFIED: { label: "검증완료", color: "text-green-600 dark:text-green-400", bgColor: "bg-green-100 dark:bg-green-900/30" },
  NOT_APPLICABLE: { label: "해당없음", color: "text-gray-500 dark:text-gray-400", bgColor: "bg-gray-100 dark:bg-gray-700" },
};

/**
 * 공정검증 카테고리 인터페이스
 */
export interface ProcessVerificationCategory {
  id: string;
  name: string;
  code: string;
  order: number;
  description: string | null;
  projectId: string;
  createdAt: string;
  updatedAt: string;
  _count?: {
    items: number;
  };
  items?: ProcessVerificationItem[];
}

/**
 * 공정검증 항목 인터페이스
 */
export interface ProcessVerificationItem {
  id: string;
  category: string;
  isApplied: boolean;
  managementArea: string;
  detailItem: string;
  mesMapping: string | null;
  verificationDetail: string | null;
  managementCode: string;
  acceptanceStatus: string | null;
  existingMes: boolean;
  customerRequest: string | null;
  order: number;
  remarks: string | null;
  status: VerificationStatus;
  categoryId: string;
  categoryRef?: {
    id: string;
    name: string;
    code: string;
  };
  createdAt: string;
  updatedAt: string;
}

/**
 * 임포트 통계 인터페이스
 */
export interface ImportStats {
  categoriesCreated: number;
  itemsCreated: number;
  skippedSheets: string[];
  errors: string[];
}

/**
 * 필터 상태 인터페이스
 */
export interface FilterState {
  categoryId: string | null;
  isApplied: boolean | null;
  status: VerificationStatus | null;
  search: string;
}
