/**
 * @file src/hooks/useWeeklySummaries.ts
 * @description
 * 주간보고 취합(Summary) 관련 React Query 훅입니다.
 * 취합 보고서 목록 조회, 생성, 수정, 삭제 및 LLM 분석 기능을 제공합니다.
 *
 * 초보자 가이드:
 * 1. **useWeeklySummaries**: 취합 보고서 목록 조회
 * 2. **useWeeklySummary**: 단일 취합 보고서 조회
 * 3. **useCreateWeeklySummary**: 취합 보고서 생성
 * 4. **useUpdateWeeklySummary**: 취합 보고서 수정
 * 5. **useDeleteWeeklySummary**: 취합 보고서 삭제
 * 6. **useAnalyzeWeeklySummary**: LLM 분석 실행
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, WeeklySummary } from "@/lib/api";

/** 쿼리 키 */
const QUERY_KEY = "weekly-summaries";

/**
 * 취합 보고서 목록 조회 훅
 * @param params 조회 조건 (projectId, year, weekNumber)
 */
export function useWeeklySummaries(params?: {
  projectId?: string;
  year?: number;
  weekNumber?: number;
}) {
  return useQuery({
    queryKey: [QUERY_KEY, params],
    queryFn: () =>
      api.weeklySummaries.list({
        projectId: params?.projectId,
        year: params?.year?.toString(),
        weekNumber: params?.weekNumber?.toString(),
      }),
    enabled: !!params?.projectId,
    staleTime: 1000 * 60 * 5, // 5분간 캐시
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: false,
  });
}

/**
 * 단일 취합 보고서 조회 훅
 * @param id 취합 보고서 ID
 */
export function useWeeklySummary(id: string | null) {
  return useQuery({
    queryKey: [QUERY_KEY, id],
    queryFn: () => (id ? api.weeklySummaries.get(id) : null),
    enabled: !!id,
  });
}

/**
 * 취합 보고서 생성 훅
 */
export function useCreateWeeklySummary() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: {
      projectId: string;
      year: number;
      weekNumber: number;
      weekStart: string;
      weekEnd: string;
      title: string;
      reportIds: string[];
      createdById: string;
    }) => api.weeklySummaries.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
    },
  });
}

/**
 * 취합 보고서 수정 훅
 */
export function useUpdateWeeklySummary() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: {
        title?: string;
        llmSummary?: string;
        llmInsights?: string;
      };
    }) => api.weeklySummaries.update(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY, variables.id] });
    },
  });
}

/**
 * 취합 보고서 삭제 훅
 */
export function useDeleteWeeklySummary() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => api.weeklySummaries.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
    },
  });
}

/**
 * LLM 분석 실행 훅
 */
export function useAnalyzeWeeklySummary() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => api.weeklySummaries.analyze(id),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY, data.id] });
    },
  });
}
