/**
 * @file src/lib/progress-stages.ts
 * @description
 * 진도 단계(ProgressStage) 공유 상수 — 서버/클라이언트 모두 사용
 *
 * 초보자 가이드:
 * 1. **STAGE_ORDER**: 9단계 순서 배열 (진행률 계산 기준)
 * 2. **stageProgressPct**: currentStage가 N번째면 N/9 진행률
 *
 * Phase 1에서 src/app/dashboard/progress-risk/constants.ts에 있었으나,
 * 서버 라우트도 사용해야 하므로 src/lib/로 이동.
 */
import type { ProgressStage } from "@/app/dashboard/progress-risk/types";

export const STAGE_ORDER: ProgressStage[] = [
  "ANALYSIS", "DESIGN", "IMPLEMENTATION",
  "UNIT_TEST", "IT_TEST", "TRAINING",
  "INTEGRATION_TEST", "MIGRATION", "STABILIZATION",
];

export function stageProgressPct(stage: ProgressStage): number {
  return Math.round(((STAGE_ORDER.indexOf(stage) + 1) / STAGE_ORDER.length) * 100);
}
