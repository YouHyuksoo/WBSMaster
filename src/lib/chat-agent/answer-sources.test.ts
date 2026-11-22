/**
 * @file src/lib/chat-agent/answer-sources.test.ts
 * @description 답의 근거 방식(온톨로지 · 지식 그래프 · 업무 DB)을 실제로 쓴 도구로 나누는지 검증합니다.
 * 초보자 가이드: 도구 이름만 보는 순수 함수라 외부 접속이 없습니다.
 */
import { expect, it } from "vitest";
import { answerSources, ONTOLOGY_TOOL_NAMES } from "./answer-sources";
import { ONTOLOGY_TOOLS } from "@/lib/chat-tools/ontology";

it("쓴 도구로 근거 방식을 나눈다", () => {
  expect(answerSources({ toolSummary: [{ tool: "resolve_ontology_terms" }, { tool: "query_ontology" }] })).toEqual(["ontology"]);
  expect(answerSources({ toolSummary: [{ tool: "search_knowledge" }, { tool: "list_issues" }] })).toEqual(["graph", "db"]);
  expect(answerSources({ toolSummary: [] })).toEqual(["none"]);
  expect(answerSources({ toolSummary: null, sqlQuery: "SELECT 1" })).toEqual(["sql"]);
  expect(answerSources({})).toEqual([]);
});

it("온톨로지 도구를 새로 등록하면 표시 목록에도 들어 있어야 한다", () => {
  expect(ONTOLOGY_TOOL_NAMES.sort()).toEqual(ONTOLOGY_TOOLS.map((t) => t.name).sort());
});
