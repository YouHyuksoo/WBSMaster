/**
 * @file src/lib/import-guards.ts
 * @description
 * 엑셀 가져오기 전에 파일 형식을 검사하는 공용 함수입니다.
 * 가져오기 라우트는 칼럼을 순서(위치)로 읽으므로, 칼럼 구성이 바뀐 뒤 예전 템플릿을 올리면
 * 값이 한 칸씩 밀려 들어갑니다. 저장(특히 기존 데이터 삭제) 전에 이 검사를 먼저 합니다.
 *
 * 초보자 가이드:
 * - hasLegacyBusinessUnitColumn(headerRow): 머리글에 "사업부" 칼럼이 있으면 true
 *   (2026-11-09 사업부 칼럼 제거 전 템플릿)
 * - LEGACY_TEMPLATE_MESSAGE: 이 경우 돌려줄 안내 문구
 */

/** 예전 템플릿에만 있는 사업부 머리글 */
const LEGACY_BUSINESS_UNIT_HEADERS = ["사업부", "사업부구분", "사업부 구분"];

/** 예전 템플릿 안내 문구 */
export const LEGACY_TEMPLATE_MESSAGE =
  "예전 템플릿 형식입니다(사업부 칼럼 포함). 화면에서 새 템플릿을 내려받아 사업부 칼럼 없이 다시 올려주세요.";

/** 머리글 행에 예전 사업부 칼럼이 있는지 */
export function hasLegacyBusinessUnitColumn(headerRow: unknown[] | undefined): boolean {
  if (!Array.isArray(headerRow)) return false;
  return headerRow.some(
    (cell) => typeof cell === "string" && LEGACY_BUSINESS_UNIT_HEADERS.includes(cell.replace(/\s+/g, " ").trim())
  );
}
