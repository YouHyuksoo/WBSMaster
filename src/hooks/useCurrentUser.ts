/**
 * @file src/hooks/useCurrentUser.ts
 * @description
 * 현재 로그인한 사용자 정보를 조회하는 React Query hook입니다.
 *
 * @example
 * const { data: currentUser } = useCurrentUser();
 * if (currentUser) {
 *   console.log('현재 사용자:', currentUser.name);
 * }
 */

import { useQuery } from "@tanstack/react-query";

/** 현재 사용자 타입 */
export interface CurrentUser {
  id: string;
  email: string;
  name?: string | null;
  avatar?: string | null;
  role: string;
}

/** 쿼리 키 */
export const currentUserKeys = {
  all: ["currentUser"] as const,
};

/**
 * 현재 로그인한 사용자 조회 Hook
 */
export function useCurrentUser() {
  return useQuery({
    queryKey: currentUserKeys.all,
    queryFn: async (): Promise<CurrentUser | null> => {
      const response = await fetch("/api/auth/me");
      if (!response.ok) {
        if (response.status === 401) {
          return null; // 로그인 안됨
        }
        throw new Error("사용자 정보 조회 실패");
      }
      return response.json();
    },
    staleTime: 5 * 60 * 1000, // 5분간 캐시
    retry: false, // 실패 시 재시도 안함
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: false,
  });
}
