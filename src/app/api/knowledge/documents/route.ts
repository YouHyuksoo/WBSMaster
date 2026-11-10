/**
 * @file src/app/api/knowledge/documents/route.ts
 * @description WBS 프로젝트 권한으로 승인 문서 목록을 조회합니다.
 * 초보자 가이드: 지식 서버의 관리자 키는 브라우저에 전달하지 않습니다.
 */
import { NextRequest, NextResponse } from "next/server";
import { requireAuth, assertProjectAccess } from "@/lib/auth";
import { knowledgeConfig } from "@/lib/knowledge/config";
import { listKnowledgeDocuments } from "@/lib/knowledge/documents";
import { KnowledgeHttpError } from "@/lib/knowledge/client";

export async function GET(request: NextRequest) {
  const { user, error } = await requireAuth();
  if (error) return error;
  const projectId = request.nextUrl.searchParams.get("projectId");
  if (!projectId || !/^[A-Za-z0-9_-]{1,80}$/.test(projectId)) return NextResponse.json({ error: "프로젝트 ID가 필요합니다." }, { status: 400 });
  const denied = await assertProjectAccess(projectId, user!);
  if (denied) return denied;
  try {
    const config = knowledgeConfig();
    if (!config) return NextResponse.json({ error: "지식관리 연결이 설정되지 않았습니다." }, { status: 503 });
    return NextResponse.json({ documents: await listKnowledgeDocuments(config, projectId) }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    const status = error instanceof KnowledgeHttpError && error.status === 404 ? 404 : 502;
    return NextResponse.json({ error: status === 404 ? "연결된 문서 공간이 없습니다." : "문서 목록을 가져오지 못했습니다." }, { status });
  }
}
