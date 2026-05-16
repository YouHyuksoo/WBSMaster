import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, type ProgressTaskStageDetail } from "@/lib/api";

export const progressTaskStageDetailKeys = {
  all: ["progress-task-stage-details"] as const,
  list: (taskId: string) => [...progressTaskStageDetailKeys.all, "list", taskId] as const,
};

export function useProgressTaskStageDetails(taskId: string | undefined) {
  return useQuery({
    queryKey: progressTaskStageDetailKeys.list(taskId ?? ""),
    queryFn: () => api.progressTasks.stageDetails.list(taskId!),
    enabled: !!taskId,
    staleTime: 1000 * 60 * 2,
  });
}

export function useUpdateProgressTaskStageDetail(taskId: string) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: ({
      stageId,
      data,
    }: {
      stageId: string;
      data: Pick<Partial<ProgressTaskStageDetail>, "description" | "issue" | "assigneeUserId" | "status">;
    }) => api.progressTasks.stageDetails.update(taskId, stageId, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: progressTaskStageDetailKeys.list(taskId) }),
  });
}
