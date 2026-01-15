/**
 * @file src/hooks/useFieldIssues.ts
 * @description
 * 현업이슈 관련 React Query hooks입니다.
 * 현업이슈 목록 조회, 생성, 수정, 삭제 및 엑셀 임포트 기능을 제공합니다.
 *
 * 초보자 가이드:
 * 1. **useFieldIssues**: 현업이슈 목록 조회 (필터링 지원)
 * 2. **useFieldIssue**: 단일 현업이슈 조회
 * 3. **useCreateFieldIssue**: 현업이슈 생성 (이슈번호 자동 부여)
 * 4. **useUpdateFieldIssue**: 현업이슈 수정
 * 5. **useDeleteFieldIssue**: 현업이슈 삭제
 * 6. **useImportFieldIssues**: 엑셀 파일 임포트
 *
 * @example
 * const { data: issues } = useFieldIssues({ projectId: 'xxx' });
 * const createIssue = useCreateFieldIssue();
 * createIssue.mutate({ projectId: 'xxx', businessUnit: 'V_IVI', title: '이슈명' });
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, type FieldIssue, type FieldIssueStatus } from "@/lib/api";

/** 쿼리 키 */
export const fieldIssueKeys = {
  all: ["field-issues"] as const,
  lists: () => [...fieldIssueKeys.all, "list"] as const,
  list: (filters?: Record<string, string | undefined>) =>
    [...fieldIssueKeys.lists(), filters] as const,
  details: () => [...fieldIssueKeys.all, "detail"] as const,
  detail: (id: string) => [...fieldIssueKeys.details(), id] as const,
};

/**
 * 현업이슈 목록 조회 Hook
 * @param filters - 필터 옵션 (projectId, businessUnit, status, search)
 * staleTime: 5분 (자주 변경되지 않으므로 캐싱)
 */
export function useFieldIssues(filters?: {
  projectId?: string;
  businessUnit?: string;
  status?: string;
  search?: string;
}) {
  return useQuery({
    queryKey: fieldIssueKeys.list(filters),
    queryFn: () => api.fieldIssues.list(filters),
    enabled: !!filters?.projectId, // projectId가 있을 때만 조회
    staleTime: 1000 * 60 * 5, // 5분간 fresh 상태 유지
  });
}

/**
 * 단일 현업이슈 조회 Hook
 * @param id - 현업이슈 ID
 */
export function useFieldIssue(id: string) {
  return useQuery({
    queryKey: fieldIssueKeys.detail(id),
    queryFn: () => api.fieldIssues.get(id),
    enabled: !!id,
  });
}

/**
 * 현업이슈 생성 Hook
 * 이슈번호(code)는 자동으로 부여됩니다 (IS0001 형식)
 */
export function useCreateFieldIssue() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: {
      projectId: string;
      businessUnit: string;
      category?: string;
      title: string;
      description?: string;
      registeredDate?: string;
      issuer?: string;
      requirementCode?: string;
      assignee?: string;
      status?: FieldIssueStatus;
      targetDate?: string;
      completedDate?: string;
      proposedSolution?: string;
      finalSolution?: string;
      remarks?: string;
    }) => api.fieldIssues.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: fieldIssueKeys.lists() });
    },
  });
}

/**
 * 현업이슈 수정 Hook
 */
export function useUpdateFieldIssue() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<FieldIssue> }) =>
      api.fieldIssues.update(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: fieldIssueKeys.lists() });
      queryClient.invalidateQueries({
        queryKey: fieldIssueKeys.detail(variables.id),
      });
    },
  });
}

/**
 * 현업이슈 삭제 Hook
 */
export function useDeleteFieldIssue() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => api.fieldIssues.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: fieldIssueKeys.lists() });
    },
  });
}

/**
 * 현업이슈 엑셀 임포트 Hook
 * FormData에 file, projectId, clearExisting 포함
 */
export function useImportFieldIssues() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (formData: FormData) => api.fieldIssues.import(formData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: fieldIssueKeys.lists() });
    },
  });
}
