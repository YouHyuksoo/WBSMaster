/**
 * @file src/app/api/to-be/draft/route.ts
 * @description AS-IS 에서 TO-BE 초안 만들기 API.
 * 초보자 가이드:
 * - POST { projectId } → { created, skipped }
 * - 아직 어떤 TO-BE 에도 연결되지 않은 AS-IS 업무만 1:1 로 복사한다 (다시 눌러도 중복 없음)
 * - 인증: requireAuth + assertProjectAccess
 */
import { NextRequest, NextResponse } from "next/server";
import { requireAuth, assertProjectAccess } from "@/lib/auth";
import { ToBeError, draftFromAsIs } from "@/lib/to-be/to-be-service";

export async function POST(request: NextRequest) {
  const { user, error } = await requireAuth();
  if (error) return error;
  try {
    const body = await request.json();
    const projectId = typeof body?.projectId === "string" ? body.projectId : "";
    if (!projectId) return NextResponse.json({ error: "projectId 가 필요합니다." }, { status: 400 });
    const denied = await assertProjectAccess(projectId, user!);
    if (denied) return denied;
    return NextResponse.json(await draftFromAsIs(projectId));
  } catch (err) {
    if (err instanceof ToBeError) return NextResponse.json({ error: err.message }, { status: err.status });
    if (err instanceof SyntaxError) return NextResponse.json({ error: "JSON 입력을 확인해주세요." }, { status: 400 });
    console.error("TO-BE 초안 만들기 실패:", err);
    return NextResponse.json({ error: "TO-BE 초안을 만들지 못했습니다." }, { status: 500 });
  }
}
