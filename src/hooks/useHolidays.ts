/**
 * @file src/hooks/useHolidays.ts
 * @description
 * 휴일 관련 React Query hooks입니다.
 * 휴일 목록 조회, 생성, 수정, 삭제 기능을 제공합니다.
 *
 * 초보자 가이드:
 * 1. **useHolidays**: 휴일 목록 조회
 * 2. **useHoliday**: 단일 휴일 조회
 * 3. **useCreateHoliday**: 휴일 생성
 * 4. **useUpdateHoliday**: 휴일 수정
 * 5. **useDeleteHoliday**: 휴일 삭제
 *
 * @example
 * const { data: holidays } = useHolidays({ year: '2026' });
 * const createHoliday = useCreateHoliday();
 * createHoliday.mutate({ name: '설날', date: '2026-01-28' });
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, type Holiday } from "@/lib/api";

/** 쿼리 키 */
export const holidayKeys = {
  all: ["holidays"] as const,
  lists: () => [...holidayKeys.all, "list"] as const,
  list: (filters?: Record<string, string>) => [...holidayKeys.lists(), filters] as const,
  details: () => [...holidayKeys.all, "detail"] as const,
  detail: (id: string) => [...holidayKeys.details(), id] as const,
};

/**
 * 휴일 목록 조회 Hook
 */
export function useHolidays(filters?: { year?: string; month?: string }) {
  return useQuery({
    queryKey: holidayKeys.list(filters),
    queryFn: () => api.holidays.list(filters),
  });
}

/**
 * 단일 휴일 조회 Hook
 */
export function useHoliday(id: string) {
  return useQuery({
    queryKey: holidayKeys.detail(id),
    queryFn: () => api.holidays.get(id),
    enabled: !!id,
  });
}

/**
 * 휴일 생성 Hook
 */
export function useCreateHoliday() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: {
      title: string;
      date: string;
      type: string;
      projectId: string;
    }) => api.holidays.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: holidayKeys.lists() });
    },
  });
}

/**
 * 휴일 수정 Hook
 */
export function useUpdateHoliday() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Holiday> }) =>
      api.holidays.update(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: holidayKeys.lists() });
      queryClient.invalidateQueries({ queryKey: holidayKeys.detail(variables.id) });
    },
  });
}

/**
 * 휴일 삭제 Hook
 */
export function useDeleteHoliday() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => api.holidays.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: holidayKeys.lists() });
    },
  });
}
