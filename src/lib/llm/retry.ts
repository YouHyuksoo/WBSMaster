/**
 * @file src/lib/llm/retry.ts
 * @description
 * LLM 호출이 호출 한도 초과(HTTP 429)로 실패하면 잠시 기다렸다 다시 시도합니다.
 * AI 채팅은 질문 하나에 LLM 을 2~3번 연달아 부르므로(테이블 선택 → SQL 생성 → 분석),
 * 초당 호출 한도가 낮은 요금제(예: Mistral 무료)에서 두 번째 호출이 429 로 실패했습니다.
 *
 * 초보자 가이드:
 * - isRateLimitError(e): SDK(statusCode/status) 또는 메시지에 429 가 있으면 true
 * - withRateLimitRetry(fn): 429 일 때만 delaysMs 간격으로 다시 시도, 그 밖의 오류는 바로 던짐
 */

/** 기본 재시도 간격 (ms): 1.5초 → 3초 → 6초 */
export const DEFAULT_RETRY_DELAYS_MS = [1500, 3000, 6000];

/** 호출 한도 초과(429) 오류인지 판별 */
export function isRateLimitError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const e = error as { statusCode?: unknown; status?: unknown; message?: unknown };
  if (e.statusCode === 429 || e.status === 429) return true;
  const message = typeof e.message === "string" ? e.message : "";
  return /\b429\b/.test(message) || /rate.?limit/i.test(message);
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** 429 이면 delaysMs 간격으로 재시도한다. 마지막 시도까지 실패하면 그 오류를 던진다. */
export async function withRateLimitRetry<T>(
  fn: () => Promise<T>,
  delaysMs: number[] = DEFAULT_RETRY_DELAYS_MS,
  wait: (ms: number) => Promise<unknown> = sleep
): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    try {
      return await fn();
    } catch (error) {
      if (!isRateLimitError(error) || attempt >= delaysMs.length) throw error;
      console.warn(`[LLM] 호출 한도 초과(429), ${delaysMs[attempt]}ms 후 재시도 (${attempt + 1}/${delaysMs.length})`);
      await wait(delaysMs[attempt]);
    }
  }
}
