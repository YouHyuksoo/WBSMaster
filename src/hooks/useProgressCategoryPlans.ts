import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, type ProgressCategoryPlan, type StageCategory } from "@/lib/api";
import { progressTaskKeys } from "./useProgressTasks";

export const progressCategoryPlanKeys = {
  all: ["progress-category-plans"] as const,
  list: (projectId: string) => [...progressCategoryPlanKeys.all, "list", projectId] as const,
};

export function useProgressCategoryPlans(projectId: string | undefined) {
  return useQuery({
    queryKey: progressCategoryPlanKeys.list(projectId ?? ""),
    queryFn: () => api.categoryPlans.list(projectId!),
    enabled: !!projectId,
    staleTime: 1000 * 60 * 5,
  });
}

export function useUpdateProgressCategoryPlan(projectId: string) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: ({ category, openDate }: { category: StageCategory; openDate: string | null }) =>
      api.categoryPlans.update(projectId, category, { openDate }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: progressCategoryPlanKeys.list(projectId) });
      qc.invalidateQueries({ queryKey: progressTaskKeys.list(projectId) });
    },
  });
}

export type { ProgressCategoryPlan };
