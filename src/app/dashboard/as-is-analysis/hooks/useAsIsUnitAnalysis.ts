/**
 * @file src/app/dashboard/as-is-analysis/hooks/useAsIsUnitAnalysis.ts
 * @description
 * AS-IS 단위업무 분석(UnitAnalysis) 데이터를 관리하는 React Query 훅입니다.
 *
 * 초보자 가이드:
 * 1. **useAsIsUnitAnalysis**: 단위업무 분석 데이터 조회 + CRUD
 * 2. **다이어그램 저장**: flowChartData, swimlaneData 저장 기능
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/contexts/ToastContext";
import type {
  AsIsUnitAnalysis,
  FlowChartData,
  SwimlaneData,
  CreateAsIsUnitAnalysisRequest,
} from "../types";

// ============================================
// API 함수
// ============================================

/** 단위업무 분석 조회 */
async function fetchUnitAnalysis(overviewItemId: string): Promise<AsIsUnitAnalysis | null> {
  const res = await fetch(`/api/as-is-analysis/unit-analysis?overviewItemId=${overviewItemId}`);
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || "조회 실패");
  }
  return res.json();
}

/** 단위업무 분석 생성 */
async function createUnitAnalysis(data: CreateAsIsUnitAnalysisRequest): Promise<AsIsUnitAnalysis> {
  const res = await fetch("/api/as-is-analysis/unit-analysis", {
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

/** 단위업무 분석 수정 (다이어그램 저장) */
async function updateUnitAnalysis(
  id: string,
  data: {
    flowChartData?: FlowChartData;
    swimlaneData?: SwimlaneData;
  }
): Promise<AsIsUnitAnalysis> {
  const res = await fetch(`/api/as-is-analysis/unit-analysis/${id}`, {
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

/** 단위업무 분석 삭제 */
async function deleteUnitAnalysis(id: string): Promise<void> {
  const res = await fetch(`/api/as-is-analysis/unit-analysis/${id}`, {
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
 * AS-IS 단위업무 분석 훅
 * @param overviewItemId 총괄 항목 ID
 */
export function useAsIsUnitAnalysis(overviewItemId?: string) {
  const queryClient = useQueryClient();
  const toast = useToast();
  const queryKey = ["as-is-unit-analysis", overviewItemId];

  // 단위업무 분석 조회
  const {
    data: unitAnalysis,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey,
    queryFn: () => fetchUnitAnalysis(overviewItemId!),
    enabled: !!overviewItemId,
  });

  // 생성 뮤테이션
  const createMutation = useMutation({
    mutationFn: createUnitAnalysis,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });

  // 수정 뮤테이션 (다이어그램 저장 포함)
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: { flowChartData?: FlowChartData; swimlaneData?: SwimlaneData } }) => {
      console.log("[useAsIsUnitAnalysis] 저장 요청 시작:", { id, data });
      return updateUnitAnalysis(id, data);
    },
    onSuccess: (result) => {
      console.log("[useAsIsUnitAnalysis] 저장 성공:", result);
      queryClient.invalidateQueries({ queryKey });
      toast.success("다이어그램이 저장되었습니다.");
    },
    onError: (error) => {
      console.error("[useAsIsUnitAnalysis] 저장 실패:", error);
      toast.error(`저장 실패: ${error.message}`);
    },
  });

  // 삭제 뮤테이션
  const deleteMutation = useMutation({
    mutationFn: deleteUnitAnalysis,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });

  // Flow Chart 저장 헬퍼
  const saveFlowChart = (flowChartData: FlowChartData) => {
    console.log("[useAsIsUnitAnalysis] saveFlowChart 호출:", { unitAnalysisId: unitAnalysis?.id, flowChartData });
    if (!unitAnalysis?.id) {
      console.error("[useAsIsUnitAnalysis] unitAnalysis.id가 없어서 저장 불가");
      toast.error("저장할 수 없습니다. 단위업무 분석 데이터가 없습니다.");
      return;
    }
    updateMutation.mutate({ id: unitAnalysis.id, data: { flowChartData } });
  };

  // Swimlane 저장 헬퍼
  const saveSwimlane = (swimlaneData: SwimlaneData) => {
    console.log("[useAsIsUnitAnalysis] saveSwimlane 호출:", { unitAnalysisId: unitAnalysis?.id, swimlaneData });
    if (!unitAnalysis?.id) {
      console.error("[useAsIsUnitAnalysis] unitAnalysis.id가 없어서 저장 불가");
      toast.error("저장할 수 없습니다. 단위업무 분석 데이터가 없습니다.");
      return;
    }
    updateMutation.mutate({ id: unitAnalysis.id, data: { swimlaneData } });
  };

  return {
    // 데이터
    unitAnalysis,
    isLoading,
    error,
    refetch,

    // CRUD
    create: createMutation.mutate,
    isCreating: createMutation.isPending,
    update: updateMutation.mutate,
    isUpdating: updateMutation.isPending,
    delete: deleteMutation.mutate,
    isDeleting: deleteMutation.isPending,

    // 다이어그램 저장 헬퍼
    saveFlowChart,
    saveSwimlane,
    isSaving: updateMutation.isPending,
  };
}
