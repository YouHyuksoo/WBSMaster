/**
 * @file src/app/api/chat/route.test.ts
 * @description
 * 채팅 API 가 도구 호출을 지원하는 제공자는 에이전트로, 아니면 기존 파이프라인으로 보내는지 확인합니다.
 *
 * 초보자 가이드:
 * - projectId 가 있으면 프로젝트 멤버만 (assertProjectAccess)
 * - AI 설정이 없는 사용자는 회사 ChatGPT(기본)로 처리한다
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

const st = vi.hoisted(() => ({ supportsTools: true, denied: null as Response | null, settings: null as Record<string, unknown> | null }));
vi.mock("@/lib/auth", () => ({
  requireAuth: vi.fn(async () => ({ user: { id: "u1", email: "u@x", role: "USER" }, error: null })),
  assertProjectAccess: vi.fn(async () => st.denied),
}));
const db = vi.hoisted(() => ({
  aiSetting: { findUnique: vi.fn(async () => st.settings) },
  aiPersona: { findFirst: vi.fn(async () => null) },
  chatHistory: { create: vi.fn(async ({ data }: { data: Record<string, unknown> }) => ({ id: "h1", ...data })) },
}));
vi.mock("@/lib/prisma", () => ({ prisma: db }));
const llm = vi.hoisted(() => ({
  resolveLLMConfig: vi.fn((s: { provider: string }) => ({ ok: true, config: { provider: s.provider, apiKey: "", model: "m" } })),
  createLLMClient: vi.fn(() => ({ supportsTools: st.supportsTools })),
  processChatMessage: vi.fn(async () => ({ content: "레거시 답" })),
}));
vi.mock("@/lib/llm", () => llm);
const agent = vi.hoisted(() => ({ answerWithAgent: vi.fn(async () => ({ id: "h-a", role: "assistant", content: "에이전트 답", pendingAction: { id: "act-1" } })) }));
vi.mock("@/lib/chat-agent/handle-agent-chat", () => agent);
vi.mock("@/lib/llm/safe-sql", () => ({ runSafeSql: vi.fn() }));

import { POST } from "./route";

const post = (body: Record<string, unknown>) => POST(new Request("http://x/api/chat", { method: "POST", body: JSON.stringify(body) }) as never);

beforeEach(() => {
  vi.clearAllMocks();
  st.supportsTools = true;
  st.denied = null;
  st.settings = { provider: "openai", sqlSystemPrompt: null, analysisSystemPrompt: null };
});

describe("POST /api/chat", () => {
  it("uses agent when client.supportsTools", async () => {
    const res = await post({ message: "열린 이슈", projectId: "p1" });
    expect(await res.json()).toMatchObject({ content: "에이전트 답", pendingAction: { id: "act-1" } });
    expect(llm.processChatMessage).not.toHaveBeenCalled();
  });

  it("uses legacy pipeline otherwise", async () => {
    st.supportsTools = false;
    const res = await post({ message: "열린 이슈", projectId: "p1" });
    expect((await res.json()).content).toBe("레거시 답");
    expect(agent.answerWithAgent).not.toHaveBeenCalled();
  });

  it("requires project access when projectId given", async () => {
    st.denied = new Response("{}", { status: 403 });
    expect((await post({ message: "x", projectId: "p2" })).status).toBe(403);
    expect(agent.answerWithAgent).not.toHaveBeenCalled();
  });

  it("no ai settings → company chatgpt default", async () => {
    st.settings = null;
    await post({ message: "열린 이슈", projectId: "p1" });
    expect(llm.resolveLLMConfig.mock.calls[0][0]).toMatchObject({ provider: "chatgpt" });
    expect(agent.answerWithAgent).toHaveBeenCalled();
  });
});
