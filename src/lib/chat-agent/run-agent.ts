/**
 * @file src/lib/chat-agent/run-agent.ts
 * @description
 * AI 채팅 에이전트 루프입니다. LLM 이 도구를 고르면 실행해 결과를 돌려주고, 텍스트 답이 나올 때까지 반복합니다.
 *
 * 초보자 가이드:
 * - 메시지: [system, ...이전 대화, user] → LLM → (도구 호출 → 실행 → tool 메시지) × N → 텍스트 답
 * - proposal(쓰기 확인 카드)·candidates(사람 후보 선택) 결과가 나오면 LLM 을 다시 부르지 않고 바로 응답한다
 * - 없는 도구·잘못된 인자·도구 오류는 오류 문장을 tool 결과로 돌려주고 계속한다 (루프가 죽지 않음)
 * - maxSteps(기본 6)를 넘으면 "질문을 나눠서" 안내로 끝낸다
 * - 마지막 조회 결과(rows)로 차트·마인드맵 태그를 처리한다 (extractChartAndMindmap)
 */

import { extractChartAndMindmap, type LLMResponse } from "@/lib/llm/index";
import type { LLMClient } from "@/lib/llm/client-base";
import type { ChatMessage, ToolCall } from "@/lib/llm/tool-calling";
import { defaultRegistry, type ToolRegistry } from "@/lib/chat-tools/registry";
import type { ToolContext, ToolResult } from "@/lib/chat-tools/types";

export interface AgentResult extends LLMResponse {
  toolSummary: { tool: string; summary: string }[];
  pendingAction?: { id: string; summary: string; fields: { label: string; value: string }[] };
  candidates?: { prompt: string; options: { label: string; value: string }[] };
  usedFallback: boolean;
}

const MAX_ROWS_TO_LLM = 60;

async function runTool(registry: ToolRegistry, ctx: ToolContext, call: ToolCall): Promise<ToolResult> {
  const tool = registry.get(call.name);
  if (!tool) return { kind: "error", message: `없는 도구입니다: ${call.name}. 제공된 도구만 쓰세요.` };
  let args: unknown;
  try {
    args = call.arguments ? JSON.parse(call.arguments) : {};
  } catch {
    return { kind: "error", message: `${call.name} 인자가 JSON 이 아닙니다.` };
  }
  try {
    return await tool.execute(ctx, tool.parse(args));
  } catch (e) {
    return { kind: "error", message: `${call.name} 실패: ${e instanceof Error ? e.message : String(e)}` };
  }
}

/** LLM 에 돌려줄 도구 결과 (행은 일부만) */
function toToolMessage(r: ToolResult): string {
  if (r.kind === "data") {
    const rows = r.rows ?? [];
    return JSON.stringify({ summary: r.summary, rows: rows.slice(0, MAX_ROWS_TO_LLM), truncated: rows.length > MAX_ROWS_TO_LLM });
  }
  return JSON.stringify(r);
}

export async function runAgent(opts: {
  client: LLMClient;
  history: ChatMessage[];
  userMessage: string;
  ctx: ToolContext;
  systemPrompt: string;
  registry?: ToolRegistry;
  maxSteps?: number;
}): Promise<AgentResult> {
  const registry = opts.registry ?? defaultRegistry;
  const maxSteps = opts.maxSteps ?? 6;
  const tools = registry.definitions();
  const messages: ChatMessage[] = [{ role: "system", content: opts.systemPrompt }, ...opts.history, { role: "user", content: opts.userMessage }];
  const toolSummary: AgentResult["toolSummary"] = [];
  let lastRows: Record<string, unknown>[] | null = null;
  let usedFallback = false;

  const finish = (content: string, extra: Partial<AgentResult> = {}): AgentResult => ({
    ...extractChartAndMindmap(content, lastRows, opts.userMessage),
    toolSummary,
    usedFallback,
    ...extra,
  });

  for (let step = 0; step < maxSteps; step++) {
    const turn = await opts.client.chatWithTools(messages, tools);
    usedFallback ||= opts.client.usedFallback;
    if (turn.type === "text") return finish(turn.content);

    messages.push({ role: "assistant", content: turn.content ?? "", toolCalls: turn.calls });
    for (const call of turn.calls) {
      const r = await runTool(registry, opts.ctx, call);
      if (r.kind === "proposal") {
        toolSummary.push({ tool: call.name, summary: r.summary });
        return finish(`아래 내용으로 진행할까요?\n\n**${r.summary}**`, { pendingAction: { id: r.actionId, summary: r.summary, fields: r.fields } });
      }
      if (r.kind === "candidates") {
        return finish(r.prompt, { candidates: { prompt: r.prompt, options: r.options } });
      }
      if (r.kind === "data") {
        toolSummary.push({ tool: call.name, summary: r.summary });
        if (r.rows?.length) lastRows = r.rows;
      }
      messages.push({ role: "tool", toolCallId: call.id, content: toToolMessage(r) });
    }
  }
  return finish("질문이 복잡해서 끝까지 처리하지 못했습니다. 질문을 나눠서 다시 물어봐 주세요.");
}
