/**
 * @file src/lib/knowledge/document-links.ts
 * @description 문서 원본 주소를 WBS 내부의 인증 경로로 만듭니다.
 * 초보자 가이드: 지식 서버가 보낸 URL을 그대로 사용하지 않습니다.
 */
export function documentToken(value: unknown): value is string {
  return typeof value === "string" && /^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/.test(value);
}

export function documentOriginalUrl(projectId: string, row: Record<string, unknown>): string {
  if (!documentToken(row.documentId) || !documentToken(row.versionId)) throw new Error("문서 식별자 형식이 잘못됐습니다.");
  return `/api/knowledge/documents/${encodeURIComponent(row.documentId)}/original?${new URLSearchParams({ projectId, versionId: row.versionId })}`;
}
