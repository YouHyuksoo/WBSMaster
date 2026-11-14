/**
 * @file src/app/api/chat/suggestions/route.test.ts
 * @description 제안 생성과 화면의 분류 계약·프로젝트 권한을 검사합니다.
 * 초보자 가이드: DB와 AI는 목으로 대체하며 실제 서비스에 요청하지 않습니다.
 */
import { beforeEach, expect, it, vi } from "vitest";
import { EXAMPLE_GROUPS } from "@/app/dashboard/chat/components/constants";

const mocks = vi.hoisted(() => ({ generate: vi.fn(), denied: null as Response | null, settings: null as object | null }));
vi.mock("@/lib/auth", () => ({
  requireAuth: async () => ({ user: { id: "u1" }, error: null }),
  assertProjectAccess: async () => mocks.denied,
}));
vi.mock("@/lib/prisma", () => ({ prisma: {
  aiSetting: { findFirst: async () => mocks.settings },
  project: { findUnique: async () => ({ name: "검증", _count: { wbsItems: 1, tasks: 0, issues: 0, requirements: 0, fieldIssues: 0, customerRequirements: 0 } }) },
  task: { findMany: async () => [] }, issue: { findMany: async () => [] },
  fieldIssue: { findMany: async () => [] }, customerRequirement: { findMany: async () => [] },
} }));
vi.mock("@/lib/llm", () => ({
  resolveLLMConfig: () => ({ ok: true, config: { provider: "chatgpt" } }),
  createLLMClient: () => ({ generate: mocks.generate }),
}));
import { POST } from "./route";
const post = (body: unknown = { projectId: "p1" }) => POST(new Request("http://localhost/api/chat/suggestions", { method: "POST", body: JSON.stringify(body) }) as never);
beforeEach(() => { vi.clearAllMocks(); mocks.denied = null; mocks.settings = {}; mocks.generate.mockResolvedValue(JSON.stringify(EXAMPLE_GROUPS)); });

it("화면과 같은 모든 분류를 생성·반환한다", async () => {
  const response = await (await post()).json();
  expect(response.source).toBe("ai");
  expect(response.suggestions).toEqual(EXAMPLE_GROUPS);
});
it("설정이 없는 사용자도 채팅과 같은 회사 ChatGPT 기본값을 쓴다", async () => {
  mocks.settings = null;
  expect((await (await post()).json()).source).toBe("ai");
  expect(mocks.generate).toHaveBeenCalledOnce();
});
it("프로젝트 없이 생성하지 않는다", async () => {
  expect((await post({})).status).toBe(400);
  expect(mocks.generate).not.toHaveBeenCalled();
});
it("권한 오류를 기본 제안 성공으로 숨기지 않는다", async () => {
  mocks.denied = new Response("{}", { status: 403 });
  expect((await post()).status).toBe(403);
  expect(mocks.generate).not.toHaveBeenCalled();
});
it("잘못된 질문 원소를 화면으로 보내지 않는다", async () => {
  mocks.generate.mockResolvedValue(JSON.stringify(EXAMPLE_GROUPS.map(g => ({ ...g, questions: [null, {}, 1, ""] }))));
  expect((await (await post()).json()).source).toBe("default");
});
it("생성 장애는 이유를 제공한다", async () => {
  mocks.generate.mockRejectedValue(new Error("provider unavailable"));
  const response = await (await post()).json();
  expect(response.source).toBe("error");
  expect(response.message).toBeTruthy();
});
