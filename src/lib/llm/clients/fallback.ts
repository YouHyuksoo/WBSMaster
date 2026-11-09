/**
 * @file src/lib/llm/clients/fallback.ts
 * @description
 * 회사 ChatGPT 연결이 끊기거나(재로그인 필요·미연결), 한도(429)·네트워크 오류가 나면
 * 환경 변수로 지정한 대체 제공자로 한 번 넘기는 래퍼입니다.
 *
 * 초보자 가이드:
 * - 대체 제공자: CHAT_FALLBACK_PROVIDER (openai | openrouter)
 *   + CHAT_FALLBACK_OPENAI_API_KEY 또는 CHAT_FALLBACK_OPENROUTER_API_KEY, CHAT_FALLBACK_MODEL(선택)
 * - 대체로 답하면 usedFallback=true. 화면에 "대체 모델로 답함"을 표시한다.
 * - 대체 제공자가 없으면 관리자에게 재로그인을 요청하라는 안내 오류를 던진다.
 */

import { LLMClient } from "../client-base";
import { ChatGptAuthError } from "../chatgpt/token-store";
import { isRateLimitError } from "../retry";
import type { ChatMessage, ToolDefinition, ToolTurn } from "../tool-calling";
import { OpenAICompatibleClient } from "./openai-compatible";

/** 대체 경로로 넘길 오류인지 */
export function isFallbackError(e: unknown): boolean {
  if (e instanceof ChatGptAuthError) return true;
  if (isRateLimitError(e)) return true;
  return e instanceof TypeError && /fetch failed|network/i.test(e.message);
}

export class FallbackClient extends LLMClient {
  constructor(private primary: LLMClient, private fallback: LLMClient | null) {
    super({ provider: "chatgpt", apiKey: "", model: "" });
  }

  get supportsTools(): boolean {
    return this.primary.supportsTools;
  }

  private async run<T>(fn: (c: LLMClient) => Promise<T>): Promise<T> {
    this.usedFallback = false;
    try {
      return await fn(this.primary);
    } catch (e) {
      if (!isFallbackError(e)) throw e;
      if (!this.fallback) {
        const reason = e instanceof Error ? e.message : String(e);
        throw new Error(`ChatGPT 연결에 실패했습니다 (${reason}). 관리자에게 설정 화면에서 회사 ChatGPT 계정 재연결을 요청하세요.`);
      }
      console.warn("[LLM] 회사 ChatGPT 호출 실패, 대체 제공자로 처리:", e instanceof Error ? e.message : e);
      const result = await fn(this.fallback);
      this.usedFallback = true;
      return result;
    }
  }

  generate(prompt: string, systemPrompt?: string): Promise<string> {
    return this.run((c) => c.generate(prompt, systemPrompt));
  }

  chatWithTools(messages: ChatMessage[], tools: ToolDefinition[]): Promise<ToolTurn> {
    return this.run((c) => (c.supportsTools ? c.chatWithTools(messages, tools) : c.generate(lastUser(messages)).then((t) => ({ type: "text" as const, content: t }))));
  }
}

function lastUser(messages: ChatMessage[]): string {
  for (let i = messages.length - 1; i >= 0; i--) if (messages[i].role === "user") return messages[i].content;
  return "";
}

/** 환경 변수로 대체 제공자 클라이언트를 만든다. 설정이 없으면 null */
export function fallbackFromEnv(env: NodeJS.ProcessEnv = process.env): LLMClient | null {
  const provider = env.CHAT_FALLBACK_PROVIDER;
  if (provider === "openai" && env.CHAT_FALLBACK_OPENAI_API_KEY) {
    return new OpenAICompatibleClient(
      { provider: "openai", apiKey: env.CHAT_FALLBACK_OPENAI_API_KEY, model: env.CHAT_FALLBACK_MODEL || "gpt-4.1-mini" },
      "https://api.openai.com/v1",
      "OpenAI",
      { max_completion_tokens: 8192 }
    );
  }
  if (provider === "openrouter" && env.CHAT_FALLBACK_OPENROUTER_API_KEY) {
    return new OpenAICompatibleClient(
      { provider: "openrouter", apiKey: env.CHAT_FALLBACK_OPENROUTER_API_KEY, model: env.CHAT_FALLBACK_MODEL || "openai/gpt-4.1-mini" },
      "https://openrouter.ai/api/v1",
      "OpenRouter",
      { max_tokens: 4096 },
      { "HTTP-Referer": "https://wbs.jisheng.co.kr", "X-Title": "WBS Master" }
    );
  }
  return null;
}
