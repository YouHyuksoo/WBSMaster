/**
 * @file src/constants/business-units.ts
 * @description
 * 사업부 기본값 상수입니다. 이 시스템은 다중 사업부를 관리하지 않습니다 (2026-11-09).
 *
 * 초보자 가이드:
 * - 모든 businessUnit 칼럼은 DB 기본값 "POLE"(행성사 오창)을 가진다 (prisma/schema.prisma @default("POLE")).
 * - 등록 · 수정 API 는 사업부 값을 받지도 보내지도 않는다. 화면도 묻거나 보여주지 않는다.
 * - DEFAULT_BUSINESS_UNIT 은 businessUnit 이 고유키에 들어간 곳의 조회에만 쓴다
 *   (AS-IS 총괄 projectId_businessUnit, 기능추적표 적용 행 masterId_businessUnit).
 * - 값을 바꾸려면 이 상수와 schema.prisma 의 @default 를 함께 바꾸고 DB 기본값도 맞춘다.
 */

/** businessUnit 칼럼의 고정값 (DB 기본값과 같아야 한다) */
export const DEFAULT_BUSINESS_UNIT = "POLE";
