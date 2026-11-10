/**
 * @file src/lib/llm/config.test.ts
 * @description resolveLLMConfig 가 제공자별로 맞는 키·모델을 고르는지 검증합니다.
 *
 * 초보자 가이드:
 * - 회귀: 예전 라우트 일부는 제공자와 다른 키를 써서 잘못된 키로 호출됐다.
 * - Kimi · Gemini · Mistral 은 2026-11-09 제거: 저장된 값이 남아 있어도 지원하지 않는 제공자로 막힌다.
 */
import { describe, expect, it } from "vitest";
import { resolveLLMConfig, providerLabel, providerBadge, type AiSettingFields } from "./config";

const base: AiSettingFields = {
  provider: "openai",
  openaiApiKey: "o-key",
  openaiModel: "gpt-m",
  openrouterApiKey: "r-key",
  openrouterModel: "vendor/model",
  chatgptModel: "gpt-x",
};

describe("resolveLLMConfig", () => {
  it.each([
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

  it.each(["kimi", "gemini", "mistral"])("제거된 %s 는 지원하지 않는 제공자로 오류", (provider) => {
    const r = resolveLLMConfig({ ...base, provider });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toContain(provider);
  });

  it("chatgpt 제공자는 키 없이 회사 계정 모델을 쓴다", () => {
    const r = resolveLLMConfig({ ...base, provider: "chatgpt" });
    expect(r).toEqual({ ok: true, config: { provider: "chatgpt", apiKey: "", model: "gpt-x" } });
  });

  it.each(["chatgpt", "openai", "openrouter"])("providerBadge: %s 는 이름과 모델을 보여 준다", (provider) => {
    const badge = providerBadge({ ...base, provider });
    expect(badge).not.toContain("설정 필요");
    expect(badge).toContain(providerLabel(provider));
  });

  it("providerBadge: 모르는 제공자는 설정 필요", () => {
    expect(providerBadge({ ...base, provider: "kimi" })).toBe("kimi (설정 필요)");
    expect(providerBadge({ provider: "chatgpt", chatgptModel: "gpt-6.1-sol" })).toBe("회사 ChatGPT gpt-6.1-sol");
  });

  it("providerLabel", () => {
    expect(providerLabel("chatgpt")).toBe("회사 ChatGPT");
    expect(providerLabel("openrouter")).toBe("OpenRouter");
    expect(providerLabel("unknown")).toBe("unknown");
  });
});
