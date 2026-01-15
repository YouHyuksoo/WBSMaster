/**
 * @file src/app/dashboard/kanban/hooks/useTaskConnections.ts
 * @description
 * 태스크 연결 관련 React Query 훅
 *
 * 초보자 가이드:
 * 1. **useTaskConnections**: 연결 목록 조회
 * 2. **useCreateTaskConnection**: 연결 생성
 * 3. **useDeleteTaskConnection**: 연결 삭제
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, TaskConnection } from "@/lib/api";

/** 태스크 연결 목록 조회 훅 */
export function useTaskConnections(params?: { projectId?: string }) {
  return useQuery({
    queryKey: ["taskConnections", params],
    queryFn: () => api.taskConnections.list(params),
    enabled: !!params?.projectId,
  });
}

/** 태스크 연결 생성 훅 */
export function useCreateTaskConnection() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: {
      fromTaskId: string;
      toTaskId: string;
      projectId: string;
      type?: string;
      label?: string;
      color?: string;
      animated?: boolean;
      sourceHandle?: string;
      targetHandle?: string;
    }) => api.taskConnections.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["taskConnections"] });
    },
  });
}

/** 태스크 연결 삭제 훅 */
export function useDeleteTaskConnection() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => api.taskConnections.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["taskConnections"] });
    },
  });
}
