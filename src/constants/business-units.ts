/**
 * @file src/constants/business-units.ts
 * @description
 * 사업부 코드 상수 정의
 * 전체 시스템에서 공통으로 사용하는 사업부 코드를 한 곳에서 관리합니다.
 *
 * 초보자 가이드:
 * 1. **BUSINESS_UNITS**: 사업부 코드 배열
 * 2. **BUSINESS_UNIT_LABELS**: 사업부 코드별 한글명 (필요 시 사용)
 *
 * 사용 예시:
 * ```typescript
 * import { BUSINESS_UNITS } from '@/constants/business-units';
 *
 * <select>
 *   {BUSINESS_UNITS.map(unit => <option key={unit} value={unit}>{unit}</option>)}
 * </select>
 * ```
 *
 * 수정 방법:
 * - 사업부 추가/삭제: BUSINESS_UNITS 배열 수정
 * - 한글명 추가: BUSINESS_UNIT_LABELS 객체 수정
 */

/**
 * 전체 사업부 코드 목록
 * SMD: V_IVI, V_DISP, V_PCBA
 * HANES: V_HNS
 */
export const BUSINESS_UNITS = [
  "V_IVI",
  "V_DISP",
  "V_PCBA",
  "V_HNS",
] as const;

/** 사업부 타입 */
export type BusinessUnit = (typeof BUSINESS_UNITS)[number];

/**
 * 제품유형별 사업부 매핑
 * - SMD: V_IVI, V_DISP, V_PCBA (동일 마스터 공유)
 * - HANES: V_HNS (별도 마스터)
 */
export const PRODUCT_TYPE_BUSINESS_UNITS: Record<string, readonly BusinessUnit[]> = {
  SMD: ["V_IVI", "V_DISP", "V_PCBA"] as const,
  HANES: ["V_HNS"] as const,
};

/** 사업부 한글명 (선택적 사용) */
export const BUSINESS_UNIT_LABELS: Record<BusinessUnit, string> = {
  V_IVI: "V_IVI",
  V_DISP: "V_DISP",
  V_PCBA: "V_PCBA",
  V_HNS: "V_HNS",
};
