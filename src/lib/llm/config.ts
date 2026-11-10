/**
 * @file src/lib/llm/config.ts
 * @description
 * 사용자 AI 설정(ai_settings 행)에서 현재 선택된 LLM 제공자의 API 키·모델을 꺼내는 공용 함수입니다.
 * API 라우트마다 제공자 분기를 복사하지 말고 이 함수를 쓰세요.
 *
 * 초보자 가이드:
 * - LLM_PROVIDERS: 지원 제공자 목록 (새 제공자는 여기와 PROVIDER_FIELDS 에만 추가)
 * - resolveLLMConfig(setting): { ok: true, config } 또는 { ok: false, error } 를 돌려줍니다.
 * - providerLabel(provider): 화면·오류 메시지용 이름
 * - Kimi · Gemini · Mistral 은 2026-11-09 제거됐다 (DB 칼럼만 남음).
 */

/** 지원 LLM 제공자 */
export const LLM_PROVIDERS = ["chatgpt", "openai", "openrouter"] as const;
export type LLMProvider = (typeof LLM_PROVIDERS)[number];

/** LLM 호출 설정 */
export interface LLMConfig {
  provider: LLMProvider;
  apiKey: string;
  model: string;
}

/** ai_settings 에서 쓰는 칼럼만 (Prisma AiSetting 의 부분집합) */
export interface AiSettingFields {
  provider: string;
  openaiApiKey: string | null;
  openaiModel: string;
  openrouterApiKey: string | null;
  openrouterModel: string;
  chatgptModel: string;
}

/**
 * chatgpt 는 회사 계정 하나를 서버가 공용으로 쓰므로(OAuth 토큰은 서버 파일) 사용자 키가 없다.
 * key 가 null 이면 키 검사를 하지 않는다.
 */
const PROVIDER_FIELDS: Record<LLMProvider, { key: keyof AiSettingFields | null; model: keyof AiSettingFields; label: string }> = {
  chatgpt: { key: null, model: "chatgptModel", label: "회사 ChatGPT" },
  openai: { key: "openaiApiKey", model: "openaiModel", label: "OpenAI" },
  openrouter: { key: "openrouterApiKey", model: "openrouterModel", label: "OpenRouter" },
};

/** 문자열이 지원 제공자인지 확인 */
export function isLLMProvider(value: unknown): value is LLMProvider {
  return typeof value === "string" && (LLM_PROVIDERS as readonly string[]).includes(value);
}

/** 화면·오류 메시지용 제공자 이름 */
export function providerLabel(provider: string): string {
  return isLLMProvider(provider) ? PROVIDER_FIELDS[provider].label : provider;
}

/**
 * 화면 배지용 "제공자 이름 + 모델" (예: "회사 ChatGPT gpt-6.1-sol").
 * 제공자 목록(PROVIDER_FIELDS)에서 만들므로 새 제공자를 추가해도 빠지지 않는다.
 */
export function providerBadge(setting: { provider: string } & Partial<Record<keyof AiSettingFields, unknown>>): string {
  if (!isLLMProvider(setting.provider)) return `${setting.provider} (설정 필요)`;
  const fields = PROVIDER_FIELDS[setting.provider];
  const model = setting[fields.model];
  return model ? `${fields.label} ${String(model)}` : fields.label;
}

/**
 * 현재 선택된 제공자의 키·모델로 LLMConfig 를 만든다.
 * 지원하지 않는 제공자이거나 키가 비어 있으면 error 메시지를 돌려준다.
 */
export function resolveLLMConfig(
  setting: AiSettingFields
): { ok: true; config: LLMConfig } | { ok: false; error: string } {
  if (!isLLMProvider(setting.provider)) {
    return { ok: false, error: `지원하지 않는 LLM 제공자입니다: ${setting.provider}. 설정 페이지에서 제공자를 다시 선택해주세요.` };
  }
  const fields = PROVIDER_FIELDS[setting.provider];
  if (fields.key === null) {
    return { ok: true, config: { provider: setting.provider, apiKey: "", model: String(setting[fields.model]) } };
  }
  const apiKey = setting[fields.key];
  if (!apiKey) {
    return { ok: false, error: `${fields.label} API 키가 설정되지 않았습니다. 설정 페이지에서 API 키를 등록해주세요.` };
  }
  return { ok: true, config: { provider: setting.provider, apiKey: String(apiKey), model: String(setting[fields.model]) } };
}
