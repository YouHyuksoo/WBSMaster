/**
 * @file src/app/dashboard/process-verification/types.ts
 * @description
 * 기능추적표(공정검증) 관련 타입 정의 파일입니다.
 *
 * 2026-01-17 구조 개선:
 * - ProcessVerificationMaster: 관리코드 기준 마스터 데이터
 * - ProcessVerificationBusinessUnitApply: 마스터별 적용 여부·검증 상태 행
 * - 기존 ProcessVerificationItem은 백업용으로 유지
 *
 * 2026-11-09: 화면에서 사업부 구분을 없앴다.
 * - 마스터 하나에 적용 행 하나(businessUnit = DEFAULT_BUSINESS_UNIT)만 쓴다.
 * - getMasterApply() 로 그 행을 찾고, 없으면 "미적용·대기"로 본다.
 *
 * 초보자 가이드:
 * 1. **ProcessVerificationMaster**: 테이블 한 행 = 마스터 하나
 * 2. **getMasterApply(master)**: 적용 여부(isApplied)·검증 상태(status) 조회
 * 3. **verificationStatusConfig**: 상태별 라벨·색상(라이트/다크)
 */

import { DEFAULT_BUSINESS_UNIT } from "@/constants/business-units";

/**
 * 검증 상태 Enum
 */
export type VerificationStatus = "PENDING" | "IN_PROGRESS" | "VERIFIED" | "NOT_APPLICABLE";

/**
 * 제품유형 상수
 */
export const PRODUCT_TYPES = ["SMD", "HANES"] as const;
export type ProductType = (typeof PRODUCT_TYPES)[number];

/**
 * 검증 상태 설정 (다크 모드 지원)
 */
export const verificationStatusConfig: Record<VerificationStatus, { label: string; color: string; bgColor: string; icon: string }> = {
  PENDING: { label: "대기", color: "text-slate-600 dark:text-slate-400", bgColor: "bg-slate-100 dark:bg-slate-700", icon: "pending_actions" },
  IN_PROGRESS: { label: "진행중", color: "text-blue-600 dark:text-blue-400", bgColor: "bg-blue-100 dark:bg-blue-900/30", icon: "schedule" },
  VERIFIED: { label: "검증완료", color: "text-green-600 dark:text-green-400", bgColor: "bg-green-100 dark:bg-green-900/30", icon: "verified" },
  NOT_APPLICABLE: { label: "해당없음", color: "text-gray-500 dark:text-gray-400", bgColor: "bg-gray-100 dark:bg-gray-700", icon: "do_not_disturb_on" },
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
  businessUnit: string;
  asIsCode: string | null;     // AS-IS 관리번호
  toBeCode: string | null;     // TO-BE 관리번호
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
 * 2026-01-17 변경: businessUnit 제거, productType으로 필터링
 */
export interface FilterState {
  categoryId: string | null;
  isApplied: boolean | null;
  status: VerificationStatus | null;
  search: string;
  productType: ProductType | null; // 제품유형 필터
}

/**
 * 공정검증 마스터 인터페이스 (신규)
 * 관리코드 기준 단일 마스터 데이터
 */
export interface ProcessVerificationMaster {
  id: string;
  managementCode: string;
  productType: string;
  category: string;
  managementArea: string;
  detailItem: string;
  mesMapping: string | null;
  verificationDetail: string | null;
  acceptanceStatus: string | null;
  existingMes: boolean;
  customerRequest: string | null;
  asIsCode: string | null;
  toBeCode: string | null;
  order: number;
  remarks: string | null;
  categoryId: string;
  categoryRef?: {
    id: string;
    name: string;
    code: string;
  };
  businessUnitApplies: ProcessVerificationBusinessUnitApply[];
  createdAt: string;
  updatedAt: string;
}

/**
 * 적용 행 인터페이스
 * DB 테이블(ProcessVerificationBusinessUnit) 구조를 그대로 받는다.
 * 화면은 businessUnit = DEFAULT_BUSINESS_UNIT 인 행만 쓴다.
 */
export interface ProcessVerificationBusinessUnitApply {
  id: string;
  masterId: string;
  businessUnit: string;
  isApplied: boolean;
  status: VerificationStatus;
  createdAt: string;
  updatedAt: string;
}

/**
 * 마스터의 적용 행(DEFAULT_BUSINESS_UNIT)을 돌려준다.
 * 행이 없으면 undefined → 화면은 "미적용·대기"로 표시한다.
 */
export function getMasterApply(
  master: Pick<ProcessVerificationMaster, "businessUnitApplies">
): ProcessVerificationBusinessUnitApply | undefined {
  return master.businessUnitApplies?.find((a) => a.businessUnit === DEFAULT_BUSINESS_UNIT);
}
