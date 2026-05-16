import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, type ProgressRiskIssue, type StageCategory } from "@/lib/api";

export const progressRiskIssueKeys = {
  all: ["progress-risk-issues"] as const,
  lists: () => [...progressRiskIssueKeys.all, "list"] as const,
  list: (filters: { projectId?: string; stageCategory?: StageCategory; majorCategory?: string; status?: string }) =>
    [...progressRiskIssueKeys.lists(), filters] as const,
};

export function useProgressRiskIssues(filters: {
  projectId?: string;
  stageCategory?: StageCategory;
  majorCategory?: string;
  status?: string;
}) {
  return useQuery({
    queryKey: progressRiskIssueKeys.list(filters),
    queryFn: () => api.progressRiskIssues.list({ projectId: filters.projectId!, ...filters }),
    enabled: !!filters.projectId,
    staleTime: 1000 * 60 * 2,
  });
}

export function useCreateProgressRiskIssue() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.progressRiskIssues.create,
    onSuccess: () => qc.invalidateQueries({ queryKey: progressRiskIssueKeys.lists() }),
  });
}

export function useUpdateProgressRiskIssue() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<ProgressRiskIssue> }) =>
      api.progressRiskIssues.update(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: progressRiskIssueKeys.lists() }),
  });
}

export function useDeleteProgressRiskIssue() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.progressRiskIssues.delete,
    onSuccess: () => qc.invalidateQueries({ queryKey: progressRiskIssueKeys.lists() }),
  });
}
