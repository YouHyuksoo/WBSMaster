/**
 * @file src/hooks/useCustomerRequirements.ts
 * @description
 * 고객요구사항 관련 React Query hooks입니다.
 * 고객요구사항 목록 조회, 생성, 수정, 삭제 및 엑셀 임포트 기능을 제공합니다.
 *
 * 초보자 가이드:
 * 1. **useCustomerRequirements**: 고객요구사항 목록 조회 (필터링 지원)
 * 2. **useCustomerRequirement**: 단일 고객요구사항 조회
 * 3. **useCreateCustomerRequirement**: 고객요구사항 생성 (관리번호 자동 부여)
 * 4. **useUpdateCustomerRequirement**: 고객요구사항 수정
 * 5. **useDeleteCustomerRequirement**: 고객요구사항 삭제
 * 6. **useImportCustomerRequirements**: 엑셀 파일 임포트
 *
 * @example
 * const { data: requirements } = useCustomerRequirements({ projectId: 'xxx' });
 * const createReq = useCreateCustomerRequirement();
 * createReq.mutate({ projectId: 'xxx', businessUnit: 'IT', functionName: '기능', content: '내용' });
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, type CustomerRequirement, type ApplyStatus } from "@/lib/api";

/** 쿼리 키 */
export const customerRequirementKeys = {
  all: ["customer-requirements"] as const,
  lists: () => [...customerRequirementKeys.all, "list"] as const,
  list: (filters?: Record<string, string | undefined>) =>
    [...customerRequirementKeys.lists(), filters] as const,
  details: () => [...customerRequirementKeys.all, "detail"] as const,
  detail: (id: string) => [...customerRequirementKeys.details(), id] as const,
};

/**
 * 고객요구사항 목록 조회 Hook
 * @param filters - 필터 옵션 (projectId, businessUnit, applyStatus, search)
 */
export function useCustomerRequirements(filters?: {
  projectId?: string;
  businessUnit?: string;
  applyStatus?: string;
  search?: string;
}) {
  return useQuery({
    queryKey: customerRequirementKeys.list(filters),
    queryFn: () => api.customerRequirements.list(filters),
  });
}

/**
 * 단일 고객요구사항 조회 Hook
 * @param id - 고객요구사항 ID
 */
export function useCustomerRequirement(id: string) {
  return useQuery({
    queryKey: customerRequirementKeys.detail(id),
    queryFn: () => api.customerRequirements.get(id),
    enabled: !!id,
  });
}

/**
 * 고객요구사항 생성 Hook
 * 관리번호(code)는 자동으로 부여됩니다 (RQIT_00001 형식)
 */
export function useCreateCustomerRequirement() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: {
      projectId: string;
      businessUnit: string;
      category?: string;
      functionName: string;
      content: string;
      requestDate?: string;
      requester?: string;
      solution?: string;
      applyStatus?: ApplyStatus;
      remarks?: string;
      toBeCode?: string;
    }) => api.customerRequirements.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: customerRequirementKeys.lists() });
    },
  });
}

/**
 * 고객요구사항 수정 Hook
 */
export function useUpdateCustomerRequirement() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CustomerRequirement> }) =>
      api.customerRequirements.update(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: customerRequirementKeys.lists() });
      queryClient.invalidateQueries({
        queryKey: customerRequirementKeys.detail(variables.id),
      });
    },
  });
}

/**
 * 고객요구사항 삭제 Hook
 */
export function useDeleteCustomerRequirement() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => api.customerRequirements.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: customerRequirementKeys.lists() });
    },
  });
}

/**
 * 고객요구사항 엑셀 임포트 Hook
 * FormData에 file, projectId, clearExisting 포함
 */
export function useImportCustomerRequirements() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (formData: FormData) => api.customerRequirements.import(formData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: customerRequirementKeys.lists() });
    },
  });
}
