/**
 * @file src/app/api/knowledge/documents/route.test.ts
 * @description 목록·원본 라우트가 사용자와 프로젝트 권한부터 확인하는지 검증합니다.
 * 초보자 가이드: 인증과 지식 서버를 대역으로 처리합니다.
 */
import { afterEach, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { requireAuth, assertProjectAccess } from "@/lib/auth";
import { listKnowledgeDocuments, knowledgeOriginal } from "@/lib/knowledge/documents";
import { GET as list } from "./route";
import { GET as original } from "./[documentId]/original/route";
vi.mock("@/lib/auth", () => ({ requireAuth: vi.fn(), assertProjectAccess: vi.fn() }));
vi.mock("@/lib/knowledge/documents", () => ({ listKnowledgeDocuments: vi.fn(), knowledgeOriginal: vi.fn() }));
const request = () => new NextRequest("http://fixture.test/api/knowledge/documents?projectId=p1&versionId=v1");
const params = () => ({ params: Promise.resolve({ documentId: "doc1" }) });
afterEach(() => { vi.resetAllMocks(); vi.unstubAllEnvs(); });
it("로그인하지 않으면 목록과 원본 요청이 서버에 도달하지 않는다", async () => {
  vi.mocked(requireAuth).mockResolvedValue({ user: null, error: new Response("denied", { status: 401 }) } as never);
  expect((await list(request())).status).toBe(401);
  expect((await original(request(), params())).status).toBe(401);
  expect(listKnowledgeDocuments).not.toHaveBeenCalled(); expect(knowledgeOriginal).not.toHaveBeenCalled();
});
it("다른 프로젝트 접근이 거절되면 목록과 원본 모두 조회하지 않는다", async () => {
  vi.mocked(requireAuth).mockResolvedValue({ user: { id: "fixture" }, error: null } as never);
  vi.mocked(assertProjectAccess).mockResolvedValue(new Response("denied", { status: 403 }) as never);
  expect((await list(request())).status).toBe(403);
  expect((await original(request(), params())).status).toBe(403);
  expect(listKnowledgeDocuments).not.toHaveBeenCalled(); expect(knowledgeOriginal).not.toHaveBeenCalled();
});
it("권한이 확인된 프로젝트와 문서 식별자로만 중계한다", async () => {
  vi.mocked(requireAuth).mockResolvedValue({ user: { id: "fixture" }, error: null } as never);
  vi.mocked(assertProjectAccess).mockResolvedValue(null);
  vi.stubEnv("KNOWLEDGE_API_URL", "http://fixture.test"); vi.stubEnv("KNOWLEDGE_SOURCE_ID", "eval"); vi.stubEnv("KNOWLEDGE_API_KEY", "fixture");
  vi.mocked(listKnowledgeDocuments).mockResolvedValue([]);
  vi.mocked(knowledgeOriginal).mockResolvedValue(new Response("fixture bytes"));
  expect(await (await list(request())).json()).toEqual({ documents: [] });
  expect(await (await original(request(), params())).text()).toBe("fixture bytes");
  expect(knowledgeOriginal).toHaveBeenCalledWith(expect.anything(), "p1", "doc1", "v1");
});
