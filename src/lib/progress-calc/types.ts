/**
 * @file src/lib/progress-calc/types.ts
 * @description 진도 계산 모듈의 공유 타입
 *
 * 초보자 가이드:
 * 1. **ForecastInput**: forecast 계산의 입력 데이터 (task 기본 정보)
 * 2. **Forecast**: forecast 결과 (예측 시작일, 종료일, 영업일 기준 기간)
 * 3. **Conflict**: 리소스 충돌 데이터 (주차별 할당 초과)
 * 4. **Diagnosis**: 최종 진단 결과 (판정, 권장사항 포함)
 */
import type { StageCategory } from "@/lib/stage-categories";

export interface ForecastInput {
  id: string;
  startDate: Date;
  endDate: Date;
  actualStartDate: Date | null;
  actualEndDate: Date | null;
  stageCategory: StageCategory;
  currentStageId: string | null;
  predecessorId: string | null;
}

export interface Forecast {
  forecastStart: Date;
  forecastEnd: Date;
  duration: number; // 영업일
}

export interface Conflict {
  userId: string;
  week: string; // ISO week "2026-W20"
  sumPct: number;
  overflow: number;
}

export type Verdict = "NORMAL" | "RESOURCE_SHORTAGE" | "SCHEDULE_OVERRUN" | "BOTH";

export interface Recommendation {
  severity: "high" | "medium";
  message: string;
  taskId?: string;
  userId?: string;
}

export interface CategoryOverrun {
  category: StageCategory;
  openDate: Date;
  forecastEnd: Date;
  overrunDays: number;
  taskIds: string[];
}

export interface Diagnosis {
  verdict: Verdict;
  overrunDays: number;
  shortageMd: number;
  criticalPath: string[];
  recommendations: Recommendation[];
  categoryOverruns: CategoryOverrun[];
}
