/**
 * @file src/hooks/useUsers.ts
 * @description
 * 사용자 관련 React Query hooks입니다.
 * 전체 등록 사용자 목록 조회, 생성, 수정, 삭제 기능을 제공합니다.
 *
 * 초보자 가이드:
 * 1. **useUsers**: 전체 사용자 목록 조회
 * 2. **useUser**: 단일 사용자 조회
 * 3. **useCreateUser**: 새 사용자 생성
 * 4. **useUpdateUser**: 사용자 정보 수정
 * 5. **useDeleteUser**: 사용자 삭제
 *
 * @example
 * const { data: users } = useUsers();
 * const { data: users } = useUsers({ search: '김' });
 * const updateUser = useUpdateUser();
 * updateUser.mutate({ id: 'xxx', data: { name: '새이름' } });
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, type User } from "@/lib/api";

/** 쿼리 키 */
export const userKeys = {
  all: ["users"] as const,
  lists: () => [...userKeys.all, "list"] as const,
  list: (filters?: Record<string, string>) => [...userKeys.lists(), filters] as const,
  details: () => [...userKeys.all, "detail"] as const,
  detail: (id: string) => [...userKeys.details(), id] as const,
};

/**
 * 전체 사용자 목록 조회 Hook
 * @param filters - 검색 필터 (search, email, name)
 */
export function useUsers(filters?: { search?: string; email?: string; name?: string }) {
  return useQuery({
    queryKey: userKeys.list(filters),
    queryFn: () => api.users.list(filters),
  });
}

/**
 * 단일 사용자 조회 Hook
 * @param id - 사용자 ID
 */
export function useUser(id: string) {
  return useQuery({
    queryKey: userKeys.detail(id),
    queryFn: () => api.users.get(id),
    enabled: !!id,
  });
}

/**
 * 사용자 생성 Hook
 */
export function useCreateUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: { id?: string; email: string; name?: string; avatar?: string }) =>
      api.users.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: userKeys.lists() });
    },
  });
}

/**
 * 사용자 정보 수정 Hook
 * @param email - 이메일 (로그인용)
 * @param name - 이름 (표시용)
 * @param role - 시스템 역할
 * @param avatar - 프로필 이미지 URL
 */
export function useUpdateUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: { email?: string; name?: string; role?: string; avatar?: string } }) =>
      api.users.update(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: userKeys.lists() });
      queryClient.invalidateQueries({ queryKey: userKeys.detail(variables.id) });
    },
  });
}

/**
 * 사용자 삭제 Hook
 */
export function useDeleteUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => api.users.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: userKeys.lists() });
    },
  });
}
