/**
 * @file src/lib/progress-calc/diagnose.ts
 * @description 진단 판정 + 권장 조치 생성 알고리즘
 *
 * (일정초과 × 리소스충돌) 매트릭스로 4단계 verdict 분류:
 * - NORMAL: 모두 정상
 * - SCHEDULE_OVERRUN: 일정 초과만 있음
 * - RESOURCE_SHORTAGE: 리소스 충돌만 있음
 * - BOTH: 둘 다 있음
 *
 * 초보자 가이드:
 * 1. **진단 매트릭스**: 2x2 matrix (overrun, shortage 여부)
 * 2. **오버런 계산**: 최종 예측 종료일 vs 프로젝트 목표일
 * 3. **부족 계산**: 충돌의 overflow 합산 (MD 단위)
 * 4. **권장 조치**: Critical Path와 충돌 정보로 자동 생성
 */
import { differenceInBusinessDays } from "date-fns";
import { findCriticalPath } from "./critical-path";
import type { ForecastInput, Forecast, Conflict, Diagnosis, Recommendation } from "./types";

export function diagnose(
  tasks: ForecastInput[],
  forecast: Map<string, Forecast>,
  conflicts: Conflict[],
  projectEndDate: Date
): Diagnosis {
  // 1. 최종 예측 종료일 계산
  const allEnds = [...forecast.values()].map((f) => f.forecastEnd);
  const maxEnd = allEnds.reduce((a, b) => (a > b ? a : b), new Date(0));

  // 2. 진단 여부 판정
  const hasOverrun = maxEnd > projectEndDate;
  const hasShortage = conflicts.length > 0;

  // 3. Verdict 결정 (2x2 matrix)
  let verdict: Diagnosis["verdict"];
  if (hasOverrun && hasShortage) {
    verdict = "BOTH";
  } else if (hasOverrun) {
    verdict = "SCHEDULE_OVERRUN";
  } else if (hasShortage) {
    verdict = "RESOURCE_SHORTAGE";
  } else {
    verdict = "NORMAL";
  }

  // 4. 오버런 일수 계산 (영업일 기준)
  const overrunDays = hasOverrun ? differenceInBusinessDays(maxEnd, projectEndDate) : 0;

  // 5. 부족 MD 계산 (overflow를 영업일 기준 MD로 환산, 1주 = 5 영업일)
  const shortageMd = conflicts.reduce((s, c) => s + (c.overflow / 100) * 5, 0);

  // 6. Critical Path 식별
  const criticalPath = findCriticalPath(tasks, forecast);

  // 7. 권장 조치 생성
  const recommendations = buildRecommendations(conflicts, criticalPath, tasks);

  return {
    verdict,
    overrunDays,
    shortageMd,
    criticalPath,
    recommendations,
  };
}

function buildRecommendations(
  conflicts: Conflict[],
  criticalPath: string[],
  tasks: ForecastInput[]
): Recommendation[] {
  const recs: Recommendation[] = [];

  // 충돌이 있을 때만 Critical Path 시작 task에 대한 조치
  if (conflicts.length > 0 && criticalPath.length > 0) {
    const firstId = criticalPath[0];
    const first = tasks.find((t) => t.id === firstId);
    if (first) {
      recs.push({
        severity: "high",
        message: `Critical Path 시작 task(${firstId})의 담당자 추가 또는 분할 검토`,
        taskId: firstId,
      });
    }
  }

  // 각 충돌에 대한 조치
  for (const c of conflicts) {
    recs.push({
      severity: "high",
      message: `${c.userId} ${c.week} 더블부킹(${c.overflow}% 초과) → 시작일 조정 또는 담당자 변경`,
      userId: c.userId,
    });
  }

  return recs;
}
