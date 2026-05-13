/**
 * @file src/app/dashboard/progress-risk/constants.ts
 * @description
 * 진도 및 리스크 보고서 페이지의 상수 정의
 *
 * 초보자 가이드:
 * 1. **STAGE_ORDER**: src/lib/progress-stages.ts에서 가져옴 (서버와 공유)
 * 2. **STAGE_LABEL**: 각 단계의 한글 풀네임
 * 3. **STAGE_SHORT**: 그리드 표시용 짧은 라벨
 */
import type { ProgressStage } from "./types";

// 공유 모듈에서 re-export (서버 라우트와 동일한 출처)
export { STAGE_ORDER, stageProgressPct } from "@/lib/progress-stages";

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

/** 자주 쓰는 역할 옵션 */
export const ROLE_OPTIONS = ["분석자", "설계자", "개발자", "테스터", "교육담당", "운영", "기타"];
