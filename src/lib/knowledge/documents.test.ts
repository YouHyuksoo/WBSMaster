/**
 * @file src/lib/knowledge/documents.test.ts
 * @description 원본 링크 위조·교차 프로젝트 응답과 서버 중계 계약을 검증합니다.
 * 초보자 가이드: 네트워크 대역만 사용하며 실제 문서에 접근하지 않습니다.
 */
import { afterEach, expect, it, vi } from "vitest";
import { listKnowledgeDocuments, knowledgeOriginal } from "./documents";
import { searchKnowledge } from "./client";
const config = { baseUrl: "http://fixture.test", sourceId: "eval", key: "fixture" };
const row = { kind: "document", project: "wbs_4_eval_p1", documentId: "doc1", versionId: "v1", originalUrl: "https://foreign.test" };
afterEach(() => vi.unstubAllGlobals());
it("원본 링크는 upstream URL 대신 인증되는 WBS 주소로 만든다", async () => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => ({ project: row.project, documents: [row] }) }));
  expect((await listKnowledgeDocuments(config, "p1"))[0].originalUrl).toBe("/api/knowledge/documents/doc1/original?projectId=p1&versionId=v1");
});
it("다른 프로젝트나 경로 탈출 문서 응답은 차단한다", async () => {
  const fetcher = vi.fn(); vi.stubGlobal("fetch", fetcher);
  for (const invalid of [{ ...row, project: "other" }, { ...row, documentId: "../private" }]) {
    fetcher.mockResolvedValue({ ok: true, json: async () => ({ project: row.project, documents: [invalid] }) });
    await expect(listKnowledgeDocuments(config, "p1")).rejects.toThrow();
  }
});
it("검색 문서에도 서버가 원본 링크를 붙인다", async () => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => ({ project: row.project, records: [row], relations: [], degraded: [] }) }));
  expect((await searchKnowledge(config, "p1", "문서" )).records[0].originalUrl).toContain("/api/knowledge/documents/doc1/original?");
});
it("원본은 서버가 만든 범위로 요청하며 key와 upstream 헤더를 노출하지 않는다", async () => {
  const fetcher = vi.fn().mockResolvedValue(new Response("fixture bytes", { headers: { "Content-Disposition": "attachment; filename=fixture.txt", "X-Knowledge-Key": "fixture" } }));
  vi.stubGlobal("fetch", fetcher);
  const response = await knowledgeOriginal(config, "p1", "doc1", "v1");
  expect(await response.text()).toBe("fixture bytes");
  expect(response.headers.get("X-Knowledge-Key")).toBeNull();
  expect(response.headers.get("Cache-Control")).toContain("no-store");
  expect(JSON.parse(fetcher.mock.calls[0][1].body)).toMatchObject({ project: "wbs_4_eval_p1", document_id: "doc1" });
  expect(fetcher.mock.calls[0][1].redirect).toBe("error");
});
