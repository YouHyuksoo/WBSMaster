/**
 * @file src/hooks/useVoiceIntake.ts
 * @description
 * 음성 공통 파이프라인 작업 상태 Hook 입니다 (끝날 때까지 3초마다 다시 묻는다).
 *
 * 초보자 가이드:
 * - 작업 시작은 api.voiceIntake.start(진행률 콜백 때문에 mutation 대신 직접 부른다).
 * - stage 가 done · error 가 되면 더 묻지 않는다. 서버 재시작 등으로 404 면 error 로 끝난다(retry 없음).
 */

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

export const voiceIntakeKeys = {
  all: ["voice-intake"] as const,
  job: (jobId: string | null) => [...voiceIntakeKeys.all, jobId] as const,
};

export function useVoiceIntakeJob(jobId: string | null) {
  return useQuery({
    queryKey: voiceIntakeKeys.job(jobId),
    queryFn: () => api.voiceIntake.status(jobId!),
    enabled: !!jobId,
    refetchInterval: (query) => {
      const stage = query.state.data?.stage;
      return stage === "done" || stage === "error" ? false : 3000;
    },
    retry: false,
  });
}
