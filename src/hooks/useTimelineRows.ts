/**
 * @file src/hooks/useTimelineRows.ts
 * @description
 * 타임라인 행 관련 React Query hooks입니다.
 * 타임라인 행 목록 조회, 생성, 수정, 삭제 기능을 제공합니다.
 *
 * 초보자 가이드:
 * 1. **useTimelineRows**: 프로젝트별 타임라인 행 목록 조회
 * 2. **useCreateTimelineRow**: 행 생성
 * 3. **useUpdateTimelineRow**: 행 수정
 * 4. **useDeleteTimelineRow**: 행 삭제
 *
 * @example
 * const { data: rows } = useTimelineRows({ projectId: 'xxx' });
 * const createRow = useCreateTimelineRow();
 * createRow.mutate({ name: '인프라', projectId: 'xxx' });
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, type TimelineRow } from "@/lib/api";

/** 쿼리 키 */
export const timelineRowKeys = {
  all: ["timelineRows"] as const,
  lists: () => [...timelineRowKeys.all, "list"] as const,
  list: (projectId: string) => [...timelineRowKeys.lists(), projectId] as const,
  details: () => [...timelineRowKeys.all, "detail"] as const,
  detail: (id: string) => [...timelineRowKeys.details(), id] as const,
};

/**
 * 타임라인 행 목록 조회 Hook
 * @param projectId - 프로젝트 ID (필수)
 */
export function useTimelineRows(projectId: string) {
  return useQuery({
    queryKey: timelineRowKeys.list(projectId),
    queryFn: () => api.timelineRows.list({ projectId }),
    enabled: !!projectId,
  });
}

/**
 * 단일 타임라인 행 조회 Hook
 * @param id - 행 ID
 */
export function useTimelineRow(id: string) {
  return useQuery({
    queryKey: timelineRowKeys.detail(id),
    queryFn: () => api.timelineRows.get(id),
    enabled: !!id,
  });
}

/**
 * 타임라인 행 생성 Hook
 */
export function useCreateTimelineRow() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: {
      name: string;
      projectId: string;
      color?: string;
      isDefault?: boolean;
      /** 부모 행 ID (자식 행 생성 시) */
      parentId?: string;
    }) => api.timelineRows.create(data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: timelineRowKeys.list(variables.projectId),
      });
    },
  });
}

/**
 * 타임라인 행 수정 Hook
 */
export function useUpdateTimelineRow() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<TimelineRow> }) =>
      api.timelineRows.update(id, data),
    onSuccess: (result) => {
      queryClient.invalidateQueries({
        queryKey: timelineRowKeys.list(result.projectId),
      });
      queryClient.invalidateQueries({
        queryKey: timelineRowKeys.detail(result.id),
      });
    },
  });
}

/**
 * 타임라인 행 삭제 Hook
 */
export function useDeleteTimelineRow() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, projectId }: { id: string; projectId: string }) =>
      api.timelineRows.delete(id).then(() => ({ id, projectId })),
    onSuccess: (result) => {
      queryClient.invalidateQueries({
        queryKey: timelineRowKeys.list(result.projectId),
      });
    },
  });
}
