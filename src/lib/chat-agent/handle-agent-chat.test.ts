/**
 * @file src/lib/chat-agent/handle-agent-chat.test.ts
 * @description
 * 에이전트 채팅 처리(answerWithAgent) 테스트입니다. prisma · runAgent · 맥락 로더는 목입니다.
 *
 * 초보자 가이드:
 * - 이전 대화는 이번 질문을 저장하기 전에 읽는다 (같은 질문이 맥락에 두 번 들어가지 않게).
 * - 답과 함께 도구 요약(toolSummary)·확인 카드 id(pendingActionId)를 저장한다.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

const order = vi.hoisted(() => [] as string[]);
const db = vi.hoisted(() => ({
  project: { findUnique: vi.fn(async () => ({ name: "오창" })) },
  chatHistory: {
    create: vi.fn(async ({ data }: { data: Record<string, unknown> }) => {
      order.push(`save:${data.role}`);
      return { id: data.role === "assistant" ? "h-a" : "h-u", ...data };
    }),
  },
}));
const agent = vi.hoisted(() => ({
  result: {
    content: "아래 내용으로 진행할까요?", chartType: null, toolSummary: [{ tool: "propose_create_task", summary: "TASK 등록" }],
    pendingAction: { id: "act-1", summary: "TASK 등록", fields: [] }, usedFallback: false,
  } as Record<string, unknown>,
  opts: null as Record<string, unknown> | null,
}));
vi.mock("@/lib/prisma", () => ({ prisma: db }));
vi.mock("./context", () => ({ loadConversation: vi.fn(async () => { order.push("load"); return [{ role: "user", content: "이전 질문" }]; }) }));
vi.mock("./run-agent", () => ({ runAgent: vi.fn(async (o: Record<string, unknown>) => { agent.opts = o; return agent.result; }) }));
vi.mock("@/lib/chat-tools", () => ({}));

import { answerWithAgent } from "./handle-agent-chat";

const user = { id: "u1", email: "u@x", role: "USER" };
const client = { supportsTools: true } as never;

beforeEach(() => {
  order.length = 0;
  vi.clearAllMocks();
});

describe("answerWithAgent", () => {
  it("loads history before saving the new message", async () => {
    await answerWithAgent({ user, projectId: "p1", message: "태스크 등록해줘", client, promptConfig: {} });
    expect(order).toEqual(["load", "save:user", "save:assistant"]);
    expect((agent.opts!.history as unknown[]).length).toBe(1);
  });

  it("persists toolSummary and pendingActionId and returns pendingAction", async () => {
    const res = await answerWithAgent({ user, projectId: "p1", message: "태스크 등록해줘", client, promptConfig: { sqlSystemPrompt: "S" } });
    const saved = db.chatHistory.create.mock.calls[1][0].data;
    expect(saved).toMatchObject({ role: "assistant", pendingActionId: "act-1", toolSummary: [{ tool: "propose_create_task", summary: "TASK 등록" }] });
    expect(res).toMatchObject({ id: "h-a", pendingAction: { id: "act-1" }, usedFallback: false });
    expect((agent.opts!.ctx as Record<string, unknown>).projectId).toBe("p1");
    expect(((agent.opts!.ctx as Record<string, unknown>).promptConfig as Record<string, unknown>).sqlSystemPrompt).toBe("S");
    expect(String(agent.opts!.systemPrompt)).toContain("오창");
  });
});
