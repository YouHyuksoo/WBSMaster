/**
 * @file src/hooks/useComputeForecast.ts
 * @description
 * 진도 task 목록 + project 정보를 받아 forecast / conflicts / diagnosis를
 * 한 번에 derive하는 통합 훅. React Query `select`로 메모이즈.
 *
 * 초보자 가이드:
 * 1. **선택**: useProgressTasks 대신 이걸 사용하면 계산 결과까지 함께 얻음
 * 2. **queryKey 공유**: useProgressTasks와 같은 queryKey → 캐시 중복 없음
 * 3. **projectEndDate**: 일정 초과 판정 기준. null이면 비활성화
 * 4. **stagesByCategory**: useStageDefs로 카테고리별 단계 목록을 빌드해 computeForecast에 전달
 */
import { useQuery } from "@tanstack/react-query";
import { api, type ProgressTask, type ProgressStageDef, type StageCategory } from "@/lib/api";
import { computeForecast } from "@/lib/progress-calc/forecast";
import { detectConflicts } from "@/lib/progress-calc/conflicts";
import { diagnose } from "@/lib/progress-calc/diagnose";
import { progressTaskKeys } from "./useProgressTasks";
import { useStageDefs } from "./useStageDefs";
import type { Forecast, Conflict, Diagnosis } from "@/lib/progress-calc/types";

export interface ProgressComputeResult {
  tasks: ProgressTask[];
  forecast: Map<string, Forecast>;
  conflicts: Conflict[];
  diagnosis: Diagnosis;
}

/**
 * stagesByCategory Map 빌드 헬퍼
 * ProgressStageDef 배열 → 카테고리별로 order 순 정렬된 Map
 */
function buildStagesByCategory(
  allStages: ProgressStageDef[]
): Map<StageCategory, { id: string; order: number }[]> {
  const map = new Map<StageCategory, { id: string; order: number }[]>();
  for (const s of allStages) {
    const list = map.get(s.category) ?? [];
    list.push({ id: s.id, order: s.order });
    map.set(s.category, list);
  }
  for (const list of map.values()) {
    list.sort((a, b) => a.order - b.order);
  }
  return map;
}

export function useComputeForecast(
  projectId: string | undefined,
  projectEndDate: Date | null
) {
  const stagesQuery = useStageDefs(projectId);

  return useQuery({
    queryKey: progressTaskKeys.list(projectId ?? ""),
    queryFn: () => api.progressTasks.list({ projectId: projectId! }),
    enabled: !!projectId && stagesQuery.isSuccess,
    staleTime: 1000 * 60 * 2,
    refetchOnWindowFocus: false,
    select: (tasks: ProgressTask[]): ProgressComputeResult => {
      const allStages = stagesQuery.data ?? [];
      const stagesByCategory = buildStagesByCategory(allStages);

      const inputs = tasks.map(t => ({
        id: t.id,
        startDate: new Date(t.startDate),
        endDate: new Date(t.endDate),
        actualStartDate: t.actualStartDate ? new Date(t.actualStartDate) : null,
        actualEndDate: t.actualEndDate ? new Date(t.actualEndDate) : null,
        stageCategory: t.stageCategory,
        currentStageId: t.currentStageId,
        predecessorId: t.predecessorId,
      }));

      let forecast: Map<string, Forecast>;
      try {
        forecast = computeForecast(inputs, new Date(), { stagesByCategory });
      } catch {
        // 순환 의존성 등: 빈 결과 반환
        forecast = new Map();
      }

      const flatAssignees = tasks.flatMap(t =>
        t.assignees.map(a => ({
          taskId: t.id,
          userId: a.userId,
          allocationPct: a.allocationPct,
        }))
      );

      const conflicts = detectConflicts(inputs, flatAssignees, forecast);
      const diagnosis = diagnose(
        inputs,
        forecast,
        conflicts,
        projectEndDate ?? new Date(8640000000000000) // 미설정 시 무한대 (오버런 X)
      );

      return { tasks, forecast, conflicts, diagnosis };
    },
  });
}
