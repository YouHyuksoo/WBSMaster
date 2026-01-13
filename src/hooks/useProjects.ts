/**
 * @file src/hooks/useProjects.ts
 * @description
 * 프로젝트 관련 React Query hooks입니다.
 * 프로젝트 목록 조회, 생성, 수정, 삭제 기능을 제공합니다.
 *
 * 초보자 가이드:
 * 1. **useProjects**: 프로젝트 목록 조회
 * 2. **useProject**: 단일 프로젝트 조회
 * 3. **useCreateProject**: 프로젝트 생성
 * 4. **useUpdateProject**: 프로젝트 수정
 * 5. **useDeleteProject**: 프로젝트 삭제
 *
 * @example
 * const { data: projects, isLoading } = useProjects();
 * const createProject = useCreateProject();
 * createProject.mutate({ name: '새 프로젝트' });
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, type Project } from "@/lib/api";

/** 쿼리 키 */
export const projectKeys = {
  all: ["projects"] as const,
  lists: () => [...projectKeys.all, "list"] as const,
  list: (filters?: Record<string, string>) => [...projectKeys.lists(), filters] as const,
  details: () => [...projectKeys.all, "detail"] as const,
  detail: (id: string) => [...projectKeys.details(), id] as const,
};

/**
 * 프로젝트 목록 조회 Hook
 * staleTime: Infinity (프로젝트 생성/수정/삭제 시에만 invalidate)
 * 페이지 이동 시에도 캐시된 데이터 사용 (새로 로딩하지 않음)
 */
export function useProjects(filters?: { status?: string; ownerId?: string }) {
  return useQuery({
    queryKey: projectKeys.list(filters),
    queryFn: () => api.projects.list(filters),
    staleTime: Infinity, // 무한 캐시 - invalidate 전까지 fresh 유지
    gcTime: Infinity, // 가비지 컬렉션 비활성화 - 메모리에 계속 유지
    refetchOnWindowFocus: false,
    refetchOnMount: false, // 마운트 시 refetch 안 함 (페이지 이동 시 로딩 방지)
    refetchOnReconnect: false,
  });
}

/**
 * 단일 프로젝트 조회 Hook
 */
export function useProject(id: string) {
  return useQuery({
    queryKey: projectKeys.detail(id),
    queryFn: () => api.projects.get(id),
    enabled: !!id,
  });
}

/**
 * 프로젝트 생성 Hook
 */
export function useCreateProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: { name: string; description?: string; startDate?: string; endDate?: string }) =>
      api.projects.create(data),
    onSuccess: () => {
      // 목록 캐시 무효화
      queryClient.invalidateQueries({ queryKey: projectKeys.lists() });
    },
  });
}

/**
 * 프로젝트 수정 Hook
 */
export function useUpdateProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Project> }) =>
      api.projects.update(id, data),
    onSuccess: (_, variables) => {
      // 목록 및 상세 캐시 무효화
      queryClient.invalidateQueries({ queryKey: projectKeys.lists() });
      queryClient.invalidateQueries({ queryKey: projectKeys.detail(variables.id) });
    },
  });
}

/**
 * 프로젝트 삭제 Hook
 */
export function useDeleteProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => api.projects.delete(id),
    onSuccess: () => {
      // 목록 캐시 무효화
      queryClient.invalidateQueries({ queryKey: projectKeys.lists() });
    },
  });
}
