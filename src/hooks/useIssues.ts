/**
 * @file src/hooks/useIssues.ts
 * @description
 * 이슈 관련 React Query hooks입니다.
 * 이슈 목록 조회, 생성, 수정, 삭제 기능을 제공합니다.
 *
 * 초보자 가이드:
 * 1. **useIssues**: 이슈 목록 조회
 * 2. **useIssue**: 단일 이슈 조회
 * 3. **useCreateIssue**: 이슈 생성
 * 4. **useUpdateIssue**: 이슈 수정
 * 5. **useDeleteIssue**: 이슈 삭제
 *
 * @example
 * const { data: issues } = useIssues({ projectId: 'xxx' });
 * const createIssue = useCreateIssue();
 * createIssue.mutate({ title: '새 이슈', projectId: 'xxx' });
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, type Issue } from "@/lib/api";

/** 쿼리 키 */
export const issueKeys = {
  all: ["issues"] as const,
  lists: () => [...issueKeys.all, "list"] as const,
  list: (filters?: Record<string, string>) => [...issueKeys.lists(), filters] as const,
  details: () => [...issueKeys.all, "detail"] as const,
  detail: (id: string) => [...issueKeys.details(), id] as const,
  stats: (params?: { projectId?: string }) => [...issueKeys.all, "stats", params] as const,
};

/**
 * 이슈 목록 조회 Hook
 */
export function useIssues(filters?: { projectId?: string; status?: string; priority?: string; category?: string }) {
  return useQuery({
    queryKey: issueKeys.list(filters),
    queryFn: () => api.issues.list(filters),
    staleTime: 1000 * 60 * 5, // 5분간 캐시
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: false,
  });
}

/**
 * 단일 이슈 조회 Hook
 */
export function useIssue(id: string) {
  return useQuery({
    queryKey: issueKeys.detail(id),
    queryFn: () => api.issues.get(id),
    enabled: !!id,
  });
}

/**
 * 이슈 생성 Hook
 */
export function useCreateIssue() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: {
      title: string;
      description?: string;
      projectId: string;
      priority?: string;
      category?: string;
      type?: string;  // 유형 (기능/비기능)
      resolution?: string;  // 처리내용
      dueDate?: string;
      reporterId?: string;
      assigneeId?: string;
    }) => api.issues.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: issueKeys.lists() });
    },
  });
}

/**
 * 이슈 수정 Hook
 */
export function useUpdateIssue() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Issue> }) =>
      api.issues.update(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: issueKeys.lists() });
      queryClient.invalidateQueries({ queryKey: issueKeys.detail(variables.id) });
    },
  });
}

/**
 * 이슈 삭제 Hook
 */
export function useDeleteIssue() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => api.issues.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: issueKeys.lists() });
    },
  });
}

/**
 * 이슈 통계 조회 Hook
 * 카테고리별 분포, 해결/미해결 건수 등
 */
export function useIssueStats(params?: { projectId?: string }) {
  return useQuery({
    queryKey: issueKeys.stats(params),
    queryFn: () => api.issues.stats(params),
    staleTime: 1000 * 60 * 5, // 5분간 캐시
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: false,
  });
}
