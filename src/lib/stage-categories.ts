/**
 * @file src/lib/stage-categories.ts
 * @description StageCategory 라벨 매핑과 기본 단계 정의 — 서버/클라이언트 공통
 *
 * 초보자 가이드:
 * 1. **STAGE_CATEGORY_ORDER**: UI 탭 순서 (10개)
 * 2. **STAGE_CATEGORY_LABEL**: enum → 한글 라벨
 * 3. **STAGE_CATEGORY_REVERSE**: 한글 → enum (Excel import용)
 * 4. **DEFAULT_ETC_STAGES**: ETC 카테고리에 기본 시드되는 10단계
 * 5. **computeStageProgress**: 카테고리 단계 목록과 현재 단계 ID로 진척률(%) 계산
 */

export type StageCategory =
  | "MES_SYSTEM"
  | "EQUIPMENT"
  | "TERMINAL"
  | "MASTER_DATA"
  | "ERP_IF"
  | "SLMS_IF"
  | "CUT_OFF"
  | "OPERATION"
  | "INFRA"
  | "ETC";

export const STAGE_CATEGORY_ORDER: StageCategory[] = [
  "MES_SYSTEM",
  "EQUIPMENT",
  "TERMINAL",
  "MASTER_DATA",
  "ERP_IF",
  "SLMS_IF",
  "CUT_OFF",
  "OPERATION",
  "INFRA",
  "ETC",
];

export const STAGE_CATEGORY_LABEL: Record<StageCategory, string> = {
  MES_SYSTEM: "MES시스템",
  EQUIPMENT: "설비연동",
  TERMINAL: "단말기",
  MASTER_DATA: "기준정보",
  ERP_IF: "ERP I/F",
  SLMS_IF: "SLMS I/F",
  CUT_OFF: "CUT OFF",
  OPERATION: "운영",
  INFRA: "인프라",
  ETC: "기타",
};

export const STAGE_CATEGORY_REVERSE: Record<string, StageCategory> = {
  "MES시스템": "MES_SYSTEM",
  "설비연동": "EQUIPMENT",
  "단말기": "TERMINAL",
  "기준정보": "MASTER_DATA",
  "ERP I/F": "ERP_IF",
  "SLMS I/F": "SLMS_IF",
  "CUT OFF": "CUT_OFF",
  "운영": "OPERATION",
  "인프라": "INFRA",
  "기타": "ETC",
};

/** ETC 카테고리의 기본 시드 단계 — 기존 ProgressStage enum과 1:1 매핑 */
export const DEFAULT_ETC_STAGES: readonly string[] = [
  "분석",
  "설계",
  "구현",
  "단위테스트",
  "IT 테스트",
  "교육",
  "통합테스트",
  "오픈",
  "이행",
  "안정화",
];

/**
 * 단계 진척률 — 카테고리 단계 목록과 현재 단계 ID로 계산
 *
 * @param stages 그 카테고리의 단계 목록 (order로 정렬되어 있거나 임의 순서 OK — 내부에서 정렬)
 * @param currentStageId 현재 단계 ID. null이면 0%
 * @returns 0~100 (정수)
 */
export function computeStageProgress(
  stages: { id: string; order: number }[],
  currentStageId: string | null
): number {
  if (stages.length === 0 || !currentStageId) return 0;
  const sorted = [...stages].sort((a, b) => a.order - b.order);
  const idx = sorted.findIndex((s) => s.id === currentStageId);
  if (idx < 0) return 0;
  return Math.round(((idx + 1) / sorted.length) * 100);
}
