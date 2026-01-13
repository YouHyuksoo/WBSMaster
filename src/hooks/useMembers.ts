/**
 * @file src/hooks/useMembers.ts
 * @description
 * 팀 멤버 관련 React Query hooks입니다.
 * 멤버 목록 조회, 초대, 수정, 제거 기능을 제공합니다.
 *
 * 초보자 가이드:
 * 1. **useMembers**: 멤버 목록 조회
 * 2. **useMember**: 단일 멤버 조회
 * 3. **useInviteMember**: 멤버 초대
 * 4. **useUpdateMember**: 멤버 역할 수정
 * 5. **useRemoveMember**: 멤버 제거
 *
 * @example
 * const { data: members } = useMembers({ projectId: 'xxx' });
 * const invite = useInviteMember();
 * invite.mutate({ projectId: 'xxx', email: 'user@example.com', role: 'MEMBER' });
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, type TeamMember } from "@/lib/api";

/** 쿼리 키 */
export const memberKeys = {
  all: ["members"] as const,
  lists: () => [...memberKeys.all, "list"] as const,
  list: (filters?: Record<string, string>) => [...memberKeys.lists(), filters] as const,
  details: () => [...memberKeys.all, "detail"] as const,
  detail: (id: string) => [...memberKeys.details(), id] as const,
};

/**
 * 멤버 목록 조회 Hook
 */
export function useMembers(filters?: { projectId?: string; role?: string }) {
  return useQuery({
    queryKey: memberKeys.list(filters),
    queryFn: () => api.members.list(filters),
    enabled: !!filters?.projectId,
    staleTime: 1000 * 60 * 5, // 5분간 캐시
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: false,
  });
}

/**
 * 단일 멤버 조회 Hook
 */
export function useMember(id: string) {
  return useQuery({
    queryKey: memberKeys.detail(id),
    queryFn: () => api.members.get(id),
    enabled: !!id,
  });
}

/**
 * 멤버 초대 Hook
 * @param projectId - 프로젝트 ID
 * @param userId - 사용자 ID
 * @param role - 프로젝트 역할 (OWNER, MANAGER, MEMBER)
 * @param customRole - 커스텀 역할명 (예: PMO, 프로젝트 총괄 등)
 * @param department - 부서 (예: 개발팀, 기획팀 등)
 * @param position - 직급 (예: 사원, 대리, 과장 등)
 */
export function useInviteMember() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: {
      projectId: string;
      userId: string;
      role?: string;
      customRole?: string;
      department?: string;
      position?: string;
    }) => api.members.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: memberKeys.lists() });
    },
  });
}

/**
 * 멤버 정보 수정 Hook
 * @param role - 프로젝트 역할 (OWNER, MANAGER, MEMBER)
 * @param customRole - 커스텀 역할명 (예: PMO, 프로젝트 총괄 등)
 * @param department - 부서 (예: 개발팀, 기획팀 등)
 * @param position - 직급 (예: 사원, 대리, 과장 등)
 */
export function useUpdateMember() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: { role?: string; customRole?: string; department?: string; position?: string } }) =>
      api.members.update(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: memberKeys.lists() });
      queryClient.invalidateQueries({ queryKey: memberKeys.detail(variables.id) });
    },
  });
}

/**
 * 멤버 제거 Hook
 */
export function useRemoveMember() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => api.members.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: memberKeys.lists() });
    },
  });
}
