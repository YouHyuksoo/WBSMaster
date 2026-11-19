/**
 * @file src/lib/query-refresh.ts
 * @description
 * 화면 훅(React Query mutation)을 거치지 않고 서버에서 데이터가 바뀐 뒤, 화면 캐시를 새로 고칩니다.
 *
 * 초보자 가이드:
 * - 이 앱의 조회 캐시는 5분 동안 신선하다고 보고, 화면에 다시 들어와도(refetchOnMount: false) 다시 받지 않는다.
 *   그래서 AI 어시스턴트 등록 · 엑셀 가져오기 · 직접 fetch 수정처럼 mutation 훅 밖에서 바꾸면
 *   새로고침 전까지 예전 목록이 보인다 (2026-11-19 일정 관리 달력 사례).
 * - 지금 화면에 떠 있는 조회는 바로 다시 받고, 떠 있지 않은 조회는 캐시에서 지워 다음에 열 때 새로 받게 한다.
 *   (invalidate 만 하면 refetchOnMount: false 때문에 다음에 열어도 다시 받지 않는다)
 * - 직접 fetch 로 POST · PATCH · PUT · DELETE 하는 화면 코드는 이 함수를 부른다. src/lib/query-refresh.test.ts 가 검사한다.
 */

import type { QueryClient } from "@tanstack/react-query";

export async function refreshAfterServerWrite(queryClient: QueryClient): Promise<void> {
  queryClient.removeQueries({ type: "inactive" });
  await queryClient.invalidateQueries({ refetchType: "active" });
}
