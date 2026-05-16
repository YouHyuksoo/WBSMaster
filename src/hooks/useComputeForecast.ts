import { useQuery } from "@tanstack/react-query";
import { api, type ProgressStageDef, type ProgressTask, type StageCategory } from "@/lib/api";
import { detectConflicts } from "@/lib/progress-calc/conflicts";
import { diagnose } from "@/lib/progress-calc/diagnose";
import { computeForecast } from "@/lib/progress-calc/forecast";
import type { Conflict, Diagnosis, Forecast } from "@/lib/progress-calc/types";
import { useProgressCategoryPlans } from "./useProgressCategoryPlans";
import { progressTaskKeys } from "./useProgressTasks";
import { useStageDefs } from "./useStageDefs";

export interface ProgressComputeResult {
  tasks: ProgressTask[];
  forecast: Map<string, Forecast>;
  conflicts: Conflict[];
  diagnosis: Diagnosis;
}

function buildStagesByCategory(
  allStages: ProgressStageDef[]
): Map<StageCategory, { id: string; order: number }[]> {
  const map = new Map<StageCategory, { id: string; order: number }[]>();
  for (const stage of allStages) {
    const list = map.get(stage.category) ?? [];
    list.push({ id: stage.id, order: stage.order });
    map.set(stage.category, list);
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
  const categoryPlansQuery = useProgressCategoryPlans(projectId);

  return useQuery({
    queryKey: progressTaskKeys.list(projectId ?? ""),
    queryFn: () => api.progressTasks.list({ projectId: projectId! }),
    enabled: !!projectId && stagesQuery.isSuccess && categoryPlansQuery.isSuccess,
    staleTime: 1000 * 60 * 2,
    refetchOnWindowFocus: false,
    select: (tasks: ProgressTask[]): ProgressComputeResult => {
      const stagesByCategory = buildStagesByCategory(stagesQuery.data ?? []);
      const categoryOpenDates = new Map<StageCategory, Date>(
        (categoryPlansQuery.data ?? [])
          .filter((plan) => plan.openDate)
          .map((plan) => [plan.category, new Date(plan.openDate!)] as const)
      );

      const inputs = tasks.map((task) => ({
        id: task.id,
        startDate: new Date(task.startDate),
        endDate: new Date(task.endDate),
        actualStartDate: task.actualStartDate ? new Date(task.actualStartDate) : null,
        actualEndDate: task.actualEndDate ? new Date(task.actualEndDate) : null,
        stageCategory: task.stageCategory,
        currentStageId: task.currentStageId,
        predecessorId: task.predecessorId,
      }));

      let forecast: Map<string, Forecast>;
      try {
        forecast = computeForecast(inputs, new Date(), { stagesByCategory });
      } catch {
        forecast = new Map();
      }

      const flatAssignees = tasks.flatMap((task) =>
        task.assignees.map((assignee) => ({
          taskId: task.id,
          userId: assignee.userId,
          allocationPct: assignee.allocationPct,
        }))
      );

      const conflicts = detectConflicts(inputs, flatAssignees, forecast);
      const diagnosis = diagnose(
        inputs,
        forecast,
        conflicts,
        projectEndDate ?? new Date(8640000000000000),
        categoryOpenDates
      );

      return { tasks, forecast, conflicts, diagnosis };
    },
  });
}
