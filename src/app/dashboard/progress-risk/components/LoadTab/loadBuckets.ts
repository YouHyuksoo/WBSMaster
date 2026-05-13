/**
 * @file src/app/dashboard/progress-risk/components/LoadTab/loadBuckets.ts
 * @description user × week 매트릭스용 부하 버킷 계산
 *
 * 초보자 가이드:
 * 1. **buildLoadBuckets**: assignee 목록 + forecast 맵으로부터 user별 주차 부하 누적
 * 2. **weekKey**: ISO 주차 형식 (YYYY-Www) 생성
 * 3. **UserLoad**: { userId, userName, avatar, weeks[] } 구조
 * 4. **WeekBucket**: { key, date, sumPct } — 주차별 누적 참여율
 */

import { eachWeekOfInterval, getISOWeek, getISOWeekYear } from "date-fns";
import type { Forecast } from "@/lib/progress-calc/types";

interface AssigneeWithUser {
  taskId: string;
  userId: string;
  allocationPct: number;
  user: { id: string; name: string; email: string; avatar?: string | null };
}

export interface WeekBucket {
  key: string;
  date: Date;
  sumPct: number;
}

export interface UserLoad {
  userId: string;
  userName: string;
  avatar: string | null;
  weeks: WeekBucket[];
}

/**
 * ISO 주차 키 생성 (YYYY-Www 형식)
 * 예: "2026-W20"
 */
function weekKey(date: Date): string {
  return `${getISOWeekYear(date)}-W${String(getISOWeek(date)).padStart(2, "0")}`;
}

/**
 * assignee 목록과 forecast로부터 user × week 부하 매트릭스 구성
 * @param assignees - task별 assignee 목록 (user 정보 포함)
 * @param forecast - taskId → Forecast 맵
 * @returns user별 주차 부하 정보 배열 (이름순 정렬)
 */
export function buildLoadBuckets(
  assignees: AssigneeWithUser[],
  forecast: Map<string, Forecast>
): UserLoad[] {
  // Step 1: user별로 assignee 그룹화
  const byUser = new Map<string, AssigneeWithUser[]>();
  for (const a of assignees) {
    const list = byUser.get(a.userId) ?? [];
    list.push(a);
    byUser.set(a.userId, list);
  }

  const results: UserLoad[] = [];

  // Step 2: user별로 주차 버킷 생성
  for (const [userId, items] of byUser) {
    const buckets = new Map<string, WeekBucket>();

    // Step 3: 각 assignee의 task forecast 주차에 참여율 누적
    for (const a of items) {
      const f = forecast.get(a.taskId);
      if (!f) continue;

      // forecast 기간의 모든 ISO 주를 순회
      const weeks = eachWeekOfInterval(
        { start: f.forecastStart, end: f.forecastEnd },
        { weekStartsOn: 1 } // Monday = 주의 시작
      );

      for (const w of weeks) {
        const key = weekKey(w);
        const existing = buckets.get(key);
        if (existing) {
          // 이미 있으면 참여율 누적
          existing.sumPct += a.allocationPct;
        } else {
          // 새로 생성
          buckets.set(key, { key, date: w, sumPct: a.allocationPct });
        }
      }
    }

    // Step 4: 주차별로 정렬
    const sortedWeeks = [...buckets.values()].sort(
      (a, b) => a.date.getTime() - b.date.getTime()
    );

    results.push({
      userId,
      userName: items[0].user.name,
      avatar: items[0].user.avatar ?? null,
      weeks: sortedWeeks,
    });
  }

  // Step 5: 사용자 이름순 정렬
  return results.sort((a, b) => a.userName.localeCompare(b.userName));
}
