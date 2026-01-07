/**
 * @file src/hooks/useTasks.ts
 * @description
 * 태스크 관련 React Query hooks입니다.
 * 태스크 목록 조회, 생성, 수정, 삭제 기능을 제공합니다.
 *
 * 초보자 가이드:
 * 1. **useTasks**: 태스크 목록 조회
 * 2. **useTask**: 단일 태스크 조회
 * 3. **useCreateTask**: 태스크 생성
 * 4. **useUpdateTask**: 태스크 수정 (상태 변경 등)
 * 5. **useDeleteTask**: 태스크 삭제
 *
 * @example
 * const { data: tasks } = useTasks({ projectId: 'xxx' });
 * const updateTask = useUpdateTask();
 * updateTask.mutate({ id: 'xxx', data: { status: 'COMPLETED' } });
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, type Task } from "@/lib/api";

/** 쿼리 키 */
export const taskKeys = {
  all: ["tasks"] as const,
  lists: () => [...taskKeys.all, "list"] as const,
  list: (filters?: Record<string, string>) => [...taskKeys.lists(), filters] as const,
  details: () => [...taskKeys.all, "detail"] as const,
  detail: (id: string) => [...taskKeys.details(), id] as const,
};

/**
 * 태스크 목록 조회 Hook
 */
export function useTasks(filters?: { projectId?: string; status?: string; assigneeId?: string }) {
  return useQuery({
    queryKey: taskKeys.list(filters),
    queryFn: () => api.tasks.list(filters),
  });
}

/**
 * 단일 태스크 조회 Hook
 */
export function useTask(id: string) {
  return useQuery({
    queryKey: taskKeys.detail(id),
    queryFn: () => api.tasks.get(id),
    enabled: !!id,
  });
}

/**
 * 태스크 생성 Hook
 */
export function useCreateTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: {
      title: string;
      description?: string;
      projectId: string;
      assigneeId?: string;
      priority?: string;
      dueDate?: string;
    }) => api.tasks.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: taskKeys.lists() });
    },
  });
}

/**
 * 태스크 수정 Hook
 */
export function useUpdateTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Task> }) =>
      api.tasks.update(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: taskKeys.lists() });
      queryClient.invalidateQueries({ queryKey: taskKeys.detail(variables.id) });
    },
  });
}

/**
 * 태스크 삭제 Hook
 */
export function useDeleteTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => api.tasks.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: taskKeys.lists() });
    },
  });
}
