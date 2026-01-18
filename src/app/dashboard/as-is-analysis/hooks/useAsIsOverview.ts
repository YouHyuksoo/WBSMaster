/**
 * @file src/app/dashboard/as-is-analysis/hooks/useAsIsOverview.ts
 * @description
 * AS-IS 총괄(Overview) 데이터를 관리하는 React Query 훅입니다.
 *
 * 초보자 가이드:
 * 1. **useAsIsOverview**: 총괄 데이터 조회 + CRUD 뮤테이션 제공
 * 2. **useAsIsOverviewItems**: 항목 CRUD 뮤테이션 제공
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { AsIsOverview, AsIsOverviewItem, CreateAsIsOverviewRequest, CreateAsIsOverviewItemRequest } from "../types";

// ============================================
// API 함수
// ============================================

/** AS-IS 총괄 조회 (프로젝트+사업부별) */
async function fetchOverview(projectId: string, businessUnit: string): Promise<AsIsOverview | null> {
  const res = await fetch(`/api/as-is-analysis/overview?projectId=${projectId}&businessUnit=${businessUnit}`);
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || "조회 실패");
  }
  return res.json();
}

/** AS-IS 총괄 생성 */
async function createOverview(data: CreateAsIsOverviewRequest): Promise<AsIsOverview> {
  const res = await fetch("/api/as-is-analysis/overview", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || "생성 실패");
  }
  return res.json();
}

/** AS-IS 총괄 수정 */
async function updateOverview(
  id: string,
  data: Partial<Pick<AsIsOverview, "customerName" | "author" | "createdDate">>
): Promise<AsIsOverview> {
  const res = await fetch(`/api/as-is-analysis/overview/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || "수정 실패");
  }
  return res.json();
}

/** AS-IS 총괄 삭제 */
async function deleteOverview(id: string): Promise<void> {
  const res = await fetch(`/api/as-is-analysis/overview/${id}`, {
    method: "DELETE",
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || "삭제 실패");
  }
}

/** AS-IS 항목 생성 */
async function createItem(data: CreateAsIsOverviewItemRequest): Promise<AsIsOverviewItem> {
  const res = await fetch("/api/as-is-analysis/items", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || "생성 실패");
  }
  return res.json();
}

/** AS-IS 항목 수정 */
async function updateItem(
  id: string,
  data: Partial<AsIsOverviewItem>
): Promise<AsIsOverviewItem> {
  const res = await fetch(`/api/as-is-analysis/items/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || "수정 실패");
  }
  return res.json();
}

/** AS-IS 항목 삭제 */
async function deleteItem(id: string): Promise<void> {
  const res = await fetch(`/api/as-is-analysis/items/${id}`, {
    method: "DELETE",
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || "삭제 실패");
  }
}

// ============================================
// React Query 훅
// ============================================

/**
 * AS-IS 총괄 훅
 * @param projectId 프로젝트 ID
 * @param businessUnit 사업부 코드 (기본값: V_IVI)
 */
export function useAsIsOverview(projectId?: string, businessUnit: string = "V_IVI") {
  const queryClient = useQueryClient();
  const queryKey = ["as-is-overview", projectId, businessUnit];

  // 총괄 조회
  const {
    data: overview,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey,
    queryFn: () => fetchOverview(projectId!, businessUnit),
    enabled: !!projectId,
  });

  // 총괄 생성 뮤테이션
  const createOverviewMutation = useMutation({
    mutationFn: createOverview,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });

  // 총괄 수정 뮤테이션
  const updateOverviewMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Pick<AsIsOverview, "customerName" | "author" | "createdDate">> }) =>
      updateOverview(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });

  // 총괄 삭제 뮤테이션
  const deleteOverviewMutation = useMutation({
    mutationFn: deleteOverview,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });

  // 항목 생성 뮤테이션
  const createItemMutation = useMutation({
    mutationFn: createItem,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });

  // 항목 수정 뮤테이션
  const updateItemMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<AsIsOverviewItem> }) =>
      updateItem(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });

  // 항목 삭제 뮤테이션
  const deleteItemMutation = useMutation({
    mutationFn: deleteItem,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });

  return {
    // 데이터
    overview,
    isLoading,
    error,
    refetch,

    // 총괄 CRUD
    createOverview: createOverviewMutation.mutate,
    isCreating: createOverviewMutation.isPending,
    updateOverview: updateOverviewMutation.mutate,
    isUpdating: updateOverviewMutation.isPending,
    deleteOverview: deleteOverviewMutation.mutate,
    isDeleting: deleteOverviewMutation.isPending,

    // 항목 CRUD
    createItem: createItemMutation.mutate,
    isCreatingItem: createItemMutation.isPending,
    updateItem: updateItemMutation.mutate,
    isUpdatingItem: updateItemMutation.isPending,
    deleteItem: deleteItemMutation.mutate,
    isDeletingItem: deleteItemMutation.isPending,
  };
}
