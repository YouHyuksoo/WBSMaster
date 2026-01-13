/**
 * @file src/hooks/useDocuments.ts
 * @description
 * 문서함 관련 React Query 훅입니다.
 * 공용문서함과 개인문서함을 모두 지원합니다.
 *
 * 초보자 가이드:
 * 1. **useDocuments**: 문서 목록 조회 (isPersonal로 공용/개인 구분)
 * 2. **useDocument**: 문서 단건 조회
 * 3. **useCreateDocument**: 문서 생성
 * 4. **useUpdateDocument**: 문서 수정
 * 5. **useDeleteDocument**: 문서 삭제
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, Document, DocumentCategory, DocumentSourceType } from "@/lib/api";

/** 쿼리 키 */
export const documentKeys = {
  all: ["documents"] as const,
  lists: () => [...documentKeys.all, "list"] as const,
  list: (filters?: Record<string, string | boolean | undefined>) =>
    [...documentKeys.lists(), filters] as const,
  details: () => [...documentKeys.all, "detail"] as const,
  detail: (id: string) => [...documentKeys.details(), id] as const,
};

/** 문서 목록 조회 훅 */
export function useDocuments(filters?: {
  projectId?: string;
  category?: string;
  sourceType?: string;
  search?: string;
  favoriteOnly?: string;
  isPersonal?: boolean;
}) {
  // isPersonal을 string으로 변환
  const apiFilters = filters
    ? {
        ...filters,
        isPersonal: filters.isPersonal ? "true" : "false",
      }
    : undefined;

  return useQuery({
    queryKey: documentKeys.list(filters),
    queryFn: () => api.documents.list(apiFilters),
    enabled: !!filters?.projectId,
    staleTime: 1000 * 60 * 5, // 5분간 캐시
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: false,
  });
}

/** 문서 단건 조회 훅 */
export function useDocument(id: string) {
  return useQuery({
    queryKey: documentKeys.detail(id),
    queryFn: () => api.documents.get(id),
    enabled: !!id,
  });
}

/** 문서 생성 훅 */
export function useCreateDocument() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: {
      projectId: string;
      name: string;
      description?: string;
      category: DocumentCategory;
      version?: string;
      sourceType: DocumentSourceType;
      url?: string;
      filePath?: string;
      fileName?: string;
      fileSize?: number;
      mimeType?: string;
      tags?: string[];
      isPersonal?: boolean;
    }) => api.documents.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: documentKeys.lists() });
    },
  });
}

/** 문서 수정 훅 */
export function useUpdateDocument() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Document> }) =>
      api.documents.update(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: documentKeys.lists() });
      queryClient.invalidateQueries({
        queryKey: documentKeys.detail(variables.id),
      });
    },
  });
}

/** 문서 삭제 훅 */
export function useDeleteDocument() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => api.documents.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: documentKeys.lists() });
    },
  });
}

/** 즐겨찾기 토글 훅 */
export function useToggleFavorite() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, isFavorite }: { id: string; isFavorite: boolean }) =>
      api.documents.update(id, { isFavorite }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: documentKeys.lists() });
    },
  });
}
