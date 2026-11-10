/**
 * @file src/app/api/to-be/route.ts
 * @description TO-BE 설계 조회 API (총괄 + TO-BE 업무 + 연결 후보).
 * 초보자 가이드:
 * - GET ?projectId=xxx → { overview, items, asIsOptions, sfrOptions } — 총괄이 없으면 만든다
 * - 인증: requireAuth + assertProjectAccess
 */
import { NextRequest, NextResponse } from "next/server";
import { requireAuth, assertProjectAccess } from "@/lib/auth";
import { ToBeError, getToBe } from "@/lib/to-be/to-be-service";

export async function GET(request: NextRequest) {
  const { user, error } = await requireAuth();
  if (error) return error;
  const projectId = new URL(request.url).searchParams.get("projectId");
  if (!projectId) return NextResponse.json({ error: "projectId 가 필요합니다." }, { status: 400 });
  const denied = await assertProjectAccess(projectId, user!);
  if (denied) return denied;
  try {
    return NextResponse.json(await getToBe(projectId));
  } catch (err) {
    if (err instanceof ToBeError) return NextResponse.json({ error: err.message }, { status: err.status });
    console.error("TO-BE 조회 실패:", err);
    return NextResponse.json({ error: "TO-BE 설계를 불러오지 못했습니다." }, { status: 500 });
  }
}
