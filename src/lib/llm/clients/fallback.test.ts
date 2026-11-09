/**
 * @file src/lib/llm/clients/fallback.test.ts
 * @description
 * 회사 ChatGPT 연결이 끊기거나 한도(429)에 걸리면 대체 제공자로 넘기는 래퍼 테스트입니다.
 *
 * 초보자 가이드:
 * - 대체 제공자가 있으면 usedFallback=true 로 표시하고 그 답을 돌려준다.
 * - 대체 제공자가 없으면 "ChatGPT 연결" 안내가 담긴 오류를 던진다.
 */

import { describe, expect, it } from "vitest";
import { LLMClient } from "../client-base";
import type { ChatMessage, ToolDefinition, ToolTurn } from "../tool-calling";
import { ChatGptAuthError } from "../chatgpt/token-store";
import { FallbackClient } from "./fallback";

class Fake extends LLMClient {
  constructor(private outcome: () => Promise<string>) {
    super({ provider: "openai", apiKey: "", model: "m" });
  }
  get supportsTools() { return true; }
  generate(): Promise<string> { return this.outcome(); }
  async chatWithTools(_m: ChatMessage[], _t: ToolDefinition[]): Promise<ToolTurn> {
    return { type: "text", content: await this.outcome() };
  }
}

const ok = (s: string) => new Fake(async () => s);
const fail = (e: Error) => new Fake(async () => { throw e; });

describe("FallbackClient", () => {
  it.each([
    ["429", new Error("ChatGPT API 오류 (429): rate limit")],
    ["RELOGIN_REQUIRED", new ChatGptAuthError("RELOGIN_REQUIRED", "만료")],
    ["NOT_CONNECTED", new ChatGptAuthError("NOT_CONNECTED", "미연결")],
    ["network", new TypeError("fetch failed")],
  ])("falls back on %s and sets usedFallback", async (_n, err) => {
    const c = new FallbackClient(fail(err), ok("대체 답"));
    await expect(c.generate("q")).resolves.toBe("대체 답");
    expect(c.usedFallback).toBe(true);
  });

  it("primary success keeps usedFallback false", async () => {
    const c = new FallbackClient(ok("본 답"), ok("대체 답"));
    await expect(c.chatWithTools([{ role: "user", content: "q" }], [])).resolves.toEqual({ type: "text", content: "본 답" });
    expect(c.usedFallback).toBe(false);
  });

  it("no fallback configured → rethrows with 안내 메시지", async () => {
    const c = new FallbackClient(fail(new ChatGptAuthError("RELOGIN_REQUIRED", "만료")), null);
    await expect(c.generate("q")).rejects.toThrow(/ChatGPT 연결/);
  });

  it("other errors are not swallowed", async () => {
    const c = new FallbackClient(fail(new Error("400 bad request")), ok("대체 답"));
    await expect(c.generate("q")).rejects.toThrow("400 bad request");
  });
});
