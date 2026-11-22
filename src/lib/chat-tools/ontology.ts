/**
 * @file src/lib/chat-tools/ontology.ts
 * @description 지성지식관리 온톨로지(업무 사전)를 쓰는 채팅 도구 4개입니다.
 * 초보자 가이드:
 * - resolve_ontology_terms: 질문 속 말을 사전 이름(개념 · 속성 · 값 코드 · 관계)으로 바꾸고, 조회 조건에 쓸 이름표를 준다.
 * - query_ontology: 개념과 조건으로 WBS DB 를 조회한다. 지식 서버가 사전 대응을 보고 SQL 을 만든다(읽기 전용).
 * - traverse_ontology_relations: 고른 행에서 사전의 관계를 따라 이어진 행을 찾는다.
 * - check_ontology_rules: 승인된 규칙을 어긴 데이터를 찾는다(규칙 검사).
 * - 프로젝트는 서버가 정한다(ctx.projectId). 인자에 넣으면 거절한다.
 */
import { obj, optString } from "./args";
import type { ChatTool } from "./types";
import { knowledgeConfig } from "@/lib/knowledge/config";
import {
  checkOntologyRules, getOntologyDictionary, queryOntology, resolveOntology, traverseOntology,
} from "@/lib/knowledge/ontology";
import { conceptSchemas, DATA_NOTE, elementId, flatRecord, idList, onlyKeys, ontologyError } from "./ontology-format";

const NO_CONFIG = { kind: "error" as const, message: "지식관리 연결이 설정되지 않았습니다. 업무 DB 도구를 사용하세요." };
const CONDITION_HELP = "조건(where)은 {\"op\":\"compare\",\"attribute\":속성id,\"operator\":eq|ne|in|not_in|lt|le|gt|ge|between|is_empty|not_empty,\"value\":값} · "
  + "{\"op\":\"relation_count\",\"relation\":관계id,\"direction\":out|in,\"operator\":eq|ne|lt|le|gt|ge,\"value\":숫자} · "
  + "{\"op\":\"all\"|\"any\",\"items\":[...]} · {\"op\":\"not\",\"item\":...} 만 쓴다. 값 목록이 있는 속성은 공통 값 code 를 쓴다.";

export const resolveOntologyTermsTool: ChatTool<{ question: string }> = {
  name: "resolve_ontology_terms",
  description: "질문 속 업무 용어를 업무 사전(온톨로지)의 이름으로 바꾼다. 맞은 개념마다 속성 id · 값 코드 · 관계 id · 규칙 id 를 돌려주므로 query_ontology · traverse_ontology_relations · check_ontology_rules 를 쓰기 전에 먼저 부른다.",
  kind: "read",
  parameters: { type: "object", properties: { question: { type: "string", maxLength: 2000 } }, required: ["question"], additionalProperties: false },
  parse(value) {
    const args = obj(value); onlyKeys(args, ["question"]);
    const question = optString(args.question);
    if (!question || question.length > 2000) throw new Error("질문은 1~2000자로 입력해 주세요.");
    return { question };
  },
  async execute(_ctx, { question }) {
    const config = knowledgeConfig(); if (!config) return NO_CONFIG;
    try {
      const [resolved, dict] = await Promise.all([resolveOntology(config, question), getOntologyDictionary(config)]);
      const byId = new Map(dict.elements.map((e) => [e.id, e]));
      const concepts = new Set<string>();
      for (const m of resolved.matches) {
        if (m.kind === "concept") concepts.add(m.id);
        for (const id of [m.id, ...(m.attributes ?? [])]) {
          const e = byId.get(id);
          if (e?.concept) concepts.add(e.concept);
          if (e?.from_concept) concepts.add(e.from_concept);
          if (e?.to_concept) concepts.add(e.to_concept);
        }
      }
      const all = dict.elements.filter((e) => e.kind === "concept").map((e) => `${e.id}(${e.labels?.ko ?? e.id})`);
      if (!concepts.size) {
        return { kind: "data", summary: `사전에서 맞는 용어를 찾지 못했습니다. 사전의 개념: ${all.join(", ")}. 이 중 맞는 개념이 없으면 온톨로지 도구 대신 list_* 도구를 쓴다.`, rows: [] };
      }
      const matches = resolved.matches.map((m) => m.kind === "value" ? `${m.label}=값 ${m.code}(${(m.attributes ?? []).join("/")})` : `${m.label}=${m.kind} ${m.id}`);
      return { kind: "data", summary: `사전 버전 ${dict.version}. 맞은 말: ${matches.join(", ")}. 아래 이름표의 id 와 값 code 로 조회 조건을 만든다. ${CONDITION_HELP}`,
        rows: conceptSchemas(dict, [...concepts]) };
    } catch (error) { return ontologyError(error); }
  },
};

type QueryArgs = { concept: string; where?: Record<string, unknown>; attributes?: string[]; limit: number };
export const queryOntologyTool: ChatTool<QueryArgs> = {
  name: "query_ontology",
  description: `업무 사전의 개념(예: work_package)과 조건으로 현재 프로젝트의 WBS 데이터를 조회한다. 지식 서버가 사전 대응을 보고 읽기 전용 SQL 을 만든다. 이름과 값 코드는 resolve_ontology_terms 로 먼저 확인한다. ${CONDITION_HELP}`,
  kind: "read",
  parameters: { type: "object", properties: {
    concept: { type: "string" }, where: { type: "object" },
    attributes: { type: "array", items: { type: "string" }, maxItems: 50 }, limit: { type: "integer", minimum: 1, maximum: 200 },
  }, required: ["concept"], additionalProperties: false },
  parse(value) {
    const args = obj(value); onlyKeys(args, ["concept", "where", "attributes", "limit"]);
    if (args.where !== undefined && (typeof args.where !== "object" || args.where === null || Array.isArray(args.where))) throw new Error("where 는 조건 객체여야 합니다.");
    const limit = typeof args.limit === "number" ? Math.min(Math.max(Math.floor(args.limit), 1), 200) : 50;
    return { concept: elementId(args.concept, "concept"), where: args.where as Record<string, unknown> | undefined, attributes: idList(args.attributes, "attributes", 50), limit };
  },
  async execute(ctx, { concept, where, attributes, limit }) {
    const config = knowledgeConfig(); if (!config) return NO_CONFIG;
    try {
      const result = await queryOntology(config, ctx.projectId, { concept, ...(where ? { where } : {}), ...(attributes ? { attributes } : {}) });
      const rows = result.records.slice(0, limit).map(flatRecord);
      const cut = result.truncated ? " (원본 최대 행 수에서 잘림)" : "";
      return { kind: "data", summary: `온톨로지 조회 ${result.records.length}건${cut}, ${rows.length}건 표시. 값은 공통 값 이름으로 말한다. ${DATA_NOTE}`, rows };
    } catch (error) { return ontologyError(error); }
  },
};

type TraverseArgs = { concept: string; keys: string[]; relations?: [string, "out" | "in"][]; depth: number };
export const traverseOntologyRelationsTool: ChatTool<TraverseArgs> = {
  name: "traverse_ontology_relations",
  description: "query_ontology 로 찾은 행(key)에서 업무 사전의 관계를 따라 이어진 행을 찾는다(예: 작업 분류 항목 → 상위 항목 · 담당자). relations 를 비우면 따라갈 수 있는 관계를 모두 쓴다. depth 는 1~3.",
  kind: "read",
  parameters: { type: "object", properties: {
    concept: { type: "string" }, keys: { type: "array", items: { type: "string" }, minItems: 1, maxItems: 50 },
    relations: { type: "array", items: { type: "object", properties: { relation: { type: "string" }, direction: { type: "string", enum: ["out", "in"] } }, required: ["relation"], additionalProperties: false } },
    depth: { type: "integer", minimum: 1, maximum: 3 },
  }, required: ["concept", "keys"], additionalProperties: false },
  parse(value) {
    const args = obj(value); onlyKeys(args, ["concept", "keys", "relations", "depth"]);
    if (!Array.isArray(args.keys) || !args.keys.length || args.keys.length > 50 || !args.keys.every((k) => typeof k === "string" && k.length <= 200)) {
      throw new Error("keys 는 query_ontology 결과의 key 값 1~50개여야 합니다.");
    }
    let relations: [string, "out" | "in"][] | undefined;
    if (args.relations !== undefined) {
      if (!Array.isArray(args.relations) || args.relations.length > 20) throw new Error("relations 는 20개 이하 목록이어야 합니다.");
      relations = args.relations.map((r) => { const item = obj(r); return [elementId(item.relation, "relation"), item.direction === "in" ? "in" : "out"]; });
    }
    const depth = typeof args.depth === "number" ? Math.min(Math.max(Math.floor(args.depth), 1), 3) : 1;
    return { concept: elementId(args.concept, "concept"), keys: args.keys as string[], relations, depth };
  },
  async execute(ctx, args) {
    const config = knowledgeConfig(); if (!config) return NO_CONFIG;
    try {
      const result = await traverseOntology(config, ctx.projectId, args);
      const nodes = result.nodes.slice(0, 100).map(flatRecord);
      const edges = result.edges.slice(0, 200).map((e) => ({ ...e, evidenceType: "relationship" }));
      return { kind: "data", summary: `이어진 행 ${result.nodes.length}건 · 연결 ${result.edges.length}건${result.truncated ? " (잘림)" : ""}. ${DATA_NOTE}`, rows: [...nodes, ...edges] };
    } catch (error) { return ontologyError(error); }
  },
};

const STATUS_KO: Record<string, string> = { checked: "검사함", skipped: "검사 안 함" };
export const checkOntologyRulesTool: ChatTool<{ rules?: string[] }> = {
  name: "check_ontology_rules",
  description: "업무 사전의 승인된 규칙(필수 값 · 유일성 · 개수 · 허용값 등)을 현재 프로젝트 WBS 데이터에 적용해 규칙을 어긴 행을 찾는다. rules 를 비우면 모든 검사 규칙을 쓴다. 규칙 id 는 resolve_ontology_terms 결과의 rules 에 있다.",
  kind: "read",
  parameters: { type: "object", properties: { rules: { type: "array", items: { type: "string" }, maxItems: 50 } }, additionalProperties: false },
  parse(value) { const args = obj(value); onlyKeys(args, ["rules"]); return { rules: idList(args.rules, "rules", 50) }; },
  async execute(ctx, { rules }) {
    const config = knowledgeConfig(); if (!config) return NO_CONFIG;
    try {
      const result = await checkOntologyRules(config, ctx.projectId, rules);
      const checked = result.results.filter((r) => r.status === "checked");
      const broken = checked.filter((r) => (r.count ?? 0) > 0);
      const rows = result.results.map((r) => ({
        규칙: r.label ?? r.rule, rule: r.rule, 결과: STATUS_KO[r.status] ?? r.status, 어긴행수: r.count ?? null,
        ...(r.truncated ? { 잘림: true } : {}), ...(r.reason ? { 이유: r.reason } : {}),
        ...(r.violations?.length ? { 어긴행: r.violations.slice(0, 20).map(flatRecord) } : {}),
      }));
      return { kind: "data", summary: `규칙 ${result.results.length}개 중 ${checked.length}개 검사, 어긴 규칙 ${broken.length}개. 검사 안 함은 위반 없음이 아니다. ${DATA_NOTE}`, rows };
    } catch (error) { return ontologyError(error); }
  },
};

export const ONTOLOGY_TOOLS = [resolveOntologyTermsTool, queryOntologyTool, traverseOntologyRelationsTool, checkOntologyRulesTool];
