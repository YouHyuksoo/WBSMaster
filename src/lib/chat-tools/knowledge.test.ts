/**
 * @file src/lib/chat-tools/knowledge.test.ts
 * @description 채팅에서 프로젝트를 강제하고 검색 실패·동기화 지연을 표시하는지 검증합니다.
 * 초보자 가이드: 검색/DB는 대역으로 주입하므로 실제 시스템에 접속하지 않습니다.
 */
import { afterEach, expect, it, vi } from "vitest";
import { searchKnowledgeTool } from "./knowledge";
import type { ToolContext } from "./types";
import { searchKnowledge } from "@/lib/knowledge/client";
vi.mock("@/lib/knowledge/client", () => ({ searchKnowledge: vi.fn() }));
const ctx = { projectId: "p1", prisma: { $queryRaw: vi.fn().mockResolvedValue([{ count: BigInt(2) }]) } } as unknown as ToolContext;
afterEach(() => { vi.unstubAllEnvs(); vi.clearAllMocks(); });
it("지식 조회는 서버 프로젝트를 사용하고 지연 상태를 전달한다", async () => {
  vi.stubEnv("KNOWLEDGE_API_URL", "http://fixture.test"); vi.stubEnv("KNOWLEDGE_SOURCE_ID", "eval"); vi.stubEnv("KNOWLEDGE_API_KEY", "fixture");
  vi.mocked(searchKnowledge).mockResolvedValue({ project: "wbs_4_eval_p1", records: [{ project: "wbs_4_eval_p1", name: "근거" }], relations: [], degraded: ["semantic_search_unavailable"] });
  const result = await searchKnowledgeTool.execute(ctx, { question: "관련 업무" });
  expect(searchKnowledge).toHaveBeenCalledWith(expect.anything(), "p1", "관련 업무");
  expect(result).toMatchObject({ kind: "data", summary: expect.stringContaining("동기화 대기 2건") });
});
it("검색 실패를 확인된 결과처럼 응답하지 않는다", async () => {
  vi.stubEnv("KNOWLEDGE_API_URL", "http://fixture.test"); vi.stubEnv("KNOWLEDGE_SOURCE_ID", "eval"); vi.stubEnv("KNOWLEDGE_API_KEY", "fixture");
  vi.mocked(searchKnowledge).mockRejectedValue(new Error("fixture offline"));
  expect(await searchKnowledgeTool.execute(ctx, { question: "질문" })).toMatchObject({ kind: "error" });
});
