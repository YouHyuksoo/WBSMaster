/**
 * @file src/lib/progress-calc/__tests__/diagnose.test.ts
 * @description diagnose 함수의 단위 테스트
 *
 * 진단 판정 4단계 + 권장 조치 생성 테스트:
 * 1. NORMAL: 오버런 없음 + 충돌 없음
 * 2. SCHEDULE_OVERRUN: 오버런 있음 + 충돌 없음
 * 3. RESOURCE_SHORTAGE: 오버런 없음 + 충돌 있음
 * 4. BOTH: 오버런 있음 + 충돌 있음 (권장사항 다수)
 */
import { describe, it, expect } from "vitest";
import { diagnose } from "../diagnose";
import type { ForecastInput, Forecast, Conflict } from "../types";

/**
 * 기준일로부터 offset 일수만큼 더한 날짜 생성 (테스트용)
 */
const d = (offset: number) => {
  const base = new Date(2026, 4, 13); // 2026-05-13
  base.setDate(base.getDate() + offset);
  return base;
};

/**
 * 기본 task: T1 (5/13 ~ 5/23, 10일)
 */
const task1: ForecastInput = {
  id: "T1",
  startDate: d(0),
  endDate: d(10),
  actualStartDate: null,
  actualEndDate: null,
  stageCategory: "ETC",
  currentStageId: null,
  predecessorId: null,
};

describe("diagnose", () => {
  it("모두 정상이면 verdict NORMAL", () => {
    const forecast = new Map<string, Forecast>([
      [
        "T1",
        {
          forecastStart: d(0),
          forecastEnd: d(10),
          duration: 10,
        },
      ],
    ]);
    const result = diagnose([task1], forecast, [], d(20));

    expect(result.verdict).toBe("NORMAL");
    expect(result.overrunDays).toBeLessThanOrEqual(0);
    expect(result.recommendations.length).toBe(0);
  });

  it("일정 초과만 있으면 SCHEDULE_OVERRUN", () => {
    const forecast = new Map<string, Forecast>([
      [
        "T1",
        {
          forecastStart: d(0),
          forecastEnd: d(15), // 10일 대신 15일
          duration: 15,
        },
      ],
    ]);
    // 목표: d(10) - 하지만 예측: d(15) → 5일 초과
    const result = diagnose([task1], forecast, [], d(10));

    expect(result.verdict).toBe("SCHEDULE_OVERRUN");
    expect(result.overrunDays).toBeGreaterThan(0);
  });

  it("카테고리 오픈일자가 있으면 프로젝트 종료일보다 카테고리 오픈일자를 우선 기준으로 쓴다", () => {
    const forecast = new Map<string, Forecast>([
      [
        "T1",
        {
          forecastStart: d(0),
          forecastEnd: d(15),
          duration: 15,
        },
      ],
    ]);
    const result = diagnose([task1], forecast, [], d(30), new Map([["ETC", d(10)]]));

    expect(result.verdict).toBe("SCHEDULE_OVERRUN");
    expect(result.overrunDays).toBeGreaterThan(0);
    expect(result.categoryOverruns).toEqual([
      {
        category: "ETC",
        openDate: d(10),
        forecastEnd: d(15),
        overrunDays: expect.any(Number),
        taskIds: ["T1"],
      },
    ]);
  });

  it("충돌만 있으면 RESOURCE_SHORTAGE", () => {
    const forecast = new Map<string, Forecast>([
      [
        "T1",
        {
          forecastStart: d(0),
          forecastEnd: d(10),
          duration: 10,
        },
      ],
    ]);
    const conflicts: Conflict[] = [
      {
        userId: "U1",
        week: "2026-W20",
        sumPct: 150,
        overflow: 50,
      },
    ];
    const result = diagnose([task1], forecast, conflicts, d(20));

    expect(result.verdict).toBe("RESOURCE_SHORTAGE");
    expect(result.shortageMd).toBeGreaterThan(0);
    expect(result.recommendations.length).toBe(2); // Critical Path + 충돌
  });

  it("둘 다 있으면 BOTH + 권장 조치 다수", () => {
    const forecast = new Map<string, Forecast>([
      [
        "T1",
        {
          forecastStart: d(0),
          forecastEnd: d(15),
          duration: 15,
        },
      ],
    ]);
    const conflicts: Conflict[] = [
      {
        userId: "U1",
        week: "2026-W20",
        sumPct: 150,
        overflow: 50,
      },
    ];
    const result = diagnose([task1], forecast, conflicts, d(10));

    expect(result.verdict).toBe("BOTH");
    expect(result.overrunDays).toBeGreaterThan(0);
    expect(result.shortageMd).toBeGreaterThan(0);
    expect(result.recommendations.length).toBeGreaterThanOrEqual(2); // Critical Path + 충돌
  });
});
