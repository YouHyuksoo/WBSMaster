/**
 * @file src/lib/wbs/schedule-stats.test.ts
 * @description
 * WBS 일정 통계(계획·실적 진척률, 지연율, 달성률, 작업일) 순수 계산 테스트입니다.
 *
 * 초보자 가이드:
 * - 기대값은 src/app/api/wbs/schedule-stats/route.ts 의 산식으로 손계산했다 (화면과 채팅이 같은 숫자를 내야 한다).
 *   계획 = Σ(LEVEL1 가중치 × 말단 평균 기간경과비율)/100, 실적 = Σ(가중치 × 말단 평균 진행률)/100
 * - today = 2026-11-10(화), 프로젝트 2026-11-02(월) ~ 2026-11-15(일), 휴일 없음
 *   A(가중치 60): A1 11-02~11-12 진행 50 → 경과 80%, A2 11-02~11-06 완료 100 → 경과 100%
 *   B(가중치 40): B1 11-09~11-20 진행 0 → 경과 1/11, B2 11-01~11-05 진행 50 → 경과 100% (지연)
 *   계획 = 60×90/100 + 40×54.545/100 = 75.8, 실적 = 60×75/100 + 40×25/100 = 55.0
 */

import { describe, expect, it } from "vitest";
import { computeScheduleStats, type WbsNode } from "./schedule-stats";

const d = (m: number, day: number) => new Date(2026, m - 1, day);
const leaf = (o: Partial<WbsNode>): WbsNode => ({ status: "PENDING", progress: 0, weight: 1, startDate: null, endDate: null, actualEndDate: null, children: [], ...o });

const level1: WbsNode[] = [
  leaf({
    weight: 60,
    children: [
      leaf({ status: "IN_PROGRESS", progress: 50, startDate: d(11, 2), endDate: d(11, 12) }),
      leaf({ status: "COMPLETED", progress: 100, startDate: d(11, 2), endDate: d(11, 6), actualEndDate: d(11, 6) }),
    ],
  }),
  leaf({
    weight: 40,
    children: [
      leaf({ status: "PENDING", progress: 0, startDate: d(11, 9), endDate: d(11, 20) }),
      leaf({ status: "IN_PROGRESS", progress: 50, startDate: d(11, 1), endDate: d(11, 5) }),
    ],
  }),
];

const input = {
  project: { id: "p1", name: "오창", startDate: d(11, 2), endDate: d(11, 15) },
  holidays: [] as Date[],
  level1Items: level1,
  today: d(11, 10),
};

describe("computeScheduleStats", () => {
  it("plan/actual/delay match hand-computed fixture", () => {
    const s = computeScheduleStats(input);
    expect(s.wbs).toEqual({
      total: 4,
      completed: 1,
      inProgress: 2,
      delayed: 1,
      plannedProgress: 75.8,
      actualProgress: 55,
      delayRate: 20.8,
      achievementRate: 73,
      totalWeight: 100,
    });
  });

  it("schedule working days exclude weekends and holidays", () => {
    const s = computeScheduleStats(input);
    expect(s.schedule).toEqual({
      totalDays: 14,
      weekendDays: 4,
      holidayCount: 0,
      workingDays: 10,
      elapsedDays: 9,
      remainingDays: 5,
      elapsedWorkingDays: 7,
      remainingWorkingDays: 3,
      expectedProgress: 70,
    });
    const withHoliday = computeScheduleStats({ ...input, holidays: [d(11, 4)] });
    expect(withHoliday.schedule.workingDays).toBe(9);
    expect(withHoliday.schedule.holidayCount).toBe(1);
  });
});
