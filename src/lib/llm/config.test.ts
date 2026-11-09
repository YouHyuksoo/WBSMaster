/**
 * @file src/lib/llm/config.test.ts
 * @description resolveLLMConfig 가 제공자별로 맞는 키·모델을 고르는지 검증합니다.
 *
 * 초보자 가이드:
 * - 회귀: 예전 라우트 일부는 gemini 가 아니면 무조건 mistral 키를 써서 kimi 사용자가 잘못된 키로 호출됐다.
 */
import { describe, expect, it } from "vitest";
import { resolveLLMConfig, providerLabel, type AiSettingFields } from "./config";

const base: AiSettingFields = {
  provider: "gemini",
  geminiApiKey: "g-key",
  geminiModel: "gemini-m",
  mistralApiKey: "m-key",
  mistralModel: "mistral-m",
  kimiApiKey: "k-key",
  kimiModel: "kimi-m",
  openaiApiKey: "o-key",
  openaiModel: "gpt-m",
};

describe("resolveLLMConfig", () => {
  it.each([
    ["gemini", "g-key", "gemini-m"],
    ["mistral", "m-key", "mistral-m"],
    ["kimi", "k-key", "kimi-m"],
    ["openai", "o-key", "gpt-m"],
  ])("%s 제공자는 자기 키·모델을 쓴다", (provider, key, model) => {
    const r = resolveLLMConfig({ ...base, provider });
    expect(r).toEqual({ ok: true, config: { provider, apiKey: key, model } });
  });

  it("키가 비어 있으면 제공자 이름을 담은 오류를 돌려준다", () => {
    const r = resolveLLMConfig({ ...base, provider: "openai", openaiApiKey: null });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toContain("OpenAI");
  });

  it("지원하지 않는 제공자는 오류", () => {
    const r = resolveLLMConfig({ ...base, provider: "claude" });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toContain("claude");
  });

  it("providerLabel", () => {
    expect(providerLabel("openai")).toBe("OpenAI");
    expect(providerLabel("unknown")).toBe("unknown");
  });
});
