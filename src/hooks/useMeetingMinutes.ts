/**
 * @file src/hooks/useMeetingMinutes.ts
 * @description
 * 회의록 관리 React Query hooks입니다.
 *
 * 초보자 가이드:
 * 1. **useMeetingMinutes**: 프로젝트별 회의록 목록 (projectId 가 있을 때만 조회)
 * 2. **useCreateMeetingMinute**: 생성 (문서번호는 서버가 부여)
 * 3. **useUpdateMeetingMinute**: 수정 (items 를 보내면 내용 항목 전체 교체)
 * 4. **useDeleteMeetingMinute**: 삭제
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, type MeetingMinuteInput } from "@/lib/api";

/** 쿼리 키 */
export const meetingMinuteKeys = {
  all: ["meetingMinutes"] as const,
  lists: () => [...meetingMinuteKeys.all, "list"] as const,
  list: (filters: { projectId?: string; search?: string }) => [...meetingMinuteKeys.lists(), filters] as const,
};

/** 회의록 목록 조회 */
export function useMeetingMinutes(filters: { projectId?: string; search?: string }) {
  return useQuery({
    queryKey: meetingMinuteKeys.list(filters),
    queryFn: () => api.meetingMinutes.list({ projectId: filters.projectId!, search: filters.search }),
    enabled: !!filters.projectId,
  });
}

/** 회의록 생성 */
export function useCreateMeetingMinute() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: MeetingMinuteInput & { projectId: string; title: string; meetingDate: string }) =>
      api.meetingMinutes.create(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: meetingMinuteKeys.lists() }),
  });
}

/** 회의록 수정 */
export function useUpdateMeetingMinute() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: MeetingMinuteInput }) => api.meetingMinutes.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: meetingMinuteKeys.lists() }),
  });
}

/** 회의록 양식 엑셀 가져오기 (시트마다 회의록 등록) */
export function useImportMeetingMinutes() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ projectId, files, mode = "auto" }: { projectId: string; files: File[]; mode?: "auto" | "ai" }) => {
      const form = new FormData();
      form.append("projectId", projectId);
      form.append("mode", mode); // auto: 양식 → 실패 시트만 AI, ai: 모든 시트 AI
      files.forEach((file) => form.append("file", file));
      return api.meetingMinutes.import(form);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: meetingMinuteKeys.lists() }),
  });
}

/** 회의록 삭제 */
export function useDeleteMeetingMinute() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.meetingMinutes.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: meetingMinuteKeys.lists() }),
  });
}
