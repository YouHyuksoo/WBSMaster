/**
 * @file src/app/api/to-be/items/[id]/suggest/route.test.ts
 * @description TO-BE AI 제안 API: 권한 검사, AI 설정이 없으면 회사 ChatGPT 사용, 저장 없이 제안만 돌려주는지 확인합니다.
 * 초보자 가이드:
 * - 실제 AI · DB 를 부르지 않는다 (@/lib/llm · @/lib/prisma · 서비스 모두 가짜)
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

const st = vi.hoisted(() => ({ denied: null as Response | null, settings: null as Record<string, unknown> | null }));
vi.mock("@/lib/auth", () => ({
  requireAuth: vi.fn(async () => ({ user: { id: "u1", email: "u@x", role: "USER" }, error: null })),
  assertProjectAccess: vi.fn(async () => st.denied),
}));
vi.mock("@/lib/prisma", () => ({ prisma: { aiSetting: { findUnique: vi.fn(async () => st.settings) } } }));
const llm = vi.hoisted(() => ({
  resolveLLMConfig: vi.fn((s: { provider: string }) => ({ ok: true, config: { provider: s.provider, apiKey: "", model: "m" } })),
  createLLMClient: vi.fn(() => ({ generate: vi.fn(async () => "{}") })),
}));
vi.mock("@/lib/llm", () => llm);
vi.mock("@/lib/to-be/to-be-service", () => ({
  ToBeError: class extends Error { constructor(public status: number, m: string) { super(m); } },
  projectOfItem: vi.fn(async () => "p1"),
}));
const svc = vi.hoisted(() => ({
  loadSuggestContext: vi.fn(async () => ({ projectId: "p1", ctx: { sfrOptions: [] } })),
  suggestToBe: vi.fn(async () => ({ changeType: "IMPROVE", summary: "요약" })),
}));
vi.mock("@/lib/to-be/to-be-suggest", () => svc);

import { POST } from "./route";

const call = () => POST(new Request("http://x", { method: "POST" }) as never, { params: Promise.resolve({ id: "t1" }) });

beforeEach(() => { vi.clearAllMocks(); st.denied = null; st.settings = null; });

describe("TO-BE AI 제안 API", () => {
  it("AI 설정이 없으면 회사 ChatGPT 로 제안을 받아 그대로 돌려준다", async () => {
    const res = await call();
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ suggestion: { changeType: "IMPROVE", summary: "요약" } });
    expect(llm.resolveLLMConfig.mock.calls[0][0]).toMatchObject({ provider: "chatgpt" });
    expect(svc.suggestToBe).toHaveBeenCalledTimes(1);
  });

  it("프로젝트 권한이 없으면 AI 를 부르지 않는다", async () => {
    st.denied = new Response(null, { status: 403 });
    expect((await call()).status).toBe(403);
    expect(llm.createLLMClient).not.toHaveBeenCalled();
  });
});
