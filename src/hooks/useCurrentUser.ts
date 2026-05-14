/**
 * @file src/hooks/useCurrentUser.ts
 * @description 현재 로그인한 사용자 정보 조회 훅
 *
 * 초보자 가이드:
 * 1. **session API**: /api/auth/me에서 받아옴
 * 2. **권한 체크**: user.role === "ADMIN" 판정에 사용
 * 3. **캐시**: staleTime Infinity — 로그인/로그아웃 시 invalidate 필요
 */
import { useQuery } from "@tanstack/react-query";

export interface CurrentUser {
  id: string;
  email: string;
  name: string | null;
  avatar: string | null;
  role: "ADMIN" | "USER" | "GUEST";
}

/** 쿼리 키 */
export const currentUserKeys = {
  all: ["currentUser"] as const,
};

/**
 * 현재 로그인한 사용자 조회 Hook
 */
export function useCurrentUser() {
  return useQuery<CurrentUser | null>({
    queryKey: currentUserKeys.all,
    queryFn: async () => {
      const res = await fetch("/api/auth/me", { credentials: "include" });
      if (!res.ok) return null;
      const data = await res.json();
      // /api/auth/me는 user 객체를 직접 반환
      return data ?? null;
    },
    staleTime: Infinity,
    gcTime: Infinity,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });
}
