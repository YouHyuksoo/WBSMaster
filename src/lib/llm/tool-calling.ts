/**
 * @file src/lib/llm/tool-calling.ts
 * @description
 * LLM 도구 호출(function calling)에 쓰는 제공자 공통 타입입니다.
 *
 * 초보자 가이드:
 * - ChatMessage: 대화 메시지. assistant 는 도구 호출을, tool 은 그 결과를 담는다.
 * - ToolDefinition: LLM 에 보여 줄 도구 이름·설명·JSON Schema 인자.
 * - ToolTurn: LLM 한 번의 응답. 텍스트이거나 도구 호출 목록이다.
 * - 제공자별 형식(Chat Completions, Responses)은 각 클라이언트가 이 타입으로 바꾼다.
 */

export interface ToolCall {
  id: string;
  name: string;
  /** JSON 문자열 */
  arguments: string;
}

export type ChatMessage =
  | { role: "system" | "user"; content: string }
  | { role: "assistant"; content: string; toolCalls?: ToolCall[] }
  | { role: "tool"; toolCallId: string; content: string };

export interface ToolDefinition {
  name: string;
  description: string;
  /** JSON Schema */
  parameters: Record<string, unknown>;
}

export type ToolTurn =
  | { type: "text"; content: string }
  | { type: "tool_calls"; calls: ToolCall[]; content?: string };
