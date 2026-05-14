/**
 * @file src/lib/progress-calc/forecast.ts
 * @description Forward-pass 전파로 각 task의 forecastStart / forecastEnd 계산
 *
 * 초보자 가이드:
 * 1. **topologicalSort**: 선행 → 후행 순서로 정렬 (순환 시 throw)
 * 2. **computeForecast**: 정렬된 순서대로 각 task의 예측 일정 계산
 * 3. **businessDays**: 주말 제외 영업일 기준 (date-fns differenceInBusinessDays)
 * 4. **4가지 진도 계산 규칙**:
 *    - 미시작: forecastEnd = startDate + duration
 *    - 완료: forecastEnd = actualEndDate
 *    - 진행 중: forecastEnd = today + (남은 기간)
 *    - 선행 지연: forecastStart = max(startDate, predecessor.forecastEnd + 1)
 */
import { addDays, differenceInBusinessDays, isAfter, max as maxDate } from "date-fns";
import { computeStageProgress, type StageCategory } from "@/lib/stage-categories";
import type { ForecastInput, Forecast } from "./types";

/**
 * computeForecast 옵션 — 카테고리별 단계 목록
 */
export interface ComputeForecastOptions {
  stagesByCategory: Map<StageCategory, { id: string; order: number }[]>;
}

/**
 * 토폴로지 정렬 — 의존성 순서로 task 정렬
 * 순환 의존성 감지 시 즉시 throw
 *
 * @param tasks 정렬할 task 배열
 * @returns 선행 → 후행 순서로 정렬된 배열
 * @throws Error 순환 의존성 발견 시
 */
export function topologicalSort(tasks: ForecastInput[]): ForecastInput[] {
  const byId = new Map(tasks.map(t => [t.id, t]));
  const visited = new Set<string>();
  const result: ForecastInput[] = [];
  const visiting = new Set<string>(); // 순환 감지용

  function visit(t: ForecastInput) {
    if (visited.has(t.id)) return;
    if (visiting.has(t.id)) {
      throw new Error(`Dependency cycle detected at task ${t.id}`);
    }
    visiting.add(t.id);
    if (t.predecessorId) {
      const pred = byId.get(t.predecessorId);
      if (pred) visit(pred);
    }
    visiting.delete(t.id);
    visited.add(t.id);
    result.push(t);
  }

  for (const t of tasks) visit(t);
  return result;
}

/**
 * Forward-pass forecast 계산
 *
 * 각 task의 예측 시작일/종료일을 계산합니다.
 * 선행이 지연되면 후행의 시작일도 자동으로 밀립니다.
 *
 * @param tasks ForecastInput 배열
 * @param today 현재 날짜 (진행 중 task의 remaining 계산 기준)
 * @param options 카테고리별 단계 목록 (진척률 계산용)
 * @returns Map<taskId, Forecast>
 * @throws Error 순환 의존성 발견 시
 */
export function computeForecast(
  tasks: ForecastInput[],
  today: Date,
  options: ComputeForecastOptions
): Map<string, Forecast> {
  const sorted = topologicalSort(tasks);
  const result = new Map<string, Forecast>();

  for (const t of sorted) {
    // 계획 기간을 영업일 기준으로 계산 (endDate 포함)
    const duration = Math.max(1, differenceInBusinessDays(t.endDate, t.startDate) + 1);

    // 시작일: 선행이 있으면 선행의 종료일 다음날과 계획 시작일의 max
    let forecastStart = t.startDate;
    if (t.predecessorId) {
      const pred = result.get(t.predecessorId);
      if (pred) {
        forecastStart = maxDate([t.startDate, addDays(pred.forecastEnd, 1)]);
      }
    }

    // 종료일: 진행 상태별로 다르게 계산
    let forecastEnd: Date;
    if (t.actualEndDate) {
      // 1. 완료됨: actualEnd가 forecastEnd
      forecastEnd = t.actualEndDate;
    } else if (t.actualStartDate) {
      // 2. 진행 중: stageCategory + currentStageId 기반으로 진척률 계산
      const stages = options.stagesByCategory.get(t.stageCategory) ?? [];
      const progressPct = computeStageProgress(stages, t.currentStageId) / 100;
      const remaining = Math.max(1, duration * (1 - progressPct));
      forecastEnd = addDays(today, Math.ceil(remaining));

      // 계획 종료일이 이미 지난 경우 today와 max (과거로 돌아가지 않도록)
      if (isAfter(today, t.endDate)) {
        forecastEnd = maxDate([forecastEnd, today]);
      }
    } else {
      // 3. 미시작: forecastStart + duration
      forecastEnd = addDays(forecastStart, duration);
    }

    result.set(t.id, { forecastStart, forecastEnd, duration });
  }

  return result;
}
