/**
 * @file src/lib/chat-tools/registry.ts
 * @description
 * AI 채팅 도구 레지스트리입니다. 도구를 이름으로 등록·조회하고, LLM 에 보낼 도구 정의 목록을 만듭니다.
 *
 * 초보자 가이드:
 * - 새 도구는 src/lib/chat-tools/index.ts 에서 defaultRegistry.register(...) 로 등록한다.
 * - 2단계(지성지식관리 연동)의 search_knowledge 도 등록만 하면 채팅에서 쓸 수 있다.
 */

import type { ToolDefinition } from "@/lib/llm/tool-calling";
import type { ChatTool } from "./types";

export class ToolRegistry {
  private tools = new Map<string, ChatTool>();

  register<A>(tool: ChatTool<A>): void {
    if (this.tools.has(tool.name)) throw new Error(`이미 등록된 채팅 도구입니다: ${tool.name}`);
    this.tools.set(tool.name, tool as ChatTool);
  }

  get(name: string): ChatTool | undefined {
    return this.tools.get(name);
  }

  definitions(): ToolDefinition[] {
    return [...this.tools.values()].map((t) => ({ name: t.name, description: t.description, parameters: t.parameters }));
  }
}

/** 채팅 API 가 쓰는 기본 레지스트리 */
export const defaultRegistry = new ToolRegistry();
