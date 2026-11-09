/**
 * @file src/lib/llm/clients/openai-compatible.ts
 * @description
 * OpenAI 호환 Chat Completions 클라이언트입니다 (OpenAI · OpenRouter 공용). 도구 호출을 지원합니다.
 *
 * 초보자 가이드:
 * - OpenAI: 추론 모델(gpt-5, o 시리즈)은 temperature 변경 · max_tokens 를 거부하므로
 *   max_completion_tokens 만 보낸다 (extraBody 로 전달).
 * - OpenRouter: max_tokens 사용, 앱 식별 헤더(HTTP-Referer, X-Title) 추가
 * - chatWithTools: ChatMessage ↔ chat completions messages/tool_calls 변환
 */

import { LLMClient } from "../client-base";
import type { LLMConfig } from "../config";
import type { ChatMessage, ToolDefinition, ToolTurn } from "../tool-calling";

type WireMessage = Record<string, unknown>;

function toWire(m: ChatMessage): WireMessage {
  if (m.role === "tool") return { role: "tool", tool_call_id: m.toolCallId, content: m.content };
  if (m.role === "assistant" && m.toolCalls?.length) {
    return {
      role: "assistant",
      content: m.content,
      tool_calls: m.toolCalls.map((c) => ({ id: c.id, type: "function", function: { name: c.name, arguments: c.arguments } })),
    };
  }
  return { role: m.role, content: m.content };
}

export class OpenAICompatibleClient extends LLMClient {
  constructor(
    config: LLMConfig,
    private baseUrl: string,
    private label: string,
    private extraBody: Record<string, unknown>,
    private extraHeaders: Record<string, string> = {}
  ) {
    super(config);
  }

  get supportsTools(): boolean {
    return true;
  }

  private async post(body: Record<string, unknown>): Promise<{ content?: string | null; tool_calls?: { id: string; function: { name: string; arguments: string } }[] }> {
    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.config.apiKey}`,
        ...this.extraHeaders,
      },
      body: JSON.stringify({ model: this.config.model, ...body, ...this.extraBody }),
    });
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`${this.label} API 오류 (${response.status}): ${errorText}`);
    }
    const data = await response.json();
    return data.choices?.[0]?.message ?? {};
  }

  async generate(prompt: string, systemPrompt?: string): Promise<string> {
    const messages: WireMessage[] = [];
    if (systemPrompt) messages.push({ role: "system", content: systemPrompt });
    messages.push({ role: "user", content: prompt });
    const message = await this.post({ messages });
    return typeof message.content === "string" ? message.content : "";
  }

  async chatWithTools(messages: ChatMessage[], tools: ToolDefinition[]): Promise<ToolTurn> {
    const body: Record<string, unknown> = { messages: messages.map(toWire) };
    if (tools.length) {
      body.tools = tools.map((t) => ({ type: "function", function: { name: t.name, description: t.description, parameters: t.parameters } }));
    }
    const message = await this.post(body);
    const content = typeof message.content === "string" ? message.content : "";
    if (message.tool_calls?.length) {
      return {
        type: "tool_calls",
        calls: message.tool_calls.map((c) => ({ id: c.id, name: c.function.name, arguments: c.function.arguments })),
        ...(content ? { content } : {}),
      };
    }
    return { type: "text", content };
  }
}
