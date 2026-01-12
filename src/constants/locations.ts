/**
 * @file src/constants/locations.ts
 * @description
 * 설비 위치 코드 상수 정의
 * 전체 시스템에서 공통으로 사용하는 위치 코드를 한 곳에서 관리합니다.
 *
 * 초보자 가이드:
 * 1. **LOCATIONS**: 위치 코드 배열
 * 2. **LOCATION_LABELS**: 위치 코드별 한글명 (필요 시 사용)
 *
 * 사용 예시:
 * ```typescript
 * import { LOCATIONS } from '@/constants/locations';
 *
 * <select>
 *   {LOCATIONS.map(loc => <option key={loc} value={loc}>{loc}</option>)}
 * </select>
 * ```
 *
 * 수정 방법:
 * - 위치 추가/삭제: LOCATIONS 배열 수정
 * - 한글명 추가: LOCATION_LABELS 객체 수정
 */

/** 설비 위치 코드 목록 */
export const LOCATIONS = [
  "SMT",
  "IMT",
  "MANUAL",
  "COATING",
  "FINAL",
  "DMS",
  "DI",
  "PCBA",
  "INSPECT",
  "PACKING",
] as const;

/** 위치 타입 */
export type Location = typeof LOCATIONS[number];

/** 위치 한글명 (선택적 사용) */
export const LOCATION_LABELS: Record<Location, string> = {
  SMT: "SMT",
  IMT: "IMT",
  MANUAL: "수작업",
  COATING: "코팅",
  FINAL: "최종",
  DMS: "DMS",
  DI: "DI",
  PCBA: "PCBA",
  INSPECT: "검사",
  PACKING: "포장",
};
