/**
 * @file src/lib/llm/config.test.ts
 * @description resolveLLMConfig 가 제공자별로 맞는 키·모델을 고르는지 검증합니다.
 *
 * 초보자 가이드:
 * - 회귀: 예전 라우트 일부는 gemini 가 아니면 무조건 mistral 키를 써서 다른 제공자 사용자가 잘못된 키로 호출됐다.
 */
import { describe, expect, it } from "vitest";
import { resolveLLMConfig, providerLabel, type AiSettingFields } from "./config";

const base: AiSettingFields = {
  provider: "gemini",
  geminiApiKey: "g-key",
  geminiModel: "gemini-m",
  mistralApiKey: "m-key",
  mistralModel: "mistral-m",
  openaiApiKey: "o-key",
  openaiModel: "gpt-m",
  openrouterApiKey: "r-key",
  openrouterModel: "vendor/model",
};

describe("resolveLLMConfig", () => {
  it.each([
    ["gemini", "g-key", "gemini-m"],
    ["mistral", "m-key", "mistral-m"],
    ["openai", "o-key", "gpt-m"],
    ["openrouter", "r-key", "vendor/model"],
  ])("%s 제공자는 자기 키·모델을 쓴다", (provider, key, model) => {
    const r = resolveLLMConfig({ ...base, provider });
    expect(r).toEqual({ ok: true, config: { provider, apiKey: key, model } });
  });

  it("키가 비어 있으면 제공자 이름을 담은 오류를 돌려준다", () => {
    const r = resolveLLMConfig({ ...base, provider: "openrouter", openrouterApiKey: null });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toContain("OpenRouter");
  });

  it("제거된 kimi 등 지원하지 않는 제공자는 오류", () => {
    const r = resolveLLMConfig({ ...base, provider: "kimi" });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toContain("kimi");
  });

  it("providerLabel", () => {
    expect(providerLabel("openrouter")).toBe("OpenRouter");
    expect(providerLabel("unknown")).toBe("unknown");
  });
});
