/**
 * @file src/lib/llm/client-base.ts
 * @description
 * 모든 LLM 제공자 클라이언트의 기반 클래스입니다.
 *
 * 초보자 가이드:
 * - generate(prompt, systemPrompt): 텍스트 한 번 생성 (기존 SQL 파이프라인·주간보고 등이 사용)
 * - chatWithTools(messages, tools): 도구 호출을 지원하는 제공자만 구현한다 (supportsTools=true)
 * - usedFallback: 마지막 호출이 대체 제공자로 처리됐는지 (FallbackClient 가 설정)
 */

import type { LLMConfig } from "./config";
import type { ChatMessage, ToolDefinition, ToolTurn } from "./tool-calling";

export abstract class LLMClient {
  protected config: LLMConfig;
  usedFallback = false;

  constructor(config: LLMConfig) {
    this.config = config;
  }

  /** 도구 호출 지원 여부 */
  get supportsTools(): boolean {
    return false;
  }

  abstract generate(prompt: string, systemPrompt?: string): Promise<string>;

  chatWithTools(_messages: ChatMessage[], _tools: ToolDefinition[]): Promise<ToolTurn> {
    return Promise.reject(new Error(`${this.config.provider} 제공자는 도구 호출을 지원하지 않습니다.`));
  }
}
