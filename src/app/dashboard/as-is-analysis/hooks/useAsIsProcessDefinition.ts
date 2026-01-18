/**
 * @file src/app/dashboard/as-is-analysis/hooks/useAsIsProcessDefinition.ts
 * @description
 * AS-IS 프로세스 정의서 데이터를 관리하는 React Query 훅입니다.
 *
 * 초보자 가이드:
 * 1. **useAsIsProcessDefinition**: 프로세스 정의 CRUD 제공
 * 2. **unitAnalysisId**: 단위업무 분석 ID로 프로세스 정의 필터링
 */

import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { AsIsProcessDefinition } from "../types";

// ============================================
// 타입 정의
// ============================================

/** 프로세스 정의 생성 요청 */
export interface CreateProcessDefinitionRequest {
  unitAnalysisId: string;
  stepNumber?: number;
  processName: string;
  description?: string;
  input?: string;
  output?: string;
  relatedSystem?: string;
  remarks?: string;
}

/** 프로세스 정의 수정 요청 */
export interface UpdateProcessDefinitionRequest {
  stepNumber?: number;
  processName?: string;
  description?: string;
  input?: string;
  output?: string;
  relatedSystem?: string;
  remarks?: string;
  order?: number;
}

// ============================================
// API 함수
// ============================================

/** 프로세스 정의 생성 */
async function createProcessDefinition(
  data: CreateProcessDefinitionRequest
): Promise<AsIsProcessDefinition> {
  const res = await fetch("/api/as-is-analysis/process-definitions", {
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

/** 프로세스 정의 수정 */
async function updateProcessDefinition(
  id: string,
  data: UpdateProcessDefinitionRequest
): Promise<AsIsProcessDefinition> {
  const res = await fetch(`/api/as-is-analysis/process-definitions/${id}`, {
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

/** 프로세스 정의 삭제 */
async function deleteProcessDefinition(id: string): Promise<void> {
  const res = await fetch(`/api/as-is-analysis/process-definitions/${id}`, {
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
 * AS-IS 프로세스 정의 훅
 * @param unitAnalysisId 단위업무 분석 ID
 */
export function useAsIsProcessDefinition(unitAnalysisId?: string) {
  const queryClient = useQueryClient();

  // 캐시 무효화 (단위업무 분석 쿼리 갱신)
  const invalidateUnitAnalysis = () => {
    // unit-analysis 쿼리 무효화하여 processDefinitions 갱신
    queryClient.invalidateQueries({
      queryKey: ["as-is-unit-analysis"],
    });
  };

  // 생성 뮤테이션
  const createMutation = useMutation({
    mutationFn: createProcessDefinition,
    onSuccess: () => {
      invalidateUnitAnalysis();
    },
  });

  // 수정 뮤테이션
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateProcessDefinitionRequest }) =>
      updateProcessDefinition(id, data),
    onSuccess: () => {
      invalidateUnitAnalysis();
    },
  });

  // 삭제 뮤테이션
  const deleteMutation = useMutation({
    mutationFn: deleteProcessDefinition,
    onSuccess: () => {
      invalidateUnitAnalysis();
    },
  });

  return {
    // CRUD
    create: createMutation.mutate,
    isCreating: createMutation.isPending,
    update: updateMutation.mutate,
    isUpdating: updateMutation.isPending,
    delete: deleteMutation.mutate,
    isDeleting: deleteMutation.isPending,
  };
}
