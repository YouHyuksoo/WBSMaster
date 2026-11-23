/**
 * @file src/app/dashboard/weekly-report/constants.test.ts
 * @description
 * 주간보고 주차 드롭다운 라벨(주차 + 기간) 계산을 검사합니다.
 *
 * 초보자 가이드:
 * 1. 프로젝트 시작일이 속한 주의 월요일이 1주차 시작입니다.
 * 2. 라벨은 "N주차 (M/D ~ M/D)" 형식, 월요일~일요일입니다.
 */

import { describe, it, expect } from "vitest";
import { formatWeekOptionLabel, getProjectWeekDateRange } from "./constants";

describe("formatWeekOptionLabel", () => {
  it("프로젝트 주차 라벨에 월~일 기간을 붙인다", () => {
    // 2026-01-08(목) 시작 → 1주차 1/5(월) ~ 1/11(일)
    const start = new Date(2026, 0, 8);
    const w1 = getProjectWeekDateRange(start, 1);
    expect(formatWeekOptionLabel(1, w1.start, w1.end)).toBe("1주차 (1/5 ~ 1/11)");

    // 월말을 넘는 주
    const w4 = getProjectWeekDateRange(start, 4);
    expect(formatWeekOptionLabel(4, w4.start, w4.end)).toBe("4주차 (1/26 ~ 2/1)");
  });
});
