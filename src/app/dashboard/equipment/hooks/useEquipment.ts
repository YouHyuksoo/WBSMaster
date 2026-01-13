/**
 * @file src/app/dashboard/equipment/hooks/useEquipment.ts
 * @description
 * 설비 관리 React Query 훅
 * 설비 CRUD 기능을 제공합니다.
 *
 * 초보자 가이드:
 * 1. **useEquipment**: 설비 목록 조회 (React Query)
 * 2. **useCreateEquipment**: 설비 생성 (Mutation)
 * 3. **useUpdateEquipment**: 설비 수정 (Mutation)
 * 4. **useDeleteEquipment**: 설비 삭제 (Mutation)
 *
 * @example
 * const { data: equipments, isLoading } = useEquipment({ projectId: "xxx" });
 * const createEquipment = useCreateEquipment();
 * createEquipment.mutate({ projectId: "xxx", name: "새 설비", type: "MACHINE" });
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, Equipment } from "@/lib/api";

/** 사업부 목록 조회 훅 (최초 1회만) */
export function useEquipmentDivisions(projectId?: string) {
  return useQuery({
    queryKey: ["equipmentDivisions", projectId],
    queryFn: () => api.equipment.getFilters(projectId!),
    enabled: !!projectId,
    staleTime: Infinity, // 무한 캐시 (수동 갱신 전까지 유지)
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: false,
  });
}

/** 라인 목록 조회 훅 (사업부 선택 시 동적 조회) */
export function useEquipmentLines(projectId?: string, divisionCode?: string) {
  return useQuery({
    queryKey: ["equipmentLines", projectId, divisionCode],
    queryFn: () => api.equipment.getFilters(projectId!, divisionCode),
    enabled: !!projectId && !!divisionCode, // 사업부 선택 시에만 조회
    staleTime: 1000 * 60 * 5, // 5분 캐시
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: false,
  });
}

/** @deprecated useEquipmentDivisions, useEquipmentLines 사용 권장 */
export function useEquipmentFilters(projectId?: string) {
  return useEquipmentDivisions(projectId);
}

/** 설비 목록 조회 훅 (사업부/라인 필터 지원) */
export function useEquipment(params?: { projectId?: string; divisionCode?: string; lineCode?: string }) {
  return useQuery({
    queryKey: ["equipment", params],
    queryFn: () => api.equipment.list(params),
    enabled: !!params?.projectId,
    // 불필요한 refetch 방지
    staleTime: 1000 * 60 * 5, // 5분간 데이터를 fresh로 유지
    refetchOnWindowFocus: false, // 윈도우 포커스 시 refetch 안 함
    refetchOnMount: false, // 컴포넌트 마운트 시 refetch 안 함 (이미 캐시에 있으면)
    refetchOnReconnect: false, // 네트워크 재연결 시 refetch 안 함
  });
}

/** 설비 상세 조회 훅 */
export function useEquipmentDetail(id: string) {
  return useQuery({
    queryKey: ["equipment", id],
    queryFn: () => api.equipment.get(id),
    enabled: !!id,
  });
}

/** 설비 생성 훅 */
export function useCreateEquipment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Parameters<typeof api.equipment.create>[0]) =>
      api.equipment.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["equipment"] });
    },
  });
}

/** 설비 수정 변수 타입 */
interface UpdateEquipmentVariables {
  id: string;
  data: Partial<Equipment>;
  skipInvalidation?: boolean; // true면 쿼리 무효화 건너뛰기 (드래그, 정렬 등)
}

/** 설비 수정 훅 */
export function useUpdateEquipment() {
  const queryClient = useQueryClient();

  return useMutation<Equipment, Error, UpdateEquipmentVariables>({
    mutationFn: ({ id, data }) => api.equipment.update(id, data),
    onSuccess: (_, variables) => {
      // skipInvalidation이 true가 아닐 때만 쿼리 무효화 (DB refetch)
      if (!variables.skipInvalidation) {
        queryClient.invalidateQueries({ queryKey: ["equipment"] });
      }
    },
  });
}

/** 설비 삭제 훅 */
export function useDeleteEquipment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => api.equipment.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["equipment"] });
    },
  });
}

/** 설비 위치 일괄 업데이트 타입 */
interface BulkUpdatePosition {
  id: string;
  positionX: number;
  positionY: number;
}

/** 설비 위치 일괄 업데이트 훅 (캔버스 저장용) */
export function useBulkUpdateEquipment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (updates: BulkUpdatePosition[]) => api.equipment.bulkUpdate(updates),
    onSuccess: () => {
      // ⭐ 저장 성공 후 캐시 무효화하여 다음 선택 시 최신 데이터 로드
      // (카드 선택 후 취소 시 이전 위치로 돌아가는 버그 방지)
      queryClient.invalidateQueries({ queryKey: ["equipment"] });
    },
  });
}
