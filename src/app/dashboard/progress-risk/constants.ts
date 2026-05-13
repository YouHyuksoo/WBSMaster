/**
 * @file src/app/dashboard/progress-risk/constants.ts
 * @description
 * 진도 및 리스크 보고서 페이지의 상수 정의
 *
 * 초보자 가이드:
 * 1. **STAGE_ORDER**: 9단계 enum의 순서 (forecast/progress 계산용)
 * 2. **STAGE_LABEL**: 각 단계의 한글 풀네임
 * 3. **STAGE_SHORT**: 그리드 표시용 짧은 라벨
 */
import type { ProgressStage } from "./types";

export const STAGE_ORDER: ProgressStage[] = [
  "ANALYSIS", "DESIGN", "IMPLEMENTATION",
  "UNIT_TEST", "IT_TEST", "TRAINING",
  "INTEGRATION_TEST", "MIGRATION", "STABILIZATION",
];

export const STAGE_LABEL: Record<ProgressStage, string> = {
  ANALYSIS: "분석",
  DESIGN: "설계",
  IMPLEMENTATION: "구현",
  UNIT_TEST: "단위테스트",
  IT_TEST: "IT 테스트",
  TRAINING: "교육",
  INTEGRATION_TEST: "통합테스트",
  MIGRATION: "이행",
  STABILIZATION: "안정화",
};

export const STAGE_SHORT: Record<ProgressStage, string> = {
  ANALYSIS: "분석", DESIGN: "설계", IMPLEMENTATION: "구현",
  UNIT_TEST: "단위", IT_TEST: "IT", TRAINING: "교육",
  INTEGRATION_TEST: "통합", MIGRATION: "이행", STABILIZATION: "안정",
};

/** 단계 진행률 자동 계산 (currentStage가 N번째면 N/9) */
export function stageProgressPct(stage: ProgressStage): number {
  return Math.round(((STAGE_ORDER.indexOf(stage) + 1) / STAGE_ORDER.length) * 100);
}

/** 자주 쓰는 역할 옵션 */
export const ROLE_OPTIONS = ["분석자", "설계자", "개발자", "테스터", "교육담당", "운영", "기타"];
