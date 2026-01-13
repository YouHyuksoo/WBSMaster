/**
 * @file src/components/providers/QueryProvider.tsx
 * @description
 * React Query Provider 컴포넌트입니다.
 * 클라이언트 컴포넌트에서 데이터 페칭을 관리합니다.
 *
 * 초보자 가이드:
 * 1. **QueryClient**: React Query 설정
 * 2. **staleTime**: 데이터가 신선한 것으로 간주되는 시간
 * 3. **retry**: 실패 시 재시도 횟수
 *
 * 수정 방법:
 * - staleTime 변경: 캐시 유지 시간 조정
 * - retry 변경: 재시도 횟수 조정
 */

"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";

interface QueryProviderProps {
  children: ReactNode;
}

/**
 * React Query Provider
 */
export function QueryProvider({ children }: QueryProviderProps) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // 5분 동안 데이터를 신선한 것으로 간주
            staleTime: 5 * 60 * 1000,
            // 실패 시 3번 재시도
            retry: 3,
            // 윈도우 포커스 시 자동 리페치 비활성화
            refetchOnWindowFocus: false,
            // 컴포넌트 마운트 시 자동 리페치 비활성화 (캐시된 데이터 우선)
            refetchOnMount: false,
            // 다른 탭에서 돌아왔을 때도 리페치 비활성화
            refetchOnReconnect: false,
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}
