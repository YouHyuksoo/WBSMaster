/**
 * @file src/lib/progress-calc/__tests__/conflicts.test.ts
 * @description 인력 충돌 감지 알고리즘 테스트
 *
 * 초보자 가이드:
 * 1. **detectConflicts**: 사용자별로 주(week) 단위 할당 비율 누적
 * 2. **충돌 조건**: 같은 주에 100% 초과 시 감지
 * 3. **ISO week**: date-fns 기준 월요일 시작
 */
import { describe, it, expect } from "vitest";
import { detectConflicts } from "../conflicts";
import type { ForecastInput, Forecast } from "../types";

const d = (offset: number) => {
  const base = new Date(2026, 4, 13); // 2026-05-13 (수요일)
  base.setDate(base.getDate() + offset);
  return base;
};

const T1: ForecastInput = {
  id: "T1",
  startDate: d(0),
  endDate: d(10),
  actualStartDate: null,
  actualEndDate: null,
  stageCategory: "ETC",
  currentStageId: null,
  predecessorId: null,
};

const T2: ForecastInput = {
  id: "T2",
  startDate: d(0),
  endDate: d(10),
  actualStartDate: null,
  actualEndDate: null,
  stageCategory: "ETC",
  currentStageId: null,
  predecessorId: null,
};

const forecast = new Map<string, Forecast>([
  ["T1", { forecastStart: d(0), forecastEnd: d(10), duration: 10 }],
  ["T2", { forecastStart: d(0), forecastEnd: d(10), duration: 10 }],
]);

describe("detectConflicts", () => {
  it("같은 user가 동일 기간 100% 넘게 할당되면 충돌 감지", () => {
    const assignees = [
      { taskId: "T1", userId: "U1", allocationPct: 100 },
      { taskId: "T2", userId: "U1", allocationPct: 50 },
    ];
    const conflicts = detectConflicts([T1, T2], assignees, forecast);
    expect(conflicts.length).toBeGreaterThan(0);
    expect(conflicts[0].userId).toBe("U1");
    expect(conflicts[0].overflow).toBe(50);
  });

  it("다른 user들은 충돌 없음", () => {
    const assignees = [
      { taskId: "T1", userId: "U1", allocationPct: 100 },
      { taskId: "T2", userId: "U2", allocationPct: 100 },
    ];
    const conflicts = detectConflicts([T1, T2], assignees, forecast);
    expect(conflicts).toHaveLength(0);
  });

  it("기간이 겹치지 않으면 충돌 없음", () => {
    const A: ForecastInput = { ...T1, id: "A" };
    const B: ForecastInput = { ...T2, id: "B", startDate: d(20), endDate: d(30) };
    const f = new Map<string, Forecast>([
      ["A", { forecastStart: d(0), forecastEnd: d(10), duration: 10 }],
      ["B", { forecastStart: d(20), forecastEnd: d(30), duration: 10 }],
    ]);
    const assignees = [
      { taskId: "A", userId: "U1", allocationPct: 100 },
      { taskId: "B", userId: "U1", allocationPct: 100 },
    ];
    const conflicts = detectConflicts([A, B], assignees, f);
    expect(conflicts).toHaveLength(0);
  });
});
