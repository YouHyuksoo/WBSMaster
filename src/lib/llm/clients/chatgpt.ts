/**
 * @file src/lib/llm/clients/chatgpt.ts
 * @description
 * 회사 ChatGPT 구독 계정(OAuth)으로 Codex Responses API 를 부르는 클라이언트입니다. 도구 호출을 지원합니다.
 *
 * 초보자 가이드:
 * - 토큰은 token-store 의 getValidAccessToken() 이 서버 파일에서 꺼내고 필요하면 갱신한다.
 * - 요청: system 메시지는 instructions, 나머지는 input 배열 (user → input_text, assistant → output_text,
 *   도구 호출 → function_call, 도구 결과 → function_call_output). store:false, stream:true.
 * - 응답: SSE 스트림의 response.completed 이벤트에서 output(message · function_call)을 꺼낸다.
 * - 401 이면 ChatGptAuthError(RELOGIN_REQUIRED) → FallbackClient 가 대체 제공자로 넘긴다.
 * - 형식 근거: chatgpt/constants.ts 주석, 원문 __fixtures__/chatgpt-*.txt
 */

import { LLMClient } from "../client-base";
import { CHATGPT_ACCOUNT_ID_HEADER, CHATGPT_API_BASE } from "../chatgpt/constants";
import { ChatGptAuthError, getValidAccessToken } from "../chatgpt/token-store";
import type { ChatMessage, ToolCall, ToolDefinition, ToolTurn } from "../tool-calling";

type OutputItem = { type: string; call_id?: string; name?: string; arguments?: string; content?: { type: string; text?: string }[] };

function toInput(messages: ChatMessage[]): unknown[] {
  const input: unknown[] = [];
  for (const m of messages) {
    if (m.role === "system") continue;
    if (m.role === "user") input.push({ type: "message", role: "user", content: [{ type: "input_text", text: m.content }] });
    else if (m.role === "tool") input.push({ type: "function_call_output", call_id: m.toolCallId, output: m.content });
    else if (m.role === "assistant") {
      if (m.content) input.push({ type: "message", role: "assistant", content: [{ type: "output_text", text: m.content }] });
      for (const c of m.toolCalls ?? []) input.push({ type: "function_call", call_id: c.id, name: c.name, arguments: c.arguments });
    }
  }
  return input;
}

/** SSE 본문(또는 JSON)에서 최종 output 항목을 꺼낸다 */
function parseOutput(raw: string): OutputItem[] {
  let completed: OutputItem[] | null = null;
  const done: OutputItem[] = [];
  for (const line of raw.split("\n")) {
    if (!line.startsWith("data:")) continue;
    try {
      const ev = JSON.parse(line.slice(5).trim());
      if (ev.type === "response.completed") completed = ev.response?.output ?? [];
      else if (ev.type === "response.output_item.done" && ev.item) done.push(ev.item);
    } catch {
      /* 불완전한 줄은 무시 */
    }
  }
  if (completed && completed.length) return completed;
  if (done.length) return done;
  if (raw.trim().startsWith("{")) return JSON.parse(raw).output ?? [];
  return [];
}

export class ChatGptClient extends LLMClient {
  get supportsTools(): boolean {
    return true;
  }

  private async call(messages: ChatMessage[], tools: ToolDefinition[]): Promise<OutputItem[]> {
    const { accessToken, accountId } = await getValidAccessToken();
    const instructions =
      messages.filter((m) => m.role === "system").map((m) => m.content).join("\n\n") || "WBS Master 업무 어시스턴트. 한국어로 답한다.";
    const body: Record<string, unknown> = {
      model: this.config.model,
      instructions,
      input: toInput(messages),
      store: false,
      stream: true,
    };
    if (tools.length) {
      body.tools = tools.map((t) => ({ type: "function", name: t.name, description: t.description, parameters: t.parameters }));
      body.tool_choice = "auto";
      body.parallel_tool_calls = false;
    }
    const res = await fetch(`${CHATGPT_API_BASE}/responses`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "text/event-stream",
        Authorization: `Bearer ${accessToken}`,
        [CHATGPT_ACCOUNT_ID_HEADER]: accountId,
      },
      body: JSON.stringify(body),
    });
    const raw = await res.text();
    if (res.status === 401) throw new ChatGptAuthError("RELOGIN_REQUIRED", "ChatGPT 인증이 거부되었습니다. 관리자가 다시 로그인해야 합니다.");
    if (!res.ok) throw new Error(`ChatGPT API 오류 (${res.status}): ${raw.slice(0, 300)}`);
    return parseOutput(raw);
  }

  async chatWithTools(messages: ChatMessage[], tools: ToolDefinition[]): Promise<ToolTurn> {
    const output = await this.call(messages, tools);
    const text = output
      .filter((o) => o.type === "message")
      .flatMap((o) => o.content ?? [])
      .filter((c) => c.type === "output_text")
      .map((c) => c.text ?? "")
      .join("");
    const calls: ToolCall[] = output
      .filter((o) => o.type === "function_call")
      .map((o) => ({ id: o.call_id ?? "", name: o.name ?? "", arguments: o.arguments ?? "{}" }));
    if (calls.length) return { type: "tool_calls", calls, ...(text ? { content: text } : {}) };
    return { type: "text", content: text };
  }

  async generate(prompt: string, systemPrompt?: string): Promise<string> {
    const messages: ChatMessage[] = [];
    if (systemPrompt) messages.push({ role: "system", content: systemPrompt });
    messages.push({ role: "user", content: prompt });
    const turn = await this.chatWithTools(messages, []);
    return turn.type === "text" ? turn.content : turn.content ?? "";
  }
}
