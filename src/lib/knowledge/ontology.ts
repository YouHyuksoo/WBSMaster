/**
 * @file src/lib/knowledge/ontology.ts
 * @description 지성지식관리 온톨로지(업무 사전) API 클라이언트입니다.
 * 초보자 가이드:
 * - 사전은 "업무 개념 · 속성 · 관계 · 규칙"과 그것이 WBS DB 의 어느 표 · 칸인지(대응)를 담습니다. 지식관리에서 관리자가 승인한 것만 씁니다.
 * - 조회 · 관계 따라가기 · 규칙 검사는 지식 서버가 사전을 보고 SQL 을 만들어 WBS DB 를 읽기 전용으로 읽습니다. 이 앱은 SQL 을 만들지 않습니다.
 * - 프로젝트 범위(project · source_id · external_project)는 서버 설정과 현재 프로젝트로만 만듭니다. LLM 인자로 받지 않습니다.
 * - 원본 이름은 KNOWLEDGE_ONTOLOGY_SOURCE(기본 "wbs")입니다.
 * - 422 응답의 이유(없는 사전 이름, 없는 값 코드 등)만 돌려주고, 다른 오류 본문 · 자격증명은 남기지 않습니다.
 */
import { knowledgeProject, type KnowledgeConfig } from "./config";

export class OntologyRequestError extends Error {
  constructor(public readonly status: number, message: string, public readonly reasons: string[] = []) { super(message); }
}

export interface OntologyElement {
  id: string; kind: string; labels?: Record<string, string>; synonyms?: Record<string, string[]>;
  concept?: string; datatype?: string; value_set?: string | null; from_concept?: string; to_concept?: string;
  target?: string; values?: { code: string; labels?: Record<string, string> }[];
}
export interface OntologyDictionary { version: number; elements: OntologyElement[] }
export interface OntologyRecord {
  concept: string; concept_label?: string; key: Record<string, unknown>;
  attributes: Record<string, { label?: string; value?: unknown; value_label?: string; masked?: boolean }>;
}

export function ontologySource(env: Record<string, string | undefined> = process.env): string {
  const source = env.KNOWLEDGE_ONTOLOGY_SOURCE?.trim() || "wbs";
  if (!/^[a-z][a-z0-9_]{0,47}$/.test(source)) throw new Error("KNOWLEDGE_ONTOLOGY_SOURCE 형식이 잘못됐습니다.");
  return source;
}

/** 현재 프로젝트의 조회 범위. 지식 서버가 project 와 source_id · external_project 가 맞는지 다시 확인한다. */
export function ontologyScope(config: KnowledgeConfig, projectId: string, env: Record<string, string | undefined> = process.env) {
  return { source: ontologySource(env), source_id: config.sourceId, external_project: projectId, project: knowledgeProject(config, projectId) };
}

function reasonsOf(detail: unknown): string[] {
  const clip = (s: string) => s.slice(0, 300);
  if (Array.isArray(detail)) {
    return detail.slice(0, 10).map((e) => {
      const item = e as { loc?: unknown[]; msg?: string };
      return clip(`${(item.loc ?? []).slice(1).join(".")}: ${item.msg ?? ""}`);
    });
  }
  if (detail && typeof detail === "object") {
    const d = detail as { message?: unknown; errors?: unknown };
    const errors = Array.isArray(d.errors) ? d.errors.filter((x): x is string => typeof x === "string") : [];
    return [...(typeof d.message === "string" ? [d.message] : []), ...errors].slice(0, 10).map(clip);
  }
  return [];
}

async function ontologyFetch<T>(config: KnowledgeConfig, path: string, body?: unknown): Promise<T> {
  const url = `${config.baseUrl}/api/ontology${path ? `/${path}` : ""}`;
  const response = await fetch(url, {
    method: body === undefined ? "GET" : "POST",
    headers: { "X-Knowledge-Key": config.key, ...(body === undefined ? {} : { "Content-Type": "application/json" }) },
    body: body === undefined ? undefined : JSON.stringify(body), signal: AbortSignal.timeout(60_000), redirect: "error",
  });
  if (response.ok) return response.json() as Promise<T>;
  if (response.status === 422) {
    const payload = await response.json().catch(() => ({})) as { detail?: unknown };
    throw new OntologyRequestError(422, "사전 이름 · 조건이 맞지 않습니다.", reasonsOf(payload.detail));
  }
  throw new OntologyRequestError(response.status, `지식관리 온톨로지 요청 실패 (HTTP ${response.status})`);
}

const dictionaryCache = new Map<string, { at: number; value: OntologyDictionary }>();
const DICTIONARY_TTL_MS = 60_000;

/** 승인된 사전 전체. 1분 동안 같은 결과를 다시 쓴다(승인하면 버전이 올라 다음 갱신 때 바뀐다). */
export async function getOntologyDictionary(config: KnowledgeConfig): Promise<OntologyDictionary> {
  const cached = dictionaryCache.get(config.baseUrl);
  if (cached && Date.now() - cached.at < DICTIONARY_TTL_MS) return cached.value;
  const value = await ontologyFetch<OntologyDictionary>(config, "");
  dictionaryCache.set(config.baseUrl, { at: Date.now(), value });
  return value;
}

export function clearOntologyDictionaryCache() { dictionaryCache.clear(); }

export interface OntologyMatch { kind: string; id: string; label?: string; code?: string; value_set?: string; attributes?: string[] }
export const resolveOntology = (config: KnowledgeConfig, question: string) =>
  ontologyFetch<{ version: number; matches: OntologyMatch[] }>(config, "resolve", { question });

export const queryOntology = (config: KnowledgeConfig, projectId: string, args: { concept: string; where?: unknown; attributes?: string[] }) =>
  ontologyFetch<{ version: number; records: OntologyRecord[]; truncated: boolean }>(config, "query", { ...ontologyScope(config, projectId), ...args });

export const traverseOntology = (config: KnowledgeConfig, projectId: string,
  args: { concept: string; keys: string[]; relations?: [string, "out" | "in"][]; depth: number }) =>
  ontologyFetch<{ version: number; nodes: OntologyRecord[]; edges: Record<string, unknown>[]; truncated: boolean }>(
    config, "traverse", { ...ontologyScope(config, projectId), ...args });

export interface OntologyRuleResult {
  rule: string; label?: string; severity?: string; target?: string; status: string;
  count?: number; truncated?: boolean; reason?: string; violations?: OntologyRecord[];
}
export const checkOntologyRules = (config: KnowledgeConfig, projectId: string, rules?: string[]) =>
  ontologyFetch<{ version: number; results: OntologyRuleResult[] }>(config, "gaps", { ...ontologyScope(config, projectId), ...(rules ? { rules } : {}) });
