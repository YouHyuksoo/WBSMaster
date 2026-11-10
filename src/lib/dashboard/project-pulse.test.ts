/**
 * @file src/lib/dashboard/project-pulse.test.ts
 * @description 프로젝트 한눈에 집계의 날짜 계산(14일 추이 · D-day)을 검증합니다.
 * 초보자 가이드:
 * - DB 없이 순수 함수만 검사한다.
 */
import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/prisma", () => ({ prisma: {} })); // 순수 함수만 검사 (DB 연결 없음)

import { buildTrend, daysBetween } from "./project-pulse";

describe("프로젝트 한눈에 날짜 계산", () => {
  it("최근 14일(오늘 포함)을 빠짐없이 만들고 범위 밖은 버린다", () => {
    const now = new Date(2026, 10, 10, 15, 0);
    const trend = buildTrend([new Date(2026, 10, 10, 9), new Date(2026, 10, 10, 23, 59), new Date(2026, 9, 28, 1), new Date(2026, 9, 27, 23)], now);
    expect(trend).toHaveLength(14);
    expect(trend[0].date).toBe("2026-10-28");
    expect(trend[13]).toEqual({ date: "2026-11-10", count: 2 });
    expect(trend[0].count).toBe(1);
    expect(trend.reduce((s, t) => s + t.count, 0)).toBe(3);
  });

  it("D-day: 같은 날 0, 지나면 음수, 기한 없으면 null", () => {
    const now = new Date(2026, 10, 10, 18, 0);
    expect(daysBetween(now, new Date(2026, 10, 10, 1))).toBe(0);
    expect(daysBetween(now, new Date(2026, 10, 17))).toBe(7);
    expect(daysBetween(now, new Date(2026, 10, 3))).toBe(-7);
    expect(daysBetween(now, null)).toBeNull();
  });
});
