/**
 * @file src/hooks/useWeeklyReports.ts
 * @description
 * 주간보고 관련 React Query hooks입니다.
 * 주간보고 CRUD 및 자동 로드 기능을 제공합니다.
 *
 * 초보자 가이드:
 * 1. **useWeeklyReports**: 주간보고 목록 조회
 * 2. **useWeeklyReport**: 단일 주간보고 조회
 * 3. **useCreateWeeklyReport**: 주간보고 생성
 * 4. **useUpdateWeeklyReport**: 주간보고 수정
 * 5. **useDeleteWeeklyReport**: 주간보고 삭제
 * 6. **useAutoLoadData**: 자동 로드 데이터 조회 (전주계획 + 완료 Task)
 * 7. **useWeeklyReportItems**: 항목 목록 조회
 * 8. **useCreateReportItem**: 항목 추가
 * 9. **useUpdateReportItem**: 항목 수정
 * 10. **useDeleteReportItem**: 항목 삭제
 *
 * @example
 * const { data: reports } = useWeeklyReports({ projectId: 'xxx' });
 * const createReport = useCreateWeeklyReport();
 * createReport.mutate({ projectId: 'xxx', year: 2026, weekNumber: 2, ... });
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  api,
  type WeeklyReport,
  type WeeklyReportItem,
  type AutoLoadData,
  type WorkCategory,
  type ReportItemType,
  type ReportStatus,
} from "@/lib/api";

/** 쿼리 키 */
export const weeklyReportKeys = {
  all: ["weeklyReports"] as const,
  lists: () => [...weeklyReportKeys.all, "list"] as const,
  list: (filters?: Record<string, string | undefined>) =>
    [...weeklyReportKeys.lists(), filters] as const,
  details: () => [...weeklyReportKeys.all, "detail"] as const,
  detail: (id: string) => [...weeklyReportKeys.details(), id] as const,
  items: (reportId: string) => [...weeklyReportKeys.all, "items", reportId] as const,
  autoLoad: (params: { projectId: string; year: string; weekNumber: string }) =>
    [...weeklyReportKeys.all, "autoLoad", params] as const,
};

/**
 * 주간보고 목록 조회 Hook
 */
export function useWeeklyReports(filters?: {
  projectId?: string;
  userId?: string;
  year?: string;
  weekNumber?: string;
}) {
  return useQuery({
    queryKey: weeklyReportKeys.list(filters),
    queryFn: () => api.weeklyReports.list(filters),
    staleTime: 1000 * 60 * 5, // 5분간 캐시
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: false,
  });
}

/**
 * 단일 주간보고 조회 Hook
 */
export function useWeeklyReport(id: string | null | undefined) {
  return useQuery({
    queryKey: weeklyReportKeys.detail(id || ""),
    queryFn: () => api.weeklyReports.get(id!),
    enabled: !!id,
  });
}

/**
 * 주간보고 생성 Hook
 */
export function useCreateWeeklyReport() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: {
      projectId: string;
      year: number;
      weekNumber: number;
      weekStart: string;
      weekEnd: string;
      issueContent?: string;
    }) => api.weeklyReports.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: weeklyReportKeys.lists() });
    },
  });
}

/**
 * 주간보고 수정 Hook
 */
export function useUpdateWeeklyReport() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: { issueContent?: string; status?: ReportStatus };
    }) => api.weeklyReports.update(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: weeklyReportKeys.lists() });
      queryClient.invalidateQueries({
        queryKey: weeklyReportKeys.detail(variables.id),
      });
    },
  });
}

/**
 * 주간보고 삭제 Hook
 */
export function useDeleteWeeklyReport() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => api.weeklyReports.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: weeklyReportKeys.lists() });
    },
  });
}

/**
 * 자동 로드 데이터 조회 Hook
 * 전주 차주계획 + 해당 주 완료 Task
 */
export function useAutoLoadData(params: {
  projectId: string;
  year: string;
  weekNumber: string;
}) {
  return useQuery<AutoLoadData>({
    queryKey: weeklyReportKeys.autoLoad(params),
    queryFn: () => api.weeklyReports.autoLoad(params),
    enabled: !!params.projectId && !!params.year && !!params.weekNumber,
  });
}

/**
 * 주간보고 항목 목록 조회 Hook
 */
export function useWeeklyReportItems(reportId: string | null | undefined) {
  return useQuery({
    queryKey: weeklyReportKeys.items(reportId || ""),
    queryFn: () => api.weeklyReportItems.list(reportId!),
    enabled: !!reportId,
  });
}

/**
 * 주간보고 항목 추가 Hook
 */
export function useCreateReportItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      reportId,
      data,
    }: {
      reportId: string;
      data: {
        type: ReportItemType;
        category: WorkCategory;
        title: string;
        description?: string;
        targetDate?: string;
        remarks?: string;
        isAdditional?: boolean;
        isCompleted?: boolean;
        progress?: number;
        linkedTaskId?: string;
        linkedWbsId?: string;
        order?: number;
      };
    }) => api.weeklyReportItems.create(reportId, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: weeklyReportKeys.items(variables.reportId),
      });
      queryClient.invalidateQueries({
        queryKey: weeklyReportKeys.detail(variables.reportId),
      });
    },
  });
}

/**
 * 주간보고 항목 수정 Hook
 */
export function useUpdateReportItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      reportId,
      itemId,
      data,
    }: {
      reportId: string;
      itemId: string;
      data: Partial<Omit<WeeklyReportItem, "id" | "reportId" | "createdAt" | "updatedAt">>;
    }) => api.weeklyReportItems.update(reportId, itemId, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: weeklyReportKeys.items(variables.reportId),
      });
      queryClient.invalidateQueries({
        queryKey: weeklyReportKeys.detail(variables.reportId),
      });
    },
  });
}

/**
 * 주간보고 항목 삭제 Hook
 */
export function useDeleteReportItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ reportId, itemId }: { reportId: string; itemId: string }) =>
      api.weeklyReportItems.delete(reportId, itemId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: weeklyReportKeys.items(variables.reportId),
      });
      queryClient.invalidateQueries({
        queryKey: weeklyReportKeys.detail(variables.reportId),
      });
    },
  });
}

/**
 * 복수 항목 일괄 추가 Hook
 * 자동 로드 시 전주계획을 금주실적으로 일괄 추가할 때 사용
 */
export function useBulkCreateReportItems() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      reportId,
      items,
    }: {
      reportId: string;
      items: Array<{
        type: ReportItemType;
        category: WorkCategory;
        title: string;
        description?: string;
        targetDate?: string;
        remarks?: string;
        isAdditional?: boolean;
        isCompleted?: boolean;
        progress?: number;
        linkedTaskId?: string;
        linkedWbsId?: string;
        order?: number;
      }>;
    }) => {
      // 순차적으로 생성
      const results: WeeklyReportItem[] = [];
      for (const item of items) {
        const result = await api.weeklyReportItems.create(reportId, item);
        results.push(result);
      }
      return results;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: weeklyReportKeys.items(variables.reportId),
      });
      queryClient.invalidateQueries({
        queryKey: weeklyReportKeys.detail(variables.reportId),
      });
    },
  });
}
