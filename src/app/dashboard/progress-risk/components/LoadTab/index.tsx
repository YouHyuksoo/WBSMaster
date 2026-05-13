/**
 * @file src/app/dashboard/progress-risk/components/LoadTab/index.tsx
 * @description 인력부하 탭 — LoadHeatmap 컨테이너
 *
 * 초보자 가이드:
 * 1. **Props**: ProgressTask[] + Forecast Map
 * 2. **flatAssignees**: 모든 task의 assignee를 평탄화
 * 3. **buildLoadBuckets**: assignee들을 주차별 부하로 변환
 * 4. **LoadHeatmap**: 변환된 데이터를 히트맵으로 시각화
 */

"use client";

import type { ProgressTask } from "@/lib/api";
import type { Forecast } from "@/lib/progress-calc/types";
import { buildLoadBuckets } from "./loadBuckets";
import { LoadHeatmap } from "./LoadHeatmap";

interface Props {
  tasks: ProgressTask[];
  forecast: Map<string, Forecast>;
}

export function LoadTab({ tasks, forecast }: Props) {
  // Step 1: 모든 task의 assignee를 단일 배열로 평탄화
  const flatAssignees = tasks.flatMap((t) =>
    t.assignees.map((a) => ({
      taskId: t.id,
      userId: a.userId,
      allocationPct: a.allocationPct,
      user: a.user,
    }))
  );

  // Step 2: assignee 배열 + forecast으로부터 user별 부하 계산
  const loads = buildLoadBuckets(flatAssignees, forecast);

  // Step 3: 히트맵으로 렌더링
  return <LoadHeatmap loads={loads} />;
}
