/**
 * @file src/lib/knowledge/documents.ts
 * @description 승인된 프로젝트 문서 목록과 원본을 지식 서버에서 가져옵니다.
 * 초보자 가이드: 호출 전 WBS 프로젝트 권한을 확인하고, 원본은 서버끼리만 요청합니다.
 */
import { knowledgeProject, type KnowledgeConfig } from "./config";
import { knowledgeRequest, KnowledgeHttpError } from "./client";
import { documentOriginalUrl, documentToken } from "./document-links";

export async function listKnowledgeDocuments(config: KnowledgeConfig, projectId: string) {
  const project = knowledgeProject(config, projectId);
  const result = await knowledgeRequest<{ project: string; documents: Record<string, unknown>[] }>(config, "documents/list", {
    project, source_id: config.sourceId, external_project: projectId,
  });
  if (result.project !== project || !Array.isArray(result.documents) || result.documents.some((r) => r.project !== project || r.kind !== "document")) {
    throw new Error("문서 목록의 프로젝트 또는 형식이 다릅니다.");
  }
  return result.documents.map((row) => ({ ...row, originalUrl: documentOriginalUrl(projectId, row) }));
}

export async function knowledgeOriginal(config: KnowledgeConfig, projectId: string, documentId: string, versionId: string) {
  if (!documentToken(documentId) || !documentToken(versionId)) throw new Error("문서 식별자 형식이 잘못됐습니다.");
  const response = await fetch(`${config.baseUrl}/api/business/documents/original`, {
    method: "POST", headers: { "Content-Type": "application/json", "X-Knowledge-Key": config.key },
    body: JSON.stringify({ project: knowledgeProject(config, projectId), source_id: config.sourceId, external_project: projectId,
      document_id: documentId, version_id: versionId }),
    signal: AbortSignal.timeout(30_000), redirect: "error",
  });
  if (!response.ok) throw new KnowledgeHttpError(response.status);
  const disposition = response.headers.get("content-disposition");
  if (!disposition?.startsWith("attachment;")) { await response.body?.cancel(); throw new Error("원본 응답 형식이 잘못됐습니다."); }
  return new Response(response.body, { headers: {
    "Content-Type": response.headers.get("content-type") || "application/octet-stream",
    "Content-Disposition": disposition, "Cache-Control": "private, no-store",
    "X-Content-Type-Options": "nosniff", "Content-Security-Policy": "sandbox",
  } });
}
