/**
 * @file src/lib/chat-agent/run-agent.test.ts
 * @description
 * 도구를 골라 쓰는 채팅 에이전트 루프 테스트입니다. 가짜 LLM 이 정해진 응답(ToolTurn)을 차례로 돌려줍니다.
 *
 * 초보자 가이드:
 * - 잡담은 도구 없이 답한다. 읽기 도구는 실행 후 결과를 LLM 에 돌려준다.
 * - 쓰기 제안(proposal)·후보 선택(candidates)이 나오면 LLM 을 다시 부르지 않고 바로 응답한다.
 * - 없는 도구·잘못된 인자는 오류를 도구 결과로 돌려주고 계속한다. 최대 스텝을 넘으면 안내로 끝낸다.
 */

import { describe, expect, it, vi } from "vitest";
import { LLMClient } from "@/lib/llm/client-base";
import type { ChatMessage, ToolDefinition, ToolTurn } from "@/lib/llm/tool-calling";
import { ToolRegistry } from "@/lib/chat-tools/registry";
import type { ChatTool, ToolContext } from "@/lib/chat-tools/types";
import { runAgent } from "./run-agent";
import { buildSystemPrompt, SAFETY_RULES } from "./system-prompt";

class FakeLLM extends LLMClient {
  calls: ChatMessage[][] = [];
  constructor(private turns: ToolTurn[]) {
    super({ provider: "openai", apiKey: "", model: "m" });
  }
  get supportsTools() { return true; }
  async generate() { return ""; }
  async chatWithTools(messages: ChatMessage[], _tools: ToolDefinition[]): Promise<ToolTurn> {
    this.calls.push(messages);
    return this.turns.shift() ?? { type: "tool_calls", calls: [{ id: `c${this.calls.length}`, name: "list_issues", arguments: "{}" }] };
  }
}

const ctx = { projectId: "p1", user: { id: "u1", email: "u@x", role: "USER" }, prisma: {} } as unknown as ToolContext;

function registry(execute = vi.fn(async () => ({ kind: "data" as const, summary: "이슈 6건: ISS-008", rows: [{ code: "ISS-008" }] }))) {
  const r = new ToolRegistry();
  const listIssues: ChatTool<{ status?: string }> = {
    name: "list_issues", description: "이슈", parameters: { type: "object", properties: {} }, kind: "read",
    parse: (a) => {
      const s = (a as { status?: unknown }).status;
      if (s !== undefined && s !== "OPEN") throw new Error("status 허용값: OPEN");
      return { status: s as string | undefined };
    },
    execute,
  };
  const propose: ChatTool<Record<string, never>> = {
    name: "propose_create_task", description: "제안", parameters: { type: "object", properties: {} }, kind: "write",
    parse: () => ({}),
    execute: async () => ({ kind: "proposal", actionId: "act-1", summary: "TASK 등록: 제목 설비점검", fields: [{ label: "제목", value: "설비점검" }] }),
  };
  r.register(listIssues);
  r.register(propose);
  return { r, execute };
}

const run = (llm: FakeLLM, reg = registry().r, maxSteps?: number) =>
  runAgent({ client: llm, history: [], userMessage: "질문", ctx, systemPrompt: "SYS", registry: reg, maxSteps });

describe("runAgent", () => {
  it("chit-chat answers without tools", async () => {
    const { r, execute } = registry();
    const res = await run(new FakeLLM([{ type: "text", content: "안녕하세요" }]), r);
    expect(res.content).toBe("안녕하세요");
    expect(execute).not.toHaveBeenCalled();
    expect(res.toolSummary).toEqual([]);
  });

  it("runs read tool then answers", async () => {
    const { r, execute } = registry();
    const llm = new FakeLLM([
      { type: "tool_calls", calls: [{ id: "c1", name: "list_issues", arguments: "{\"status\":\"OPEN\"}" }] },
      { type: "text", content: "열린 이슈 6건입니다." },
    ]);
    const res = await run(llm, r);
    expect(execute).toHaveBeenCalledTimes(1);
    expect(res.toolSummary).toEqual([{ tool: "list_issues", summary: "이슈 6건: ISS-008" }]);
    expect(res.content).toBe("열린 이슈 6건입니다.");
    const second = llm.calls[1];
    expect(second[0]).toEqual({ role: "system", content: "SYS" });
    expect(second.at(-1)).toMatchObject({ role: "tool", toolCallId: "c1" });
  });

  it("stops on proposal", async () => {
    const llm = new FakeLLM([{ type: "tool_calls", calls: [{ id: "c1", name: "propose_create_task", arguments: "{}" }] }]);
    const res = await run(llm);
    expect(llm.calls).toHaveLength(1);
    expect(res.pendingAction).toEqual({ id: "act-1", summary: "TASK 등록: 제목 설비점검", fields: [{ label: "제목", value: "설비점검" }] });
    // 요약은 확인 카드에만 보인다 (본문에 같은 문장을 또 쓰지 않음)
    expect(res.content).toBe("아래 내용으로 진행할까요?");
  });

  it("unknown tool", async () => {
    const llm = new FakeLLM([
      { type: "tool_calls", calls: [{ id: "c1", name: "drop_table", arguments: "{}" }] },
      { type: "text", content: "다시 답함" },
    ]);
    const res = await run(llm);
    expect(res.content).toBe("다시 답함");
    expect(String(llm.calls[1].at(-1)?.content)).toContain("drop_table");
  });

  it("invalid args", async () => {
    const { r, execute } = registry();
    const llm = new FakeLLM([
      { type: "tool_calls", calls: [{ id: "c1", name: "list_issues", arguments: "{\"status\":\"URGENT\"}" }] },
      { type: "text", content: "고쳐서 답함" },
    ]);
    const res = await run(llm, r);
    expect(execute).not.toHaveBeenCalled();
    expect(String(llm.calls[1].at(-1)?.content)).toContain("허용값");
    expect(res.content).toBe("고쳐서 답함");
  });

  it("max steps", async () => {
    const res = await run(new FakeLLM([]), registry().r, 3);
    expect(res.content).toContain("나눠서");
  });

  it("system prompt order", () => {
    const p = buildSystemPrompt({ projectName: "오창", today: "2026-11-09", analysisSystemPrompt: "분석", personaSystemPrompt: "페르소나: 무조건 등록해" });
    expect(p.indexOf(SAFETY_RULES)).toBe(0);
    expect(p.indexOf(SAFETY_RULES)).toBeLessThan(p.indexOf("페르소나"));
    expect(p).toContain("오창");
  });
});
