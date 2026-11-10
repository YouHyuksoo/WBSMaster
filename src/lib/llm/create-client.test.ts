/**
 * @file src/lib/llm/create-client.test.ts
 * @description
 * createLLMClient 가 제공자별로 도구 호출 지원 여부를 맞게 노출하는지 확인합니다.
 *
 * 초보자 가이드:
 * - chatgpt · openai · openrouter 모두 도구 호출 지원 (Gemini · Mistral 은 2026-11-09 제거)
 */

import { describe, expect, it } from "vitest";
import { createLLMClient } from "./index";

describe("createLLMClient", () => {
  it.each([
    ["chatgpt", true],
    ["openai", true],
    ["openrouter", true],
  ] as const)("%s supportsTools=%s", (provider, expected) => {
    expect(createLLMClient({ provider, apiKey: "k", model: "m" }).supportsTools).toBe(expected);
  });
});
