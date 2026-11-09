/**
 * @file src/app/api/ai-settings/route.test.ts
 * @description
 * AI 설정 API 가 회사 ChatGPT 제공자(chatgpt)와 그 모델을 저장·조회하는지 확인합니다. 인증·prisma 는 목입니다.
 *
 * 초보자 가이드:
 * - 설정이 없는 사용자의 기본 제공자는 chatgpt (회사 계정 공용, 키 없음).
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

const db = vi.hoisted(() => ({
  row: null as Record<string, unknown> | null,
  upsert: vi.fn(),
}));
vi.mock("@/lib/auth", () => ({
  requireAuth: vi.fn(async () => ({ user: { id: "u1", email: "a@x", role: "USER" }, error: null })),
}));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    aiSetting: {
      findUnique: vi.fn(async () => db.row),
      upsert: db.upsert,
    },
  },
}));

import { GET, POST } from "./route";

const base = {
  provider: "chatgpt", chatgptModel: "gpt-6.1-sol",
  geminiApiKey: null, geminiModel: "g", mistralApiKey: null, mistralModel: "m",
  openaiApiKey: null, openaiModel: "o", openrouterApiKey: null, openrouterModel: "r",
  sqlSystemPrompt: null, analysisSystemPrompt: null,
};

beforeEach(() => {
  db.row = null;
  db.upsert.mockReset();
  db.upsert.mockImplementation(async (args: { create: Record<string, unknown> }) => ({ ...base, ...args.create }));
});

describe("/api/ai-settings", () => {
  it("GET default provider is chatgpt", async () => {
    const body = await (await GET()).json();
    expect(body.provider).toBe("chatgpt");
    expect(body.chatgptModel).toBe("gpt-6.1-sol");
  });

  it("GET returns saved chatgptModel", async () => {
    db.row = { ...base, chatgptModel: "gpt-6-luna" };
    expect((await (await GET()).json()).chatgptModel).toBe("gpt-6-luna");
  });

  it("POST accepts chatgpt and saves model", async () => {
    const res = await POST(new Request("http://x", { method: "POST", body: JSON.stringify({ provider: "chatgpt", chatgptModel: "gpt-6-luna" }) }) as never);
    expect(res.status).toBe(200);
    const args = db.upsert.mock.calls[0][0] as { update: Record<string, unknown>; create: Record<string, unknown> };
    expect(args.update).toMatchObject({ provider: "chatgpt", chatgptModel: "gpt-6-luna" });
    expect(args.create).toMatchObject({ provider: "chatgpt", chatgptModel: "gpt-6-luna" });
  });
});
