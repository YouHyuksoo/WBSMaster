/**
 * @file src/hooks/useProgressTasks.ts
 * @description
 * 진도 task React Query 훅 모음
 *
 * 초보자 가이드:
 * 1. **useProgressTasks**: task 목록 (담당자 포함)
 * 2. **useCreateProgressTask**: task 생성
 * 3. **useUpdateProgressTask**: 인라인 편집용 부분 수정
 * 4. **useDeleteProgressTask**: 삭제
 * 5. **useAddAssignee / useUpdateAssignee / useRemoveAssignee**: 담당자 관리
 */
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, type ProgressTask } from "@/lib/api";
import { useToast } from "@/contexts";

export const progressTaskKeys = {
  all: ["progress-tasks"] as const,
  lists: () => [...progressTaskKeys.all, "list"] as const,
  list: (projectId: string) => [...progressTaskKeys.lists(), projectId] as const,
};

export function useProgressTasks(projectId: string | undefined) {
  return useQuery({
    queryKey: progressTaskKeys.list(projectId ?? ""),
    queryFn: () => api.progressTasks.list({ projectId: projectId! }),
    enabled: !!projectId,
    staleTime: 1000 * 60 * 2,
    refetchOnWindowFocus: false,
  });
}

export function useCreateProgressTask() {
  const qc = useQueryClient();
  const { showToast } = useToast();
  return useMutation({
    mutationFn: (data: {
      projectId: string; name: string; startDate: string; endDate: string;
      category?: string; businessUnit?: string; description?: string; predecessorId?: string; isParallel?: boolean;
    }) => api.progressTasks.create(data),
    onSuccess: (_, vars) => qc.invalidateQueries({ queryKey: progressTaskKeys.list(vars.projectId) }),
    onError: (err: Error) => showToast(err.message || "task 생성 실패", "error"),
  });
}

export function useUpdateProgressTask(projectId: string) {
  const qc = useQueryClient();
  const { showToast } = useToast();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<ProgressTask> }) =>
      api.progressTasks.update(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: progressTaskKeys.list(projectId) }),
    onError: (err: Error) => showToast(err.message || "task 수정 실패", "error"),
  });
}

export function useDeleteProgressTask(projectId: string) {
  const qc = useQueryClient();
  const { showToast } = useToast();
  return useMutation({
    mutationFn: (id: string) => api.progressTasks.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: progressTaskKeys.list(projectId) }),
    onError: (err: Error) => showToast(err.message || "task 삭제 실패", "error"),
  });
}

export function useAddAssignee(projectId: string) {
  const qc = useQueryClient();
  const { showToast } = useToast();
  return useMutation({
    mutationFn: ({ taskId, data }: { taskId: string; data: { userId: string; role?: string; allocationPct?: number } }) =>
      api.progressTasks.addAssignee(taskId, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: progressTaskKeys.list(projectId) }),
    onError: (err: Error) => showToast(err.message || "담당자 추가 실패", "error"),
  });
}

export function useUpdateAssignee(projectId: string) {
  const qc = useQueryClient();
  const { showToast } = useToast();
  return useMutation({
    mutationFn: ({ taskId, userId, data }: { taskId: string; userId: string; data: { role?: string; allocationPct?: number } }) =>
      api.progressTasks.updateAssignee(taskId, userId, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: progressTaskKeys.list(projectId) }),
    onError: (err: Error) => showToast(err.message || "담당자 수정 실패", "error"),
  });
}

export function useRemoveAssignee(projectId: string) {
  const qc = useQueryClient();
  const { showToast } = useToast();
  return useMutation({
    mutationFn: ({ taskId, userId }: { taskId: string; userId: string }) =>
      api.progressTasks.removeAssignee(taskId, userId),
    onSuccess: () => qc.invalidateQueries({ queryKey: progressTaskKeys.list(projectId) }),
    onError: (err: Error) => showToast(err.message || "담당자 제거 실패", "error"),
  });
}
