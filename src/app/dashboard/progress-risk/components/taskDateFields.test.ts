import { describe, expect, it } from "vitest";
import { getTargetDateDiffDays, getTargetDateDiffLabel, toProgressTaskDateRange } from "./taskDateFields";

describe("toProgressTaskDateRange", () => {
  it("uses today as the internal start date and target date as the end date", () => {
    const range = toProgressTaskDateRange("2026-06-30", new Date("2026-05-15T12:34:00+09:00"));

    expect(range).toEqual({
      startDate: "2026-05-15",
      endDate: "2026-06-30",
    });
  });

  it("does not make the internal start date later than a past target date", () => {
    const range = toProgressTaskDateRange("2026-05-01", new Date("2026-05-15T12:34:00+09:00"));

    expect(range).toEqual({
      startDate: "2026-05-01",
      endDate: "2026-05-01",
    });
  });
});

describe("target date diff", () => {
  it("오늘과 목표일의 달력 일수 차이를 계산한다", () => {
    const today = new Date("2026-05-15T09:00:00+09:00");

    expect(getTargetDateDiffDays("2026-05-15", today)).toBe(0);
    expect(getTargetDateDiffDays("2026-05-18", today)).toBe(3);
    expect(getTargetDateDiffDays("2026-05-13", today)).toBe(-2);
  });

  it("목표일 차이를 D-Day 라벨로 표시한다", () => {
    const today = new Date("2026-05-15T09:00:00+09:00");

    expect(getTargetDateDiffLabel("2026-05-15", today)).toBe("D-Day");
    expect(getTargetDateDiffLabel("2026-05-18", today)).toBe("D-3");
    expect(getTargetDateDiffLabel("2026-05-13", today)).toBe("D+2");
  });
});
