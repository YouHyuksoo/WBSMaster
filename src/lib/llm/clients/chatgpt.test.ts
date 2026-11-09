/**
 * @file src/lib/llm/clients/chatgpt.test.ts
 * @description
 * 회사 ChatGPT(Codex Responses API) 클라이언트 테스트입니다. 응답은 프로브로 받은 실제 원문(__fixtures__/chatgpt-*.txt)만 씁니다.
 *
 * 초보자 가이드:
 * - a: 텍스트 답, b: 도구 호출(get_weather), c: 도구 결과 후 답. 계정 ID 는 <ACCOUNT_ID> 로 가려져 있다.
 * - 원문 파일 첫 두 줄(# status, # request)은 프로브가 붙인 설명이라 응답 본문에서 뺀다.
 */

import { afterEach, describe, expect, it, vi } from "vitest";
import fs from "fs";
import path from "path";

vi.mock("../chatgpt/token-store", async (orig) => {
  const actual = await orig<typeof import("../chatgpt/token-store")>();
  return { ...actual, getValidAccessToken: vi.fn(async () => ({ accessToken: "tok", accountId: "acc-1" })) };
});

import { ChatGptClient } from "./chatgpt";
import { ChatGptAuthError } from "../chatgpt/token-store";

const fixture = (name: string) =>
  fs.readFileSync(path.join(__dirname, "__fixtures__", `chatgpt-${name}.txt`), "utf8").split("\n").slice(2).join("\n");

function mockFetch(body: string, status = 200) {
  const f = vi.fn(async () => new Response(body, { status, headers: { "content-type": "text/event-stream" } }));
  vi.stubGlobal("fetch", f);
  return f;
}
const reqOf = (f: ReturnType<typeof vi.fn>) => {
  const [url, init] = f.mock.calls[0] as unknown as [string, RequestInit];
  return { url, headers: init.headers as Record<string, string>, body: JSON.parse(init.body as string) };
};

const client = () => new ChatGptClient({ provider: "chatgpt", apiKey: "", model: "gpt-6.1-sol" });
const weather = { name: "get_weather", description: "날씨", parameters: { type: "object", properties: { city: { type: "string" } } } };

afterEach(() => vi.unstubAllGlobals());

describe("ChatGptClient", () => {
  it("maps messages to Responses input and parses function_call", async () => {
    const f = mockFetch(fixture("b"));
    const turn = await client().chatWithTools(
      [{ role: "system", content: "한국어로 짧게 답한다." }, { role: "user", content: "서울 날씨 알려줘" }],
      [weather]
    );
    expect(turn.type).toBe("tool_calls");
    if (turn.type === "tool_calls") {
      expect(turn.calls).toHaveLength(1);
      expect(turn.calls[0].name).toBe("get_weather");
      expect(JSON.parse(turn.calls[0].arguments)).toEqual({ city: "서울" });
      expect(turn.calls[0].id).toMatch(/^call_/);
    }
    const r = reqOf(f);
    expect(r.url).toBe("https://chatgpt.com/backend-api/codex/responses");
    expect(r.headers.Authorization).toBe("Bearer tok");
    expect(r.headers["chatgpt-account-id"]).toBe("acc-1");
    expect(r.body).toMatchObject({ model: "gpt-6.1-sol", instructions: "한국어로 짧게 답한다.", store: false, stream: true, tool_choice: "auto", parallel_tool_calls: false });
    expect(r.body.input).toEqual([{ type: "message", role: "user", content: [{ type: "input_text", text: "서울 날씨 알려줘" }] }]);
    expect(r.body.tools).toEqual([{ type: "function", ...weather }]);
  });

  it("parses text answer", async () => {
    mockFetch(fixture("a"));
    await expect(client().generate("1+1은?", "한국어로 짧게 답한다.")).resolves.toBe("2입니다.");
  });

  it("serializes tool call history and parses final text", async () => {
    const f = mockFetch(fixture("c"));
    const turn = await client().chatWithTools(
      [
        { role: "user", content: "서울 날씨 알려줘" },
        { role: "assistant", content: "", toolCalls: [{ id: "call_1", name: "get_weather", arguments: "{\"city\":\"서울\"}" }] },
        { role: "tool", toolCallId: "call_1", content: "{\"temp\":12}" },
        { role: "assistant", content: "이전 답" },
      ],
      [weather]
    );
    expect(turn).toEqual({ type: "text", content: expect.stringContaining("12") });
    const input = reqOf(f).body.input;
    expect(input[1]).toEqual({ type: "function_call", call_id: "call_1", name: "get_weather", arguments: "{\"city\":\"서울\"}" });
    expect(input[2]).toEqual({ type: "function_call_output", call_id: "call_1", output: "{\"temp\":12}" });
    expect(input[3]).toEqual({ type: "message", role: "assistant", content: [{ type: "output_text", text: "이전 답" }] });
  });

  it("supportsTools", () => {
    expect(client().supportsTools).toBe(true);
  });

  it("429 throws with status", async () => {
    mockFetch("{\"error\":\"rate\"}", 429);
    await expect(client().generate("q")).rejects.toThrow(/429/);
  });

  it("401 → RELOGIN_REQUIRED", async () => {
    mockFetch("{\"error\":\"unauthorized\"}", 401);
    const err = await client().generate("q").catch((e) => e);
    expect(err).toBeInstanceOf(ChatGptAuthError);
    expect(err.code).toBe("RELOGIN_REQUIRED");
  });
});
