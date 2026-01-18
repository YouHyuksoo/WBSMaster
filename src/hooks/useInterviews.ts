/**
 * @file src/hooks/useInterviews.ts
 * @description
 * 인터뷰 관리 관련 React Query hooks입니다.
 * 인터뷰 목록 조회, 생성, 수정, 삭제 기능을 제공합니다.
 *
 * 초보자 가이드:
 * 1. **useInterviews**: 인터뷰 목록 조회 (필터링 지원)
 * 2. **useInterview**: 단일 인터뷰 조회
 * 3. **useCreateInterview**: 인터뷰 생성 (인터뷰 코드 자동 부여)
 * 4. **useUpdateInterview**: 인터뷰 수정
 * 5. **useDeleteInterview**: 인터뷰 삭제
 *
 * @example
 * const { data: interviews } = useInterviews({ projectId: 'xxx' });
 * const createInterview = useCreateInterview();
 * createInterview.mutate({ projectId: 'xxx', title: '인터뷰명', businessUnit: 'V_IVI' });
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, type Interview, type InterviewTransferStatus } from "@/lib/api";

/** 쿼리 키 */
export const interviewKeys = {
  all: ["interviews"] as const,
  lists: () => [...interviewKeys.all, "list"] as const,
  list: (filters?: Record<string, string | undefined>) =>
    [...interviewKeys.lists(), filters] as const,
  details: () => [...interviewKeys.all, "detail"] as const,
  detail: (id: string) => [...interviewKeys.details(), id] as const,
};

/**
 * 인터뷰 목록 조회 Hook
 * @param filters - 필터 옵션 (projectId, businessUnit, transferStatus, search)
 * staleTime: 5분 (자주 변경되지 않으므로 캐싱)
 */
export function useInterviews(filters?: {
  projectId?: string;
  businessUnit?: string;
  transferStatus?: string;
  search?: string;
}) {
  return useQuery({
    queryKey: interviewKeys.list(filters),
    queryFn: () => api.interviews.list(filters),
    enabled: !!filters?.projectId, // projectId가 있을 때만 조회
    staleTime: 1000 * 60 * 5, // 5분간 fresh 상태 유지
  });
}

/**
 * 단일 인터뷰 조회 Hook
 * @param id - 인터뷰 ID
 */
export function useInterview(id: string) {
  return useQuery({
    queryKey: interviewKeys.detail(id),
    queryFn: () => api.interviews.get(id),
    enabled: !!id,
  });
}

/**
 * 인터뷰 생성 Hook
 * 인터뷰 코드(code)는 자동으로 부여됩니다 (IV0001 형식)
 */
export function useCreateInterview() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: {
      projectId: string;
      title: string;
      interviewDate?: string;
      interviewer?: string;
      interviewee?: string;
      businessUnit: string;
      currentProcess?: string;
      painPoints?: string;
      desiredResults?: string;
      technicalConstraints?: string;
      questions?: string;
      remarks?: string;
    }) => api.interviews.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: interviewKeys.lists() });
    },
  });
}

/**
 * 인터뷰 수정 Hook
 */
export function useUpdateInterview() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Interview> }) =>
      api.interviews.update(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: interviewKeys.lists() });
      queryClient.invalidateQueries({
        queryKey: interviewKeys.detail(variables.id),
      });
    },
  });
}

/**
 * 인터뷰 삭제 Hook
 */
export function useDeleteInterview() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => api.interviews.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: interviewKeys.lists() });
    },
  });
}
