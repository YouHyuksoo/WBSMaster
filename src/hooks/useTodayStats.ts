/**
 * @file src/hooks/useTodayStats.ts
 * @description
 * 오늘 등록된 데이터 통계 조회 React Query 훅입니다.
 * 헤더 중앙 스크롤러에서 사용합니다.
 *
 * 초보자 가이드:
 * 1. **10분 자동 갱신**: refetchInterval: 1000 * 60 * 10
 * 2. **5분 캐시**: staleTime: 1000 * 60 * 5
 * 3. **projectId 필수**: 선택된 프로젝트의 데이터만 조회
 *
 * @example
 * const { data: stats } = useTodayStats(projectId);
 * console.log(stats.tasks); // 오늘 등록된 TASK 수
 */

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

/** 오늘 통계 타입 */
export interface TodayStats {
  tasks: number;
  requirements: number;
  customerRequirements: number;
  issues: number;
}

/** 쿼리 키 */
export const todayStatsKeys = {
  all: ["todayStats"] as const,
  list: (projectId?: string) => [...todayStatsKeys.all, projectId] as const,
};

/**
 * 오늘 등록된 데이터 통계 조회 Hook
 *
 * @param projectId - 프로젝트 ID (선택사항, 없으면 전체)
 * @returns 오늘 통계 데이터 (자동 10분 갱신)
 */
export function useTodayStats(projectId?: string) {
  return useQuery({
    queryKey: todayStatsKeys.list(projectId),
    queryFn: () =>
      api.todayStats.list({ projectId }),
    enabled: !!projectId,
    // ⭐ 10분마다 자동 갱신 (600,000ms)
    refetchInterval: 1000 * 60 * 10,
    // 5분간 fresh 상태 유지
    staleTime: 1000 * 60 * 5,
    // 불필요한 refetch 방지
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: false,
  });
}
