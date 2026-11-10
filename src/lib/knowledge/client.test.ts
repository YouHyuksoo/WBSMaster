/**
 * @file src/lib/knowledge/client.test.ts
 * @description 외부 서버 없이 지식 수집 확인 응답·프로젝트 격리를 검증합니다.
 * 초보자 가이드: fetch 대역만 사용하며 실제 API 키나 데이터는 읽지 않습니다.
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import { knowledgeConfig, knowledgeProject } from "./config";
import { searchKnowledge, sendKnowledgeEvent } from "./client";

const config = { baseUrl: "http://fixture.test", sourceId: "eval", key: "fixture-key" };
afterEach(() => vi.unstubAllGlobals());

describe("지식 연결", () => {
  it("부분 설정과 인증정보 포함 URL은 거절한다", () => {
    expect(knowledgeConfig({})).toBeNull();
    expect(() => knowledgeConfig({ KNOWLEDGE_API_URL: "http://fixture.test" })).toThrow();
    expect(() => knowledgeConfig({ KNOWLEDGE_API_URL: "http://user:fixture@fixture.test", KNOWLEDGE_SOURCE_ID: "eval", KNOWLEDGE_API_KEY: "fixture" })).toThrow();
    expect(knowledgeProject(config, "p1")).toBe("wbs_4_eval_p1");
  });
  it("프로젝트는 서버 설정에서 만들고 수집 확인을 대조한다", async () => {
    const fetcher = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ project: "wbs_4_eval_p1", revision: "5", status: "applied" }) });
    vi.stubGlobal("fetch", fetcher);
    await sendKnowledgeEvent(config, { id: "5", projectId: "p1", model: "issues", recordId: "i1", operation: "delete", payload: {} });
    const sent = JSON.parse(fetcher.mock.calls[0][1].body);
    expect(sent).toMatchObject({ project: "wbs_4_eval_p1", external_project: "p1", revision: "5" });
    fetcher.mockResolvedValue({ ok: true, json: async () => ({ project: "other", revision: "5", status: "applied" }) });
    await expect(sendKnowledgeEvent(config, { id: "5", projectId: "p1", model: "issues", recordId: "i1", operation: "delete", payload: {} })).rejects.toThrow();
  });
  it("다른 프로젝트의 검색 결과·관계는 거절한다", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => ({
      project: "wbs_4_eval_p1", records: [], relations: [{ project: "other" }], degraded: [],
    }) }));
    await expect(searchKnowledge(config, "p1", "관련 업무")).rejects.toThrow(/다른 프로젝트/);
  });
  it("실패 응답 본문은 오류에 노출하지 않는다", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 503, text: async () => "fixture-sensitive-body" }));
    await expect(searchKnowledge(config, "p1", "질문")).rejects.toThrow("지식 서버 요청 실패 (HTTP 503)");
  });
});
