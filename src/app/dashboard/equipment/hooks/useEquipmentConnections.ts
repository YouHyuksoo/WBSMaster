/**
 * @file src/app/dashboard/equipment/hooks/useEquipmentConnections.ts
 * @description
 * 설비 연결 React Query 훅
 * 설비 간 연결 관리 기능을 제공합니다.
 *
 * 초보자 가이드:
 * 1. **useEquipmentConnections**: 연결 목록 조회 (React Query)
 * 2. **useCreateConnection**: 연결 생성 (Mutation)
 * 3. **useUpdateConnection**: 연결 수정 (Mutation)
 * 4. **useDeleteConnection**: 연결 삭제 (Mutation)
 *
 * @example
 * const { data: connections } = useEquipmentConnections({ projectId: "xxx" });
 * const createConnection = useCreateConnection();
 * createConnection.mutate({
 *   fromEquipmentId: "eq1",
 *   toEquipmentId: "eq2",
 *   type: "FLOW",
 * });
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, EquipmentConnection } from "@/lib/api";

/** 연결 목록 조회 훅 */
export function useEquipmentConnections(params?: { projectId?: string }) {
  return useQuery({
    queryKey: ["equipmentConnections", params],
    queryFn: () => api.equipmentConnections.list(params),
    enabled: !!params?.projectId,
  });
}

/** 연결 생성 훅 */
export function useCreateConnection() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Parameters<typeof api.equipmentConnections.create>[0]) =>
      api.equipmentConnections.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["equipmentConnections"] });
      queryClient.invalidateQueries({ queryKey: ["equipment"] });
    },
  });
}

/** 연결 수정 훅 */
export function useUpdateConnection() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<EquipmentConnection> }) =>
      api.equipmentConnections.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["equipmentConnections"] });
      queryClient.invalidateQueries({ queryKey: ["equipment"] });
    },
  });
}

/** 연결 삭제 훅 */
export function useDeleteConnection() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => api.equipmentConnections.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["equipmentConnections"] });
      queryClient.invalidateQueries({ queryKey: ["equipment"] });
    },
  });
}
