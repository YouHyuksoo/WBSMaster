/**
 * @file src/app/dashboard/process-verification/types.ts
 * @description
 * 기능추적표(공정검증) 관련 타입 정의 파일입니다.
 *
 * 2026-01-17 구조 개선:
 * - ProcessVerificationMaster: 관리코드 기준 마스터 데이터
 * - ProcessVerificationBusinessUnitApply: 사업부별 적용 현황
 * - 기존 ProcessVerificationItem은 백업용으로 유지
 */

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
 * 전체 사업부 목록 상수
 */
export const BUSINESS_UNITS = ["V_IVI", "V_DISP", "V_PCBA", "V_HMS"] as const;
export type BusinessUnit = (typeof BUSINESS_UNITS)[number];

/**
 * 제품유형별 사업부 매핑
 * - SMD: V_IVI, V_DISP, V_PCBA (동일 마스터 공유)
 * - HANES: V_HMS (별도 마스터)
 */
export const PRODUCT_TYPE_BUSINESS_UNITS: Record<ProductType, readonly BusinessUnit[]> = {
  SMD: ["V_IVI", "V_DISP", "V_PCBA"] as const,
  HANES: ["V_HMS"] as const,
};

/**
 * 사업부별 제품유형 역매핑
 */
export const BUSINESS_UNIT_PRODUCT_TYPE: Record<BusinessUnit, ProductType> = {
  V_IVI: "SMD",
  V_DISP: "SMD",
  V_PCBA: "SMD",
  V_HMS: "HANES",
};

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
 * 사업부별 적용 인터페이스 (신규)
 * 마스터 + 사업부 조합으로 적용 여부 관리
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
