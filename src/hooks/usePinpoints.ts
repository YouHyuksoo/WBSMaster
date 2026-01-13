/**
 * @file src/hooks/usePinpoints.ts
 * @description
 * 핀포인트 관련 React Query hooks입니다.
 * 핀포인트 목록 조회, 생성, 수정, 삭제 기능을 제공합니다.
 *
 * 초보자 가이드:
 * 1. **usePinpoints**: 프로젝트/행별 핀포인트 목록 조회
 * 2. **useCreatePinpoint**: 핀포인트 생성
 * 3. **useUpdatePinpoint**: 핀포인트 수정
 * 4. **useDeletePinpoint**: 핀포인트 삭제
 *
 * @example
 * const { data: pinpoints } = usePinpoints({ projectId: 'xxx', rowId: 'xxx' });
 * const createPinpoint = useCreatePinpoint();
 * createPinpoint.mutate({ name: '오픈', date: '2026-06-15', projectId: 'xxx', rowId: 'xxx', color: '#FF0000' });
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, type Pinpoint } from "@/lib/api";

/** 쿼리 키 */
export const pinpointKeys = {
  all: ["pinpoints"] as const,
  lists: () => [...pinpointKeys.all, "list"] as const,
  list: (projectId: string, rowId?: string) =>
    [...pinpointKeys.lists(), projectId, rowId] as const,
  details: () => [...pinpointKeys.all, "detail"] as const,
  detail: (id: string) => [...pinpointKeys.details(), id] as const,
};

/**
 * 핀포인트 목록 조회 Hook
 * @param projectId - 프로젝트 ID (필수)
 * @param rowId - 행 ID (선택, 지정시 해당 행의 핀포인트만)
 */
export function usePinpoints(params: { projectId?: string; rowId?: string }) {
  return useQuery({
    queryKey: pinpointKeys.list(params.projectId || "", params.rowId),
    queryFn: () =>
      api.pinpoints.list({
        projectId: params.projectId || "",
        rowId: params.rowId,
      }),
    enabled: !!params.projectId,
    staleTime: 1000 * 60 * 5, // 5분간 캐시
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: false,
  });
}

/**
 * 핀포인트 생성 Hook (Optimistic Update)
 * 생성 시 즉시 UI에 추가하고, 서버 요청 후 ID 동기화
 */
export function useCreatePinpoint() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: {
      name: string;
      date: string;
      projectId: string;
      rowId: string;
      description?: string;
      color?: string;
    }) => api.pinpoints.create(data),
    onMutate: async (variables) => {
      // 진행 중인 쿼리 취소
      await queryClient.cancelQueries({
        queryKey: pinpointKeys.list(variables.projectId, variables.rowId),
      });
      await queryClient.cancelQueries({
        queryKey: pinpointKeys.list(variables.projectId),
      });

      // Optimistic Update: 임시 ID로 새로운 핀포인트 추가
      const tempId = `temp-${Date.now()}`;
      const newPinpoint: Pinpoint = {
        id: tempId,
        name: variables.name,
        date: variables.date,
        projectId: variables.projectId,
        rowId: variables.rowId,
        color: variables.color || "#EF4444",
        description: variables.description || null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const previousByRow = queryClient.getQueryData<Pinpoint[]>(
        pinpointKeys.list(variables.projectId, variables.rowId)
      );
      const previousByProject = queryClient.getQueryData<Pinpoint[]>(
        pinpointKeys.list(variables.projectId)
      );

      if (previousByRow) {
        queryClient.setQueryData<Pinpoint[]>(
          pinpointKeys.list(variables.projectId, variables.rowId),
          [...previousByRow, newPinpoint]
        );
      }

      if (previousByProject) {
        queryClient.setQueryData<Pinpoint[]>(
          pinpointKeys.list(variables.projectId),
          [...previousByProject, newPinpoint]
        );
      }

      return { previousByRow, previousByProject, tempId };
    },
    onError: (_, variables, context) => {
      // 실패 시 롤백
      if (context?.previousByRow) {
        queryClient.setQueryData(
          pinpointKeys.list(variables.projectId, variables.rowId),
          context.previousByRow
        );
      }
      if (context?.previousByProject) {
        queryClient.setQueryData(
          pinpointKeys.list(variables.projectId),
          context.previousByProject
        );
      }
    },
    onSuccess: (_, variables) => {
      // 성공 후 캐시 갱신 (서버에서 최종 ID 등 동기화)
      queryClient.invalidateQueries({
        queryKey: pinpointKeys.list(variables.projectId, variables.rowId),
      });
      queryClient.invalidateQueries({
        queryKey: pinpointKeys.list(variables.projectId),
      });
    },
  });
}

/**
 * 핀포인트 수정 Hook (Optimistic Update)
 * 수정 시 즉시 UI에 반영하고, 서버 요청 후 최종 동기화
 */
export function useUpdatePinpoint() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Pinpoint> }) =>
      api.pinpoints.update(id, data),
    onMutate: async ({ id, data }) => {
      // 진행 중인 쿼리 취소
      const queries = queryClient
        .getQueryCache()
        .findAll({ queryKey: pinpointKeys.lists(), type: "active" });

      const cancelPromises = queries.map((query) =>
        queryClient.cancelQueries({ queryKey: query.queryKey })
      );

      await Promise.all(cancelPromises);

      // 모든 관련 캐시에서 핀포인트 업데이트
      const updateCache = (oldData: Pinpoint[] | undefined) => {
        if (!oldData) return undefined;
        return oldData.map((p) => (p.id === id ? { ...p, ...data } : p));
      };

      const previousQueries = new Map();

      // 모든 핀포인트 관련 쿼리의 이전 상태 백업 및 업데이트
      queries.forEach((query) => {
        const previousData = queryClient.getQueryData<Pinpoint[]>(query.queryKey);
        previousQueries.set(query.queryKey, previousData);
        queryClient.setQueryData<Pinpoint[]>(query.queryKey, updateCache(previousData));
      });

      return { previousQueries };
    },
    onError: (_, { id }, context) => {
      // 실패 시 모든 캐시 롤백
      if (context?.previousQueries) {
        context.previousQueries.forEach((previousData: Pinpoint[], queryKey: any) => {
          queryClient.setQueryData(queryKey, previousData);
        });
      }
    },
    onSuccess: (result) => {
      // 성공 후 최종 동기화
      queryClient.invalidateQueries({
        queryKey: pinpointKeys.list(result.projectId, result.rowId),
      });
      queryClient.invalidateQueries({
        queryKey: pinpointKeys.detail(result.id),
      });
    },
  });
}

/**
 * 핀포인트 삭제 Hook (Optimistic Update)
 * 삭제 시 즉시 UI에서 제거하고, 서버 요청 후 캐시 갱신
 */
export function useDeletePinpoint() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, projectId, rowId }: { id: string; projectId: string; rowId: string }) =>
      api.pinpoints.delete(id).then(() => ({ id, projectId, rowId })),
    onMutate: async (variables) => {
      // 진행 중인 쿼리 취소 (optimistic update와 충돌 방지)
      await queryClient.cancelQueries({
        queryKey: pinpointKeys.list(variables.projectId, variables.rowId),
      });
      await queryClient.cancelQueries({
        queryKey: pinpointKeys.list(variables.projectId),
      });

      // 현재 캐시된 핀포인트 목록 백업
      const previousByRow = queryClient.getQueryData<Pinpoint[]>(
        pinpointKeys.list(variables.projectId, variables.rowId)
      );
      const previousByProject = queryClient.getQueryData<Pinpoint[]>(
        pinpointKeys.list(variables.projectId)
      );

      // Optimistic Update: 캐시에서 삭제된 핀포인트 제거
      if (previousByRow) {
        queryClient.setQueryData<Pinpoint[]>(
          pinpointKeys.list(variables.projectId, variables.rowId),
          previousByRow.filter((p) => p.id !== variables.id)
        );
      }

      if (previousByProject) {
        queryClient.setQueryData<Pinpoint[]>(
          pinpointKeys.list(variables.projectId),
          previousByProject.filter((p) => p.id !== variables.id)
        );
      }

      // 롤백을 위해 이전 상태 반환
      return { previousByRow, previousByProject };
    },
    onError: (_, variables, context) => {
      // 삭제 실패 시 이전 상태로 롤백
      if (context?.previousByRow) {
        queryClient.setQueryData(
          pinpointKeys.list(variables.projectId, variables.rowId),
          context.previousByRow
        );
      }
      if (context?.previousByProject) {
        queryClient.setQueryData(
          pinpointKeys.list(variables.projectId),
          context.previousByProject
        );
      }
    },
    onSuccess: (result) => {
      // 삭제 성공 후 캐시 갱신 (최종 확인)
      queryClient.invalidateQueries({
        queryKey: pinpointKeys.list(result.projectId, result.rowId),
      });
      queryClient.invalidateQueries({
        queryKey: pinpointKeys.list(result.projectId),
      });
    },
  });
}
