/**
 * @file src/lib/progress-calc/critical-path.ts
 * @description Critical Path 식별 알고리즘
 *
 * 가장 늦은 forecastEnd를 갖는 task에서 predecessor 체인 역추적.
 * 분기 그래프 구조를 지원하며, 선행 관계만 고려함.
 *
 * 초보자 가이드:
 * 1. **Critical Path**: 가장 늦게 끝나는 task 찾기
 * 2. **역추적**: predecessorId를 통해 선행 task로 거슬러 올라가기
 * 3. **결과**: 루트부터 endTask까지의 경로를 배열로 반환
 */
import type { ForecastInput, Forecast } from "./types";

export function findCriticalPath(
  tasks: ForecastInput[],
  forecast: Map<string, Forecast>
): string[] {
  if (tasks.length === 0) return [];

  // 가장 늦은 forecastEnd를 갖는 task 찾기
  let endTask = tasks[0];
  for (const t of tasks) {
    const f = forecast.get(t.id);
    const ef = forecast.get(endTask.id);
    if (f && ef && f.forecastEnd > ef.forecastEnd) {
      endTask = t;
    }
  }

  // predecessor 체인 역추적
  const byId = new Map(tasks.map((t) => [t.id, t]));
  const path: string[] = [];
  let cur: ForecastInput | undefined = endTask;
  while (cur) {
    path.unshift(cur.id);
    cur = cur.predecessorId ? byId.get(cur.predecessorId) : undefined;
  }
  return path;
}
