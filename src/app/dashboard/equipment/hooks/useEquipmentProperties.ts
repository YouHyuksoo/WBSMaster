/**
 * @file src/app/dashboard/equipment/hooks/useEquipmentProperties.ts
 * @description
 * 설비 속성 관리 React Query 훅
 * 동적 속성 CRUD 기능을 제공합니다.
 *
 * 초보자 가이드:
 * 1. **useEquipmentProperties**: 속성 목록 조회 (React Query)
 * 2. **useCreateProperty**: 속성 생성 (Mutation)
 * 3. **useUpdateProperty**: 속성 수정 (Mutation)
 * 4. **useDeleteProperty**: 속성 삭제 (Mutation)
 *
 * @example
 * const { data: properties } = useEquipmentProperties("eq-id");
 * const createProperty = useCreateProperty();
 * createProperty.mutate({ equipmentId: "eq-id", data: { key: "용량", value: "100", valueType: "NUMBER" } });
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, EquipmentProperty } from "@/lib/api";

/** 속성 목록 조회 훅 */
export function useEquipmentProperties(equipmentId: string) {
  return useQuery({
    queryKey: ["equipmentProperties", equipmentId],
    queryFn: () => api.equipmentProperties.list(equipmentId),
    enabled: !!equipmentId,
  });
}

/** 속성 생성 훅 */
export function useCreateProperty() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      equipmentId,
      data,
    }: {
      equipmentId: string;
      data: Parameters<typeof api.equipmentProperties.create>[1];
    }) => api.equipmentProperties.create(equipmentId, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["equipmentProperties", variables.equipmentId],
      });
      queryClient.invalidateQueries({ queryKey: ["equipment"] });
    },
  });
}

/** 속성 수정 훅 */
export function useUpdateProperty() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      equipmentId,
      propertyId,
      data,
    }: {
      equipmentId: string;
      propertyId: string;
      data: Partial<EquipmentProperty>;
    }) => api.equipmentProperties.update(equipmentId, propertyId, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["equipmentProperties", variables.equipmentId],
      });
      queryClient.invalidateQueries({ queryKey: ["equipment"] });
    },
  });
}

/** 속성 삭제 훅 */
export function useDeleteProperty() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      equipmentId,
      propertyId,
    }: {
      equipmentId: string;
      propertyId: string;
    }) => api.equipmentProperties.delete(equipmentId, propertyId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["equipmentProperties", variables.equipmentId],
      });
      queryClient.invalidateQueries({ queryKey: ["equipment"] });
    },
  });
}
