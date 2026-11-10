/**
 * @file src/hooks/useToBe.ts
 * @description TO-BE 설계 React Query 훅: 조회 · 추가 · 수정 · 삭제 · AS-IS 에서 초안 만들기.
 *
 * 초보자 가이드:
 * - useToBe(projectId): 총괄 + 업무 + 연결 후보(AS-IS 업무, SFR)를 한 번에 받는다
 * - 변경 훅은 성공하면 toBeKeys.all 을 무효화해 목록을 다시 받는다
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, type ToBeDesignInput, type ToBeItemInput } from "@/lib/api";

export const toBeKeys = {
  all: ["to-be"] as const,
  detail: (projectId: string) => [...toBeKeys.all, projectId] as const,
  design: (id: string) => [...toBeKeys.all, "design", id] as const,
};

export function useToBe(projectId: string | null | undefined) {
  return useQuery({ queryKey: toBeKeys.detail(projectId ?? ""), queryFn: () => api.toBe.get(projectId!), enabled: !!projectId });
}

function useInvalidate() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: toBeKeys.all });
}

export function useCreateToBeItem() {
  const invalidate = useInvalidate();
  return useMutation({ mutationFn: ({ projectId, data }: { projectId: string; data: ToBeItemInput }) => api.toBe.create(projectId, data), onSuccess: invalidate });
}

export function useUpdateToBeItem() {
  const invalidate = useInvalidate();
  return useMutation({ mutationFn: ({ id, data }: { id: string; data: ToBeItemInput }) => api.toBe.update(id, data), onSuccess: invalidate });
}

export function useDeleteToBeItem() {
  const invalidate = useInvalidate();
  return useMutation({ mutationFn: (id: string) => api.toBe.delete(id), onSuccess: invalidate });
}

export function useDraftToBeFromAsIs() {
  const invalidate = useInvalidate();
  return useMutation({ mutationFn: (projectId: string) => api.toBe.draftFromAsIs(projectId), onSuccess: invalidate });
}

/** 단위업무 설계 (2단계) */
export function useToBeDesign(id: string | null | undefined) {
  return useQuery({ queryKey: toBeKeys.design(id ?? ""), queryFn: () => api.toBe.design(id!), enabled: !!id });
}

/** 단위업무 설계 저장: 보낸 부분만 교체, 응답(설계 전체)으로 캐시를 바로 바꾼다 */
export function useSaveToBeDesign(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: ToBeDesignInput) => api.toBe.saveDesign(id, data),
    onSuccess: (design) => {
      queryClient.setQueryData(toBeKeys.design(id), design);
      queryClient.invalidateQueries({ queryKey: [...toBeKeys.all], predicate: (q) => q.queryKey[1] !== "design" });
    },
  });
}
