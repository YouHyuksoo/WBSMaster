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

import { useQuery, useMutation } from "@tanstack/react-query";
import { api, EquipmentConnection } from "@/lib/api";

/** 연결 목록 조회 훅 */
export function useEquipmentConnections(params?: { projectId?: string }) {
  return useQuery({
    queryKey: ["equipmentConnections", params],
    queryFn: () => api.equipmentConnections.list(params),
    enabled: !!params?.projectId,
    // 불필요한 refetch 방지
    staleTime: 1000 * 60 * 5, // 5분간 데이터를 fresh로 유지
    refetchOnWindowFocus: false, // 윈도우 포커스 시 refetch 안 함
    refetchOnMount: false, // 컴포넌트 마운트 시 refetch 안 함
    refetchOnReconnect: false, // 네트워크 재연결 시 refetch 안 함
  });
}

/** 연결 생성 훅 */
export function useCreateConnection() {
  // 캔버스에서 낙관적 업데이트로 처리하므로 invalidate 불필요
  return useMutation({
    mutationFn: (data: Parameters<typeof api.equipmentConnections.create>[0]) =>
      api.equipmentConnections.create(data),
    // onSuccess: 캔버스에서 이미 로컬 상태를 관리하므로 refetch 안 함
  });
}

/** 연결 수정 훅 */
export function useUpdateConnection() {
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<EquipmentConnection> }) =>
      api.equipmentConnections.update(id, data),
    // onSuccess: 캔버스에서 이미 로컬 상태를 관리하므로 refetch 안 함
  });
}

/** 연결 삭제 훅 */
export function useDeleteConnection() {
  return useMutation({
    mutationFn: (id: string) => api.equipmentConnections.delete(id),
    // onSuccess: 캔버스에서 이미 로컬 상태를 관리하므로 refetch 안 함
  });
}
