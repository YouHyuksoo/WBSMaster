/**
 * @file src/lib/knowledge/client.ts
 * @description 지식 서버의 업무 레코드 수집·검색 HTTP 클라이언트입니다.
 * 초보자 가이드:
 * - 모든 요청은 서버에서 만든 프로젝트 범위와 관리자 키를 사용합니다.
 * - 오류 응답 본문·자격증명은 로그에 남기지 않습니다.
 */
import { knowledgeProject, type KnowledgeConfig } from "./config";
import { documentOriginalUrl } from "./document-links";

export interface KnowledgeEvent {
  id: string; projectId: string; model: string; recordId: string;
  operation: "upsert" | "delete"; payload: Record<string, unknown>;
}
export interface KnowledgeSearch {
  project: string; records: Record<string, unknown>[];
  relations: Record<string, unknown>[]; degraded: string[];
}

export class KnowledgeHttpError extends Error {
  constructor(public readonly status: number) { super(`지식 서버 요청 실패 (HTTP ${status})`); }
}

export async function knowledgeRequest<T>(config: KnowledgeConfig, path: string, body: unknown): Promise<T> {
  const response = await fetch(`${config.baseUrl}/api/business/${path}`, {
    method: "POST", headers: { "Content-Type": "application/json", "X-Knowledge-Key": config.key },
    body: JSON.stringify(body), signal: AbortSignal.timeout(path === "records" ? 120_000 : 30_000), redirect: "error",
  });
  if (!response.ok) throw new KnowledgeHttpError(response.status);
  return response.json() as Promise<T>;
}

export async function sendKnowledgeEvent(config: KnowledgeConfig, event: KnowledgeEvent) {
  const project = knowledgeProject(config, event.projectId);
  const result = await knowledgeRequest<{ project: string; revision: string; status: string }>(config, "records", {
    project, source_id: config.sourceId, external_project: event.projectId,
    model: event.model, record_id: event.recordId, revision: event.id,
    operation: event.operation, fields: event.payload,
  });
  if (result.project !== project || result.revision !== event.id || !["applied", "superseded"].includes(result.status)) {
    throw new Error("지식 서버 수집 확인 응답이 요청과 다릅니다.");
  }
}

export async function searchKnowledge(config: KnowledgeConfig, projectId: string, question: string) {
  const project = knowledgeProject(config, projectId);
  const result = await knowledgeRequest<KnowledgeSearch>(config, "search", {
    project, source_id: config.sourceId, external_project: projectId, question, limit: 10,
  });
  if (result.project !== project || !Array.isArray(result.records) || !Array.isArray(result.relations) || !Array.isArray(result.degraded)) {
    throw new Error("지식 서버 검색 응답의 프로젝트 또는 형식이 다릅니다.");
  }
  // 서버 측 범위 제한에 더해 응답에서도 교차 프로젝트 자료를 거절한다.
  if ([...result.records, ...result.relations].some((r) => r.project !== project)) {
    throw new Error("다른 프로젝트 검색 결과가 섞여 응답을 거절했습니다.");
  }
  result.records = result.records.map((row) => row.kind === "document"
    ? { ...row, originalUrl: documentOriginalUrl(projectId, row) } : row);
  return result;
}
