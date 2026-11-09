/**
 * @file src/lib/chat-tools/types.ts
 * @description
 * AI 채팅 도구의 공통 타입입니다.
 *
 * 초보자 가이드:
 * - ToolContext: 서버가 주입하는 실행 맥락. projectId·user 는 LLM 이 고를 수 없다.
 * - ToolResult: data(조회 결과) · proposal(쓰기 제안, 확인 카드) · candidates(사람 후보 선택) · error
 * - ChatTool: parse(args) 로 LLM 인자를 검증·정규화한 뒤 execute(ctx, args) 로 실행한다.
 *   kind="write" 도구는 DB 를 바꾸지 않고 proposal 만 만든다.
 */

import type { AuthUser } from "@/lib/auth";
import type { prisma } from "@/lib/prisma";
import type { LLMClient } from "@/lib/llm/client-base";

export interface ToolPromptConfig {
  sqlSystemPrompt?: string;
}

export interface ToolContext {
  projectId: string;
  user: AuthUser;
  prisma: typeof prisma;
  llm?: LLMClient;
  promptConfig?: ToolPromptConfig;
}

export type ToolResult =
  | { kind: "data"; summary: string; rows?: Record<string, unknown>[]; chartHint?: "bar" | "line" | "pie" | "mindmap" }
  | { kind: "proposal"; actionId: string; summary: string; fields: { label: string; value: string }[] }
  | { kind: "candidates"; prompt: string; options: { label: string; value: string }[] }
  | { kind: "error"; message: string };

export interface ChatTool<A = unknown> {
  name: string;
  description: string;
  /** JSON Schema */
  parameters: Record<string, unknown>;
  kind: "read" | "write";
  /** LLM 인자 검증·정규화. 잘못되면 이유를 담은 Error 를 던진다 */
  parse(args: unknown): A;
  execute(ctx: ToolContext, args: A): Promise<ToolResult>;
}
