/**
 * @file src/hooks/useRequirements.ts
 * @description
 * 요구사항 관련 React Query hooks입니다.
 * 요구사항 목록 조회, 생성, 수정, 삭제 기능을 제공합니다.
 *
 * 초보자 가이드:
 * 1. **useRequirements**: 요구사항 목록 조회
 * 2. **useRequirement**: 단일 요구사항 조회
 * 3. **useCreateRequirement**: 요구사항 생성
 * 4. **useUpdateRequirement**: 요구사항 수정
 * 5. **useDeleteRequirement**: 요구사항 삭제
 *
 * @example
 * const { data: requirements } = useRequirements({ projectId: 'xxx' });
 * const createReq = useCreateRequirement();
 * createReq.mutate({ title: '새 요구사항', projectId: 'xxx' });
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, type Requirement } from "@/lib/api";

/** 쿼리 키 */
export const requirementKeys = {
  all: ["requirements"] as const,
  lists: () => [...requirementKeys.all, "list"] as const,
  list: (filters?: Record<string, string>) => [...requirementKeys.lists(), filters] as const,
  details: () => [...requirementKeys.all, "detail"] as const,
  detail: (id: string) => [...requirementKeys.details(), id] as const,
};

/**
 * 요구사항 목록 조회 Hook
 */
export function useRequirements(filters?: { projectId?: string; status?: string; priority?: string }) {
  return useQuery({
    queryKey: requirementKeys.list(filters),
    queryFn: () => api.requirements.list(filters),
  });
}

/**
 * 단일 요구사항 조회 Hook
 */
export function useRequirement(id: string) {
  return useQuery({
    queryKey: requirementKeys.detail(id),
    queryFn: () => api.requirements.get(id),
    enabled: !!id,
  });
}

/**
 * 요구사항 생성 Hook
 */
export function useCreateRequirement() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: {
      title: string;
      description?: string;
      projectId: string;
      priority?: string;
      status?: string;
    }) => api.requirements.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: requirementKeys.lists() });
    },
  });
}

/**
 * 요구사항 수정 Hook
 */
export function useUpdateRequirement() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Requirement> }) =>
      api.requirements.update(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: requirementKeys.lists() });
      queryClient.invalidateQueries({ queryKey: requirementKeys.detail(variables.id) });
    },
  });
}

/**
 * 요구사항 삭제 Hook
 */
export function useDeleteRequirement() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => api.requirements.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: requirementKeys.lists() });
    },
  });
}
