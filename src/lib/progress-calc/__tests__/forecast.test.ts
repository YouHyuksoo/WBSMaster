/**
 * @file src/lib/progress-calc/__tests__/forecast.test.ts
 * @description forecast 전파 알고리즘 검증
 *
 * 초보자 가이드:
 * 1. **computeForecast 함수**: forward-pass로 task별 예측 일정(forecastStart/forecastEnd) 계산
 * 2. **5가지 케이스**:
 *    - 단순 task: 계획대로 forecastEnd 계산
 *    - 완료 task: actualEnd가 forecastEnd
 *    - 지연된 선행: 후행 task의 forecastStart도 밀림
 *    - 진행 중 task: currentStageId에 따라 진척률 반영
 *    - 순환 의존성: 에러 발생
 * 3. **today 고정화**: 결정성 테스트를 위해 2026-05-13 사용
 */
import { describe, it, expect } from "vitest";
import { computeForecast } from "../forecast";
import type { ForecastInput } from "../types";
import type { StageCategory } from "@/lib/stage-categories";

const today = (offset = 0) => {
  const d = new Date(2026, 4, 13); // 2026-05-13 고정 (테스트 결정성)
  d.setDate(d.getDate() + offset);
  return d;
};

/** ETC 카테고리 10단계 (분석~안정화) */
const stagesByCategory = new Map<StageCategory, { id: string; order: number }[]>([
  ["ETC", [
    { id: "s-analysis", order: 0 },
    { id: "s-design",   order: 1 },
    { id: "s-impl",     order: 2 },
    { id: "s-unit",     order: 3 },
    { id: "s-it",       order: 4 },
    { id: "s-train",    order: 5 },
    { id: "s-integ",    order: 6 },
    { id: "s-open",     order: 7 },
    { id: "s-migr",     order: 8 },
    { id: "s-stab",     order: 9 },
  ]],
]);

const opts = { stagesByCategory };

function task(
  id: string,
  start: Date,
  end: Date,
  opts: Partial<ForecastInput> = {}
): ForecastInput {
  return {
    id,
    startDate: start,
    endDate: end,
    actualStartDate: null,
    actualEndDate: null,
    stageCategory: "ETC" as const,
    currentStageId: null,
    predecessorId: null,
    ...opts,
  };
}

describe("computeForecast", () => {
  it("선행 없는 task는 계획대로 forecastEnd 반환", () => {
    const t = task("T1", today(0), today(4));
    const result = computeForecast([t], today(0), opts);
    expect(result.get("T1")!.forecastEnd.toDateString()).toBe(today(4).toDateString());
  });

  it("완료된 task는 actualEnd가 forecastEnd", () => {
    const t = task("T1", today(0), today(4), { actualEndDate: today(6) });
    const result = computeForecast([t], today(10), opts);
    expect(result.get("T1")!.forecastEnd.toDateString()).toBe(today(6).toDateString());
  });

  it("선행이 지연되면 후행 forecastStart도 밀린다", () => {
    const t1 = task("T1", today(0), today(4), { actualEndDate: today(9) });
    const t2 = task("T2", today(5), today(9), { predecessorId: "T1" });
    const result = computeForecast([t1, t2], today(10), opts);
    // T1이 today+9에 끝났으므로 T2의 forecastStart는 today+10
    expect(result.get("T2")!.forecastStart.getTime()).toBeGreaterThanOrEqual(today(10).getTime());
  });

  it("진행 중 task는 currentStageId로 진척률을 결정", () => {
    // s-design = index 1 → (1+1)/10 = 20%
    const t = task("T1", today(-5), today(5), {
      actualStartDate: today(-5),
      currentStageId: "s-design", // 2/10 = 20%
    });
    const result = computeForecast([t], today(0), opts);
    // 진척률 20%이므로 남은 80%는 미래에. 종료일은 today 이후여야 함.
    expect(result.get("T1")!.forecastEnd.getTime()).toBeGreaterThanOrEqual(today(0).getTime());
  });

  it("순환 의존성은 감지되어 에러 발생", () => {
    const t1 = task("T1", today(0), today(4), { predecessorId: "T2" });
    const t2 = task("T2", today(5), today(9), { predecessorId: "T1" });
    expect(() => computeForecast([t1, t2], today(0), opts)).toThrow(/cycle/i);
  });
});
