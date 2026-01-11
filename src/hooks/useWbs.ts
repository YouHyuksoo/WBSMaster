/**
 * @file src/hooks/useWbs.ts
 * @description
 * WBS(Work Breakdown Structure) 관련 React Query hooks입니다.
 * 계층형 WBS 구조의 CRUD 작업을 지원합니다.
 *
 * 초보자 가이드:
 * 1. **useWbsItems**: WBS 항목 목록 조회 (트리 또는 평탄화)
 * 2. **useWbsItem**: 특정 WBS 항목 상세 조회
 * 3. **useCreateWbsItem**: WBS 항목 생성
 * 4. **useUpdateWbsItem**: WBS 항목 수정
 * 5. **useDeleteWbsItem**: WBS 항목 삭제
 *
 * @example
 * // 트리 구조로 WBS 목록 조회
 * const { data: wbsTree } = useWbsItems({ projectId: 'xxx' });
 *
 * // 평탄화된 목록 조회
 * const { data: wbsList } = useWbsItems({ projectId: 'xxx', flat: true });
 *
 * // WBS 항목 생성
 * const createWbs = useCreateWbsItem();
 * createWbs.mutate({
 *   name: '분석',
 *   projectId: 'xxx',
 *   level: 'LEVEL1'
 * });
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, WbsItem, WbsLevel, WbsStats } from "@/lib/api";

/** WBS Query Keys */
export const wbsKeys = {
  all: ["wbs"] as const,
  lists: () => [...wbsKeys.all, "list"] as const,
  list: (params: { projectId: string; flat?: boolean; parentId?: string }) =>
    [...wbsKeys.lists(), params] as const,
  details: () => [...wbsKeys.all, "detail"] as const,
  detail: (id: string) => [...wbsKeys.details(), id] as const,
  stats: (params?: { projectId?: string }) => [...wbsKeys.all, "stats", params] as const,
};

/** WBS 목록 조회 파라미터 */
interface UseWbsItemsParams {
  projectId?: string;
  flat?: boolean;
  parentId?: string;
}

/**
 * WBS 항목 목록 조회 Hook
 * 기본적으로 트리 구조로 반환, flat: true면 평탄화된 목록
 */
export function useWbsItems(params?: UseWbsItemsParams) {
  return useQuery({
    queryKey: wbsKeys.list({
      projectId: params?.projectId || "",
      flat: params?.flat,
      parentId: params?.parentId,
    }),
    queryFn: () =>
      api.wbs.list({
        projectId: params?.projectId || "",
        flat: params?.flat ? "true" : undefined,
        parentId: params?.parentId,
      }),
    enabled: !!params?.projectId,
    staleTime: 1000 * 60 * 5, // 5분간 fresh 상태 유지
  });
}

/**
 * 특정 WBS 항목 상세 조회 Hook
 */
export function useWbsItem(id: string) {
  return useQuery({
    queryKey: wbsKeys.detail(id),
    queryFn: () => api.wbs.get(id),
    enabled: !!id,
  });
}

/** WBS 항목 생성 데이터 */
interface CreateWbsItemData {
  name: string;
  description?: string;
  projectId: string;
  parentId?: string;
  level: WbsLevel;
  assigneeIds?: string[];
  startDate?: string;
  endDate?: string;
  weight?: number;
  deliverableName?: string; // 산출물명
  deliverableLink?: string; // 산출물 링크
}

/**
 * WBS 항목 생성 Hook
 */
export function useCreateWbsItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateWbsItemData) => api.wbs.create(data),
    onSuccess: (newItem) => {
      // 목록 캐시 무효화 (모든 형태)
      queryClient.invalidateQueries({ queryKey: wbsKeys.lists() });

      // 부모 항목이 있으면 부모 상세 정보도 무효화
      if (newItem.parentId) {
        queryClient.invalidateQueries({ queryKey: wbsKeys.detail(newItem.parentId) });
      }
    },
  });
}

/** WBS 항목 수정 데이터 */
interface UpdateWbsItemData {
  id: string;
  name?: string;
  description?: string;
  status?: string;
  progress?: number;
  startDate?: string;
  endDate?: string;
  actualStartDate?: string; // 실제 시작일
  actualEndDate?: string;   // 실제 종료일
  weight?: number;
  assigneeIds?: string[];
  order?: number;
  deliverableName?: string; // 산출물명
  deliverableLink?: string; // 산출물 링크
}

/**
 * WBS 항목 수정 Hook
 */
export function useUpdateWbsItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, ...data }: UpdateWbsItemData) => api.wbs.update(id, data),
    onSuccess: (updatedItem) => {
      // 목록 캐시 무효화
      queryClient.invalidateQueries({ queryKey: wbsKeys.lists() });

      // 수정된 항목 캐시 업데이트
      queryClient.setQueryData(wbsKeys.detail(updatedItem.id), updatedItem);

      // 부모 항목도 무효화 (진행률 재계산 때문)
      if (updatedItem.parentId) {
        queryClient.invalidateQueries({ queryKey: wbsKeys.detail(updatedItem.parentId) });
      }
    },
  });
}

/**
 * WBS 항목 삭제 Hook
 */
export function useDeleteWbsItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => api.wbs.delete(id),
    onSuccess: (result) => {
      // 목록 캐시 무효화
      queryClient.invalidateQueries({ queryKey: wbsKeys.lists() });

      // 삭제된 항목 캐시 제거
      queryClient.removeQueries({ queryKey: wbsKeys.detail(result.deletedId) });
    },
  });
}

/** WBS 레벨 변경 데이터 */
interface ChangeWbsLevelData {
  id: string;
  direction: "up" | "down";
}

/**
 * WBS 항목 레벨 변경 Hook
 * - up: 상위 레벨로 이동 (LEVEL4 → LEVEL3)
 * - down: 하위 레벨로 이동 (LEVEL3 → LEVEL4)
 */
export function useChangeWbsLevel() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, direction }: ChangeWbsLevelData) =>
      api.wbs.changeLevel(id, direction),
    onSuccess: () => {
      // 목록 캐시 전체 무효화 (구조가 변경되므로)
      queryClient.invalidateQueries({ queryKey: wbsKeys.lists() });
      // 상세 캐시도 무효화
      queryClient.invalidateQueries({ queryKey: wbsKeys.details() });
    },
  });
}

/**
 * WBS 단위업무 기반 담당자별 통계 조회 Hook
 * 대시보드 등에서 담당자별 진행률 표시에 사용
 */
export function useWbsStats(params?: { projectId?: string }) {
  return useQuery({
    queryKey: wbsKeys.stats(params),
    queryFn: () => api.wbs.stats(params),
    staleTime: 1000 * 60 * 2, // 2분간 fresh 상태 유지
  });
}
