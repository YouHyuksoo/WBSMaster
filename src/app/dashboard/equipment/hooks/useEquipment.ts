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

/** 설비 목록 조회 훅 */
export function useEquipment(params?: { projectId?: string }) {
  return useQuery({
    queryKey: ["equipment", params],
    queryFn: () => api.equipment.list(params),
    enabled: !!params?.projectId,
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
      // 저장 성공 시 쿼리 무효화하여 최신 데이터 반영
      queryClient.invalidateQueries({ queryKey: ["equipment"] });
    },
  });
}
