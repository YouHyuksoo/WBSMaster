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
 * - projectId는 필수 (항상 특정 프로젝트의 task만 조회)
 */
export function useTasks(filters?: { projectId?: string; status?: string; assigneeId?: string }) {
  return useQuery({
    queryKey: taskKeys.list(filters),
    queryFn: () => api.tasks.list(filters),
    // ⭐ projectId가 필수 (선택된 프로젝트의 task만 조회)
    enabled: !!filters?.projectId,
    staleTime: 1000 * 60 * 5, // 5분간 캐시
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: false,
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
 * - assigneeId: 주 담당자 ID (단일)
 * - assigneeIds: 부 담당자 ID 배열 (협업자, 다중)
 */
export function useCreateTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: {
      title: string;
      description?: string;
      projectId: string;
      assigneeId?: string;     // 주 담당자
      assigneeIds?: string[];  // 부 담당자들 (협업자)
      priority?: string;
      startDate?: string;
      dueDate?: string;
      requirementId?: string;
      wbsItemId?: string;      // WBS 항목
    }) => api.tasks.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: taskKeys.lists() });
    },
  });
}

/**
 * 태스크 수정 Hook
 * Optimistic Update를 사용하여 드래그 앤 드롭 시 즉각적인 UI 반영
 */
export function useUpdateTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Task> & { assigneeIds?: string[]; requirementId?: string | null; wbsItemId?: string | null } }) =>
      api.tasks.update(id, data),

    // Optimistic Update: API 호출 전에 먼저 UI 업데이트
    onMutate: async ({ id, data }) => {
      // 진행 중인 쿼리 취소 (충돌 방지)
      await queryClient.cancelQueries({ queryKey: taskKeys.lists() });

      // 현재 캐시된 모든 task 리스트 스냅샷 저장 (롤백용)
      const previousTasksMap = new Map<string, Task[] | undefined>();
      const queries = queryClient.getQueriesData<Task[]>({ queryKey: taskKeys.lists() });

      queries.forEach(([queryKey, tasks]) => {
        const keyString = JSON.stringify(queryKey);
        previousTasksMap.set(keyString, tasks);

        // 캐시에서 해당 태스크를 찾아 즉시 업데이트
        if (tasks) {
          const updatedTasks = tasks.map((task) =>
            task.id === id ? { ...task, ...data } : task
          );
          queryClient.setQueryData<Task[]>(queryKey, updatedTasks);
        }
      });

      // 롤백을 위해 이전 상태 반환
      return { previousTasksMap };
    },

    // 에러 발생 시 이전 상태로 롤백
    onError: (_error, _variables, context) => {
      if (context?.previousTasksMap) {
        context.previousTasksMap.forEach((tasks, keyString) => {
          const queryKey = JSON.parse(keyString);
          queryClient.setQueryData(queryKey, tasks);
        });
      }
    },

    // 성공/에러 상관없이 항상 최신 데이터로 다시 가져오기
    onSettled: (_, __, variables) => {
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

/**
 * 태스크 재촉 Hook
 * 다른 사람의 태스크에 재촉을 보냅니다.
 */
export function useNudgeTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ taskId, message }: { taskId: string; message?: string }) => {
      const response = await fetch(`/api/tasks/${taskId}/nudge`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message }),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "재촉 보내기에 실패했습니다.");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: taskKeys.lists() });
    },
  });
}
