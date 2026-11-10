/**
 * @file src/app/api/knowledge/documents/[documentId]/original/route.ts
 * @description 프로젝트 권한을 확인하고 승인된 최신 문서 원본을 중계합니다.
 * 초보자 가이드: 삭제·미승인·구버전·다른 프로젝트 문서는 지식 서버에서도 차단합니다.
 */
import { NextRequest, NextResponse } from "next/server";
import { requireAuth, assertProjectAccess } from "@/lib/auth";
import { knowledgeConfig } from "@/lib/knowledge/config";
import { knowledgeOriginal } from "@/lib/knowledge/documents";
import { documentToken } from "@/lib/knowledge/document-links";
import { KnowledgeHttpError } from "@/lib/knowledge/client";

export async function GET(request: NextRequest, { params }: { params: Promise<{ documentId: string }> }) {
  const { user, error } = await requireAuth();
  if (error) return error;
  const projectId = request.nextUrl.searchParams.get("projectId");
  const versionId = request.nextUrl.searchParams.get("versionId");
  const { documentId } = await params;
  if (!projectId || !/^[A-Za-z0-9_-]{1,80}$/.test(projectId) || !documentToken(documentId) || !documentToken(versionId)) {
    return NextResponse.json({ error: "문서 조회 정보가 잘못됐습니다." }, { status: 400 });
  }
  const denied = await assertProjectAccess(projectId, user!);
  if (denied) return denied;
  try {
    const config = knowledgeConfig();
    if (!config) return NextResponse.json({ error: "지식관리 연결이 설정되지 않았습니다." }, { status: 503 });
    return await knowledgeOriginal(config, projectId, documentId, versionId);
  } catch (error) {
    const status = error instanceof KnowledgeHttpError && error.status === 404 ? 404 : 502;
    return NextResponse.json({ error: status === 404 ? "열 수 있는 승인 문서가 없습니다." : "문서 원본을 가져오지 못했습니다." }, { status });
  }
}
