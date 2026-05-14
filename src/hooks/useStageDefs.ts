/**
 * @file src/hooks/useStageDefs.ts
 * @description 진도 단계 정의 React Query 훅
 *
 * 초보자 가이드:
 * 1. **useStageDefs(projectId, category?)**: 단계 목록 조회 (category 미지정 시 전체)
 * 2. **useCreateStageDef / useUpdateStageDef / useDeleteStageDef / useMergeStageDef**: 변경 mutation
 * 3. **invalidate**: 변경 시 stageDefs 캐시 + progressTask 캐시(진척률 영향) 무효화
 */
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, type ProgressStageDef, type StageCategory } from "@/lib/api";
import { progressTaskKeys } from "./useProgressTasks";

export const stageDefKeys = {
  all: ["stageDefs"] as const,
  list: (projectId: string, category?: StageCategory) =>
    [...stageDefKeys.all, "list", projectId, category ?? "all"] as const,
};

export function useStageDefs(projectId: string | undefined, category?: StageCategory) {
  return useQuery({
    queryKey: stageDefKeys.list(projectId ?? "", category),
    queryFn: () => api.stageDefs.list(projectId!, category),
    enabled: !!projectId,
    staleTime: 1000 * 60 * 5,
  });
}

function invalidateStageAndTaskCaches(qc: ReturnType<typeof useQueryClient>, projectId: string) {
  qc.invalidateQueries({ queryKey: stageDefKeys.all });
  // progressTaskKeys.list(projectId) = ["progress-tasks", "list", projectId]
  // 같은 키를 useComputeForecast가 select로 공유하므로 한 번만 invalidate하면 됨
  qc.invalidateQueries({ queryKey: progressTaskKeys.list(projectId) });
}

export function useCreateStageDef(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { category: StageCategory; name: string; order?: number }) =>
      api.stageDefs.create(projectId, data),
    onSuccess: () => invalidateStageAndTaskCaches(qc, projectId),
  });
}

export function useUpdateStageDef(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: { name?: string; order?: number } }) =>
      api.stageDefs.update(id, data),
    onSuccess: () => invalidateStageAndTaskCaches(qc, projectId),
  });
}

export function useDeleteStageDef(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.stageDefs.delete(id),
    onSuccess: () => invalidateStageAndTaskCaches(qc, projectId),
  });
}

export function useMergeStageDef(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ sourceId, targetStageId }: { sourceId: string; targetStageId: string }) =>
      api.stageDefs.mergeInto(sourceId, targetStageId),
    onSuccess: () => invalidateStageAndTaskCaches(qc, projectId),
  });
}
