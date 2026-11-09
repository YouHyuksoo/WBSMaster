/**
 * @file vitest.setup.ts
 * @description
 * 모든 Vitest 테스트 전에 실행되는 설정입니다. 테스트가 실제 외부 네트워크(OpenAI, ChatGPT, Slack 등)를 부르지 못하게 막습니다.
 *
 * 초보자 가이드:
 * - 전역 fetch 를 "호출하면 실패"하는 함수로 바꾼다. 테스트는 vi.stubGlobal("fetch", ...) 로 목을 넣어야 한다.
 * - vi.unstubAllGlobals() 를 부르면 이 막힌 fetch 로 돌아간다 (실제 fetch 로 돌아가지 않음).
 * - 실패 메시지가 보이면 그 테스트에 fetch 목을 추가한다.
 */

import { vi } from "vitest";

const blockedFetch = (input: unknown) => {
  const url = typeof input === "string" ? input : input instanceof URL ? input.href : String((input as { url?: string })?.url ?? input);
  return Promise.reject(new Error(`테스트에서 실제 네트워크 호출은 금지입니다 (fetch ${url}). vi.stubGlobal("fetch", ...) 로 목을 넣으세요.`));
};

globalThis.fetch = vi.fn(blockedFetch) as unknown as typeof fetch;
