/**
 * @file src/app/dashboard/users/hooks/useBulkInviteMembers.ts
 * @description 여러 사용자를 한 프로젝트에 일괄 멤버로 추가
 *
 * 초보자 가이드:
 * 1. **결과**: { added, skipped, failed, errors }
 *    - added: 성공적으로 추가된 인원 수
 *    - skipped: 이미 멤버인 경우 (서버 400 "이미 프로젝트에...")
 *    - failed: 그 외 에러
 * 2. **순차 처리**: Promise.all 대신 for-of로 순차 호출 (서버 부하 분산)
 * 3. **캐시 무효화**: members + projects 둘 다 (참여 N개 갱신용)
 */
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { memberKeys } from "@/hooks/useMembers";

interface BulkResult {
  added: number;
  skipped: number;
  failed: number;
  errors: string[];
}

export function useBulkInviteMembers() {
  const queryClient = useQueryClient();

  return useMutation<BulkResult, Error, { projectId: string; userIds: string[]; role?: string }>({
    mutationFn: async ({ projectId, userIds, role }) => {
      const result: BulkResult = { added: 0, skipped: 0, failed: 0, errors: [] };

      for (const userId of userIds) {
        try {
          await api.members.create({ projectId, userId, role: role || "MEMBER" });
          result.added++;
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          if (msg.includes("이미 프로젝트")) {
            result.skipped++;
          } else {
            result.failed++;
            result.errors.push(msg);
          }
        }
      }
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: memberKeys.lists() });
      queryClient.invalidateQueries({ queryKey: ["projects"] });
    },
  });
}
