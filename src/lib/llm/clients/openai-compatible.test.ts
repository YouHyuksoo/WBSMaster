/**
 * @file src/lib/llm/clients/openai-compatible.test.ts
 * @description
 * OpenAI 호환 Chat Completions 클라이언트(OpenAI · OpenRouter)의 도구 호출 변환 테스트입니다. fetch 는 목입니다.
 *
 * 초보자 가이드:
 * - 요청: tools[].type="function", role:"tool" 메시지는 tool_call_id 로 보낸다.
 * - 응답: message.tool_calls 가 있으면 {type:"tool_calls"}, 없으면 {type:"text"}.
 */

import { afterEach, describe, expect, it, vi } from "vitest";
import { OpenAICompatibleClient } from "./openai-compatible";

const cfg = { provider: "openai" as const, apiKey: "k", model: "m" };
const client = () => new OpenAICompatibleClient(cfg, "https://api.example/v1", "OpenAI", {});

afterEach(() => vi.unstubAllGlobals());

function mockFetch(message: Record<string, unknown>) {
  const f = vi.fn(async () => new Response(JSON.stringify({ choices: [{ message }] }), { status: 200 }));
  vi.stubGlobal("fetch", f);
  return f;
}

describe("OpenAICompatibleClient.chatWithTools", () => {
  it("sends tools and parses tool_calls", async () => {
    const f = mockFetch({ content: null, tool_calls: [{ id: "c1", type: "function", function: { name: "list_issues", arguments: "{}" } }] });
    const turn = await client().chatWithTools(
      [{ role: "user", content: "열린 이슈" }],
      [{ name: "list_issues", description: "이슈 조회", parameters: { type: "object", properties: {} } }]
    );
    expect(turn).toEqual({ type: "tool_calls", calls: [{ id: "c1", name: "list_issues", arguments: "{}" }] });
    const body = JSON.parse((f.mock.calls[0] as unknown as [string, RequestInit])[1].body as string);
    expect(body.tools[0]).toEqual({ type: "function", function: { name: "list_issues", description: "이슈 조회", parameters: { type: "object", properties: {} } } });
  });

  it("serializes assistant tool calls and tool results", async () => {
    const f = mockFetch({ content: "6건입니다" });
    const turn = await client().chatWithTools(
      [
        { role: "system", content: "규칙" },
        { role: "user", content: "열린 이슈" },
        { role: "assistant", content: "", toolCalls: [{ id: "c1", name: "list_issues", arguments: "{}" }] },
        { role: "tool", toolCallId: "c1", content: "{\"count\":6}" },
      ],
      []
    );
    expect(turn).toEqual({ type: "text", content: "6건입니다" });
    const body = JSON.parse((f.mock.calls[0] as unknown as [string, RequestInit])[1].body as string);
    expect(body.messages[2]).toEqual({
      role: "assistant",
      content: "",
      tool_calls: [{ id: "c1", type: "function", function: { name: "list_issues", arguments: "{}" } }],
    });
    expect(body.messages[3]).toEqual({ role: "tool", tool_call_id: "c1", content: "{\"count\":6}" });
    expect(body.tools).toBeUndefined();
  });

  it("supportsTools is true", () => {
    expect(client().supportsTools).toBe(true);
  });

  it("throws with status on HTTP error", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("slow down", { status: 429 })));
    await expect(client().chatWithTools([{ role: "user", content: "x" }], [])).rejects.toThrow(/429/);
  });
});
