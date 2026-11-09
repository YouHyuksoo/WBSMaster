/**
 * @file src/lib/chat-agent/context.test.ts
 * @description
 * 최근 대화 맥락 로더 테스트입니다. prisma 는 목입니다.
 *
 * 초보자 가이드:
 * - 같은 사용자·프로젝트의 최근 6턴(12메시지)을 오래된 순으로 돌려준다.
 * - 이전 답에 도구 요약이 있으면 "[이전 조회: ...]" 를 앞에 붙여 "그중 ..." 을 이해하게 한다.
 */

import { describe, expect, it, vi } from "vitest";
import { loadConversation } from "./context";

function rows(n: number) {
  // 최신순으로 돌려주는 DB 를 흉내 (createdAt desc)
  return Array.from({ length: n }, (_, i) => {
    const k = n - i;
    return { role: k % 2 ? "user" : "assistant", content: `m${k}`, toolSummary: null as unknown, createdAt: new Date(2026, 10, 9, 0, k) };
  });
}

describe("loadConversation", () => {
  it("returns last 6 turns oldest first", async () => {
    const findMany = vi.fn(async () => rows(12));
    const msgs = await loadConversation({ chatHistory: { findMany } } as never, "u1", "p1");
    expect(msgs).toHaveLength(12);
    expect(msgs[0].content).toBe("m1");
    expect(msgs[11].content).toBe("m12");
    expect((findMany.mock.calls[0] as unknown as [{ take: number }])[0].take).toBe(12);
  });

  it("scopes by user and project", async () => {
    const findMany = vi.fn(async () => []);
    await loadConversation({ chatHistory: { findMany } } as never, "u1", "p1");
    expect((findMany.mock.calls[0] as unknown as [{ where: unknown }])[0].where).toEqual({ userId: "u1", projectId: "p1" });
  });

  it("prepends tool summary", async () => {
    const findMany = vi.fn(async () => [
      { role: "assistant", content: "열린 이슈는 6건입니다.", toolSummary: [{ tool: "list_issues", summary: "이슈 6건: ISS-008, ISS-010" }], createdAt: new Date() },
      { role: "user", content: "열린 이슈 보여줘", toolSummary: null, createdAt: new Date(Date.now() - 1000) },
    ]);
    const msgs = await loadConversation({ chatHistory: { findMany } } as never, "u1", "p1");
    expect(msgs[1].content.startsWith("[이전 조회: 이슈 6건: ISS-008, ISS-010]")).toBe(true);
    expect(msgs[1].role).toBe("assistant");
  });

  it("truncates long assistant content to 1500 chars", async () => {
    const findMany = vi.fn(async () => [{ role: "assistant", content: "가".repeat(3000), toolSummary: null, createdAt: new Date() }]);
    const msgs = await loadConversation({ chatHistory: { findMany } } as never, "u1", "p1");
    expect(msgs[0].content.length).toBeLessThanOrEqual(1501);
  });
});
