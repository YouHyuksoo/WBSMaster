/**
 * @file src/lib/chat-agent/answer-sources.ts
 * @description 채팅 답이 무엇을 근거로 만들어졌는지(온톨로지 · 지식 그래프 · 기존 업무 DB 도구) 나눕니다.
 * 초보자 가이드:
 * - 답에 저장된 toolSummary(실제로 결과를 돌려준 도구 이름)로 정한다. 실패한 도구는 toolSummary 에 없다.
 * - 온톨로지: 지성지식관리 업무 사전으로 WBS DB 를 조회 · 관계 탐색 · 규칙 검사한 답.
 * - 지식 그래프: search_knowledge(임베딩 · 관계 그래프 · 승인 문서) 로 찾은 답.
 * - 업무 DB(기존): list_* · get_record · run_readonly_sql 등 WBSMaster 가 직접 조회한 답.
 * - 에이전트가 아닌 예전 SQL 파이프라인 답(sqlQuery 있음)은 "SQL(기존)" 로 본다.
 */
export type AnswerSource = "ontology" | "graph" | "db" | "sql" | "none";

export const ANSWER_SOURCE_INFO: Record<AnswerSource, { label: string; help: string }> = {
  ontology: { label: "온톨로지로 답함", help: "지성지식관리 업무 사전(승인된 개념 · 관계 · 규칙)으로 WBS DB 를 조회한 결과로 답했습니다." },
  graph: { label: "지식 그래프로 답함", help: "지성지식관리의 의미 검색 · 관계 그래프 · 승인 문서에서 찾은 내용으로 답했습니다." },
  db: { label: "업무 DB로 답함 (기존 방식)", help: "WBSMaster 업무 DB 조회 도구(목록 · 레코드 · 읽기 전용 SQL 등)로 답했습니다." },
  sql: { label: "SQL로 답함 (기존 방식)", help: "질문을 SQL 로 바꿔 업무 DB 를 조회하는 예전 방식으로 답했습니다." },
  none: { label: "도구 없이 답함", help: "조회 도구를 쓰지 않고 답했습니다. 데이터 근거가 없는 답입니다." },
};

const ONTOLOGY_TOOLS = new Set(["resolve_ontology_terms", "query_ontology", "traverse_ontology_relations", "check_ontology_rules"]);
const GRAPH_TOOLS = new Set(["search_knowledge", "list_knowledge_documents"]);

/** 답 하나의 근거 방식들. 순서: 온톨로지 → 지식 그래프 → 업무 DB. 판단할 정보가 없으면 빈 목록(표시 안 함). */
export function answerSources(message: { toolSummary?: { tool: string }[] | null; sqlQuery?: string | null }): AnswerSource[] {
  if (Array.isArray(message.toolSummary)) {
    const tools = message.toolSummary.map((t) => t.tool);
    if (!tools.length) return ["none"];
    const found: AnswerSource[] = [];
    if (tools.some((t) => ONTOLOGY_TOOLS.has(t))) found.push("ontology");
    if (tools.some((t) => GRAPH_TOOLS.has(t))) found.push("graph");
    if (tools.some((t) => !ONTOLOGY_TOOLS.has(t) && !GRAPH_TOOLS.has(t))) found.push("db");
    return found;
  }
  return message.sqlQuery ? ["sql"] : [];
}

/** 온톨로지 도구 이름 목록(도구 등록과 표시가 어긋나지 않게 시험에서 비교한다) */
export const ONTOLOGY_TOOL_NAMES = [...ONTOLOGY_TOOLS];
