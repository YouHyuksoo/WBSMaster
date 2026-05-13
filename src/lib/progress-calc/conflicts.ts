/**
 * @file src/lib/progress-calc/conflicts.ts
 * @description 사용자별로 주(week) 단위 버킷에 참여율을 누적하여 100% 초과 감지
 *
 * 초보자 가이드:
 * 1. **weekKey**: ISO 주차 문자열 생성 (예: "2026-W20")
 * 2. **detectConflicts**: 사용자별 주(week) 단위 누적 할당율 계산
 * 3. **충돌**: 같은 주에 100% 초과 시 감지되며, overflow 계산
 */
import { eachWeekOfInterval, getISOWeek, getISOWeekYear } from "date-fns";
import type { ForecastInput, Forecast, Conflict } from "./types";

type AssigneeLike = { taskId: string; userId: string; allocationPct: number };

function weekKey(date: Date): string {
  const w = getISOWeek(date);
  const y = getISOWeekYear(date);
  return `${y}-W${String(w).padStart(2, "0")}`;
}

/**
 * 인력 충돌 감지
 * @param tasks - 태스크 목록
 * @param assignees - 할당 정보 (taskId, userId, allocationPct)
 * @param forecast - forecast 계산 결과 (forecastStart, forecastEnd)
 * @returns 충돌 목록 (userId, week, sumPct, overflow)
 */
export function detectConflicts(
  tasks: ForecastInput[],
  assignees: AssigneeLike[],
  forecast: Map<string, Forecast>
): Conflict[] {
  // user별로 그룹화
  const byUser = new Map<string, AssigneeLike[]>();
  for (const a of assignees) {
    const list = byUser.get(a.userId) ?? [];
    list.push(a);
    byUser.set(a.userId, list);
  }

  const conflicts: Conflict[] = [];

  for (const [userId, items] of byUser) {
    // 주(week) 단위 버킷에 누적
    const buckets = new Map<string, number>();

    for (const a of items) {
      const f = forecast.get(a.taskId);
      if (!f) continue;
      const weeks = eachWeekOfInterval(
        { start: f.forecastStart, end: f.forecastEnd },
        { weekStartsOn: 1 } // 월요일 시작
      );
      for (const w of weeks) {
        const key = weekKey(w);
        buckets.set(key, (buckets.get(key) ?? 0) + a.allocationPct);
      }
    }

    for (const [week, sumPct] of buckets) {
      if (sumPct > 100) {
        conflicts.push({ userId, week, sumPct, overflow: sumPct - 100 });
      }
    }
  }

  return conflicts;
}
