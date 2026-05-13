/**
 * @file src/app/dashboard/progress-risk/components/LoadTab/__tests__/loadBuckets.test.ts
 * @description buildLoadBuckets 함수 단위 테스트
 */
import { describe, it, expect } from "vitest";
import { buildLoadBuckets } from "../loadBuckets";
import type { Forecast } from "@/lib/progress-calc/types";

const d = (offset: number) => {
  const base = new Date(2026, 4, 13);
  base.setDate(base.getDate() + offset);
  return base;
};

describe("buildLoadBuckets", () => {
  it("user별로 주차 버킷에 참여율 누적", () => {
    const assignees = [
      { taskId: "T1", userId: "U1", allocationPct: 100, user: { id: "U1", name: "Alice", email: "a@x" } },
      { taskId: "T2", userId: "U1", allocationPct: 50, user: { id: "U1", name: "Alice", email: "a@x" } },
    ];
    const forecast = new Map<string, Forecast>([
      ["T1", { forecastStart: d(0), forecastEnd: d(7), duration: 7 }],
      ["T2", { forecastStart: d(0), forecastEnd: d(7), duration: 7 }],
    ]);
    const result = buildLoadBuckets(assignees, forecast);
    expect(result.length).toBe(1);
    expect(result[0].userId).toBe("U1");
    expect(result[0].weeks.length).toBeGreaterThan(0);
    expect(result[0].weeks[0].sumPct).toBe(150);
  });

  it("assignee 없으면 빈 배열", () => {
    const result = buildLoadBuckets([], new Map());
    expect(result).toEqual([]);
  });
});
