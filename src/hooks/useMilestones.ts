/**
 * @file src/hooks/useMilestones.ts
 * @description
 * 마일스톤 관련 React Query hooks입니다.
 * 마일스톤 목록 조회, 생성, 수정, 삭제 기능을 제공합니다.
 * 드래그 & 리사이즈를 위한 Optimistic Update를 지원합니다.
 *
 * 초보자 가이드:
 * 1. **useMilestones**: 프로젝트별 마일스톤 목록 조회
 * 2. **useMilestone**: 단일 마일스톤 조회
 * 3. **useCreateMilestone**: 마일스톤 생성
 * 4. **useUpdateMilestone**: 마일스톤 수정 (Optimistic Update 적용)
 * 5. **useDeleteMilestone**: 마일스톤 삭제
 *
 * 수정 방법:
 * - 드래그 이동: startDate, endDate 동시 변경
 * - 리사이즈: startDate 또는 endDate만 변경
 * - 행 이동: rowId 변경
 *
 * @example
 * const { data: milestones } = useMilestones({ projectId: 'xxx' });
 * const createMilestone = useCreateMilestone();
 * createMilestone.mutate({
 *   name: '설계 완료',
 *   startDate: '2026-03-01',
 *   endDate: '2026-03-15',
 *   projectId: 'xxx',
 *   rowId: 'row-xxx'
 * });
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, type Milestone, type MilestoneStatus } from "@/lib/api";
import { timelineRowKeys } from "./useTimelineRows";

/** 쿼리 키 */
export const milestoneKeys = {
  all: ["milestones"] as const,
  lists: () => [...milestoneKeys.all, "list"] as const,
  list: (filters?: { projectId?: string; status?: MilestoneStatus; rowId?: string }) =>
    [...milestoneKeys.lists(), filters] as const,
  details: () => [...milestoneKeys.all, "detail"] as const,
  detail: (id: string) => [...milestoneKeys.details(), id] as const,
};

/**
 * 마일스톤 목록 조회 Hook
 * @param filters.projectId - 프로젝트 ID (필수)
 * @param filters.status - 상태 필터 (선택)
 * @param filters.rowId - 행 ID 필터 (선택)
 */
export function useMilestones(filters: {
  projectId: string;
  status?: MilestoneStatus;
  rowId?: string;
}) {
  return useQuery({
    queryKey: milestoneKeys.list(filters),
    queryFn: () => api.milestones.list(filters),
    enabled: !!filters.projectId,
  });
}

/**
 * 단일 마일스톤 조회 Hook
 * @param id - 마일스톤 ID
 */
export function useMilestone(id: string) {
  return useQuery({
    queryKey: milestoneKeys.detail(id),
    queryFn: () => api.milestones.get(id),
    enabled: !!id,
  });
}

/**
 * 마일스톤 생성 Hook
 * startDate, endDate로 기간을 지정하고 rowId로 행을 지정
 */
export function useCreateMilestone() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: {
      name: string;
      description?: string;
      startDate: string;
      endDate: string;
      status?: MilestoneStatus;
      color?: string;
      order?: number;
      projectId: string;
      rowId?: string;
    }) => api.milestones.create(data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: milestoneKeys.lists() });
      // 행 데이터도 새로고침 (마일스톤 포함)
      if (variables.rowId) {
        queryClient.invalidateQueries({
          queryKey: timelineRowKeys.detail(variables.rowId),
        });
      }
      queryClient.invalidateQueries({
        queryKey: timelineRowKeys.list(variables.projectId),
      });
    },
  });
}

/**
 * 마일스톤 수정 Hook
 * Optimistic Update를 사용하여 드래그 & 리사이즈 시 즉각적인 UI 반영
 *
 * 사용 예시:
 * - 드래그 이동: { startDate, endDate } 동시 변경
 * - 좌측 리사이즈: { startDate } 변경
 * - 우측 리사이즈: { endDate } 변경
 * - 행 이동: { rowId } 변경
 */
export function useUpdateMilestone() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Milestone> }) =>
      api.milestones.update(id, data),

    // Optimistic Update: API 호출 전에 먼저 UI 업데이트
    onMutate: async ({ id, data }) => {
      // 진행 중인 쿼리 취소 (충돌 방지)
      await queryClient.cancelQueries({ queryKey: milestoneKeys.lists() });

      // 현재 캐시된 모든 milestone 리스트 스냅샷 저장 (롤백용)
      const previousMilestonesMap = new Map<string, Milestone[] | undefined>();
      const queries = queryClient.getQueriesData<Milestone[]>({
        queryKey: milestoneKeys.lists(),
      });

      queries.forEach(([queryKey, milestones]) => {
        const keyString = JSON.stringify(queryKey);
        previousMilestonesMap.set(keyString, milestones);

        // 캐시에서 해당 마일스톤을 찾아 즉시 업데이트
        if (milestones) {
          const updatedMilestones = milestones.map((milestone) =>
            milestone.id === id ? { ...milestone, ...data } : milestone
          );
          queryClient.setQueryData<Milestone[]>(queryKey, updatedMilestones);
        }
      });

      // 롤백을 위해 이전 상태 반환
      return { previousMilestonesMap };
    },

    // 에러 발생 시 이전 상태로 롤백
    onError: (_error, _variables, context) => {
      if (context?.previousMilestonesMap) {
        context.previousMilestonesMap.forEach((milestones, keyString) => {
          const queryKey = JSON.parse(keyString);
          queryClient.setQueryData(queryKey, milestones);
        });
      }
    },

    // 성공/에러 상관없이 항상 최신 데이터로 다시 가져오기
    onSettled: (result, __, variables) => {
      queryClient.invalidateQueries({ queryKey: milestoneKeys.lists() });
      queryClient.invalidateQueries({
        queryKey: milestoneKeys.detail(variables.id),
      });
      // 행 데이터도 새로고침
      if (result?.projectId) {
        queryClient.invalidateQueries({
          queryKey: timelineRowKeys.list(result.projectId),
        });
      }
    },
  });
}

/**
 * 마일스톤 삭제 Hook
 */
export function useDeleteMilestone() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      projectId,
    }: {
      id: string;
      projectId: string;
    }) => api.milestones.delete(id).then(() => ({ id, projectId })),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: milestoneKeys.lists() });
      // 행 데이터도 새로고침
      queryClient.invalidateQueries({
        queryKey: timelineRowKeys.list(result.projectId),
      });
    },
  });
}
