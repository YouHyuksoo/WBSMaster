/**
 * @file src/lib/__tests__/no-network.test.ts
 * @description
 * 테스트 환경에서 실제 네트워크 호출이 막혀 있는지 확인합니다 (vitest.setup.ts).
 *
 * 초보자 가이드:
 * - 이 테스트가 실패하면 vitest.config.mts 의 setupFiles 에서 vitest.setup.ts 가 빠졌는지 확인한다.
 */

import { afterEach, describe, expect, it, vi } from "vitest";

afterEach(() => vi.unstubAllGlobals());

describe("테스트 네트워크 차단", () => {
  it("목 없이 fetch 를 부르면 실패한다", async () => {
    await expect(fetch("https://chatgpt.com/backend-api/codex/responses")).rejects.toThrow(/실제 네트워크 호출은 금지/);
  });

  it("stub 을 풀면 다시 막힌 fetch 로 돌아온다", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("ok")));
    await expect((await fetch("https://x")).text()).resolves.toBe("ok");
    vi.unstubAllGlobals();
    await expect(fetch("https://x")).rejects.toThrow(/금지/);
  });
});
