/**
 * @file src/lib/progress-calc/__tests__/critical-path.test.ts
 * @description Critical Path 식별 알고리즘 테스트
 *
 * 초보자 가이드:
 * 1. **단일 task**: 자신이 critical path
 * 2. **선행 체인**: 모든 task가 순차적일 때 전체 체인
 * 3. **분기 구조**: 여러 독립 branch 중 가장 늦게 끝나는 것
 */
import { describe, it, expect } from "vitest";
import { findCriticalPath } from "../critical-path";
import type { ForecastInput, Forecast } from "../types";

const d = (offset: number) => {
  const base = new Date(2026, 4, 13);
  base.setDate(base.getDate() + offset);
  return base;
};

describe("findCriticalPath", () => {
  it("단일 task는 그 task 자신이 critical path", () => {
    const tasks: ForecastInput[] = [
      {
        id: "T1",
        startDate: d(0),
        endDate: d(4),
        actualStartDate: null,
        actualEndDate: null,
        stageCategory: "ETC",
        currentStageId: null,
        predecessorId: null,
      },
    ];
    const forecast = new Map<string, Forecast>([
      ["T1", { forecastStart: d(0), forecastEnd: d(4), duration: 4 }],
    ]);
    expect(findCriticalPath(tasks, forecast)).toEqual(["T1"]);
  });

  it("선행 체인이 critical path로 잡힌다", () => {
    const tasks: ForecastInput[] = [
      {
        id: "T1",
        startDate: d(0),
        endDate: d(4),
        actualStartDate: null,
        actualEndDate: null,
        stageCategory: "ETC",
        currentStageId: null,
        predecessorId: null,
      },
      {
        id: "T2",
        startDate: d(5),
        endDate: d(9),
        actualStartDate: null,
        actualEndDate: null,
        stageCategory: "ETC",
        currentStageId: null,
        predecessorId: "T1",
      },
      {
        id: "T3",
        startDate: d(10),
        endDate: d(14),
        actualStartDate: null,
        actualEndDate: null,
        stageCategory: "ETC",
        currentStageId: null,
        predecessorId: "T2",
      },
    ];
    const forecast = new Map<string, Forecast>([
      ["T1", { forecastStart: d(0), forecastEnd: d(4), duration: 4 }],
      ["T2", { forecastStart: d(5), forecastEnd: d(9), duration: 4 }],
      ["T3", { forecastStart: d(10), forecastEnd: d(14), duration: 4 }],
    ]);
    expect(findCriticalPath(tasks, forecast)).toEqual(["T1", "T2", "T3"]);
  });

  it("두 갈래 중 늦게 끝나는 갈래가 critical path", () => {
    const tasks: ForecastInput[] = [
      {
        id: "A",
        startDate: d(0),
        endDate: d(2),
        actualStartDate: null,
        actualEndDate: null,
        stageCategory: "ETC",
        currentStageId: null,
        predecessorId: null,
      },
      {
        id: "B",
        startDate: d(0),
        endDate: d(5),
        actualStartDate: null,
        actualEndDate: null,
        stageCategory: "ETC",
        currentStageId: null,
        predecessorId: null,
      },
    ];
    const forecast = new Map<string, Forecast>([
      ["A", { forecastStart: d(0), forecastEnd: d(2), duration: 2 }],
      ["B", { forecastStart: d(0), forecastEnd: d(5), duration: 5 }],
    ]);
    expect(findCriticalPath(tasks, forecast)).toEqual(["B"]);
  });
});
