/**
 * @file src/lib/chat-tools/registry.test.ts
 * @description
 * 채팅 도구 레지스트리 테스트입니다.
 *
 * 초보자 가이드:
 * - 같은 이름 도구를 두 번 등록하면 오류. definitions() 는 LLM 에 보낼 정의 목록이다.
 */

import { describe, expect, it } from "vitest";
import { ToolRegistry } from "./registry";
import type { ChatTool } from "./types";

const tool = (name: string): ChatTool<Record<string, never>> => ({
  name,
  description: `${name} 설명`,
  parameters: { type: "object", properties: {} },
  kind: "read",
  parse: () => ({}),
  execute: async () => ({ kind: "data", summary: "ok" }),
});

describe("ToolRegistry", () => {
  it("duplicate name throws", () => {
    const r = new ToolRegistry();
    r.register(tool("a"));
    expect(() => r.register(tool("a"))).toThrow(/a/);
  });

  it("definitions returns registered tools", () => {
    const r = new ToolRegistry();
    r.register(tool("a"));
    r.register(tool("b"));
    expect(r.definitions().map((d) => d.name)).toEqual(["a", "b"]);
    expect(r.definitions()[0]).toEqual({ name: "a", description: "a 설명", parameters: { type: "object", properties: {} } });
    expect(r.get("b")?.name).toBe("b");
    expect(r.get("zz")).toBeUndefined();
  });
});
