/**
 * @file src/app/api/to-be/analysis/route.ts
 * @description TO-BE Gap 분석 · 추적표 조회 API (3단계).
 * 초보자 가이드:
 * - GET ?projectId=xxx → { gap, trace } — Gap 네 목록과 AS-IS → TO-BE → SFR → WBS 추적 행
 * - 인증: requireAuth + assertProjectAccess
 */
import { NextRequest, NextResponse } from "next/server";
import { requireAuth, assertProjectAccess } from "@/lib/auth";
import { buildGap, buildTrace, loadSnapshot } from "@/lib/to-be/to-be-trace-service";

export async function GET(request: NextRequest) {
  const { user, error } = await requireAuth();
  if (error) return error;
  const projectId = new URL(request.url).searchParams.get("projectId");
  if (!projectId) return NextResponse.json({ error: "projectId 가 필요합니다." }, { status: 400 });
  const denied = await assertProjectAccess(projectId, user!);
  if (denied) return denied;
  try {
    const snapshot = await loadSnapshot(projectId);
    return NextResponse.json({ gap: buildGap(snapshot), trace: buildTrace(snapshot) });
  } catch (err) {
    console.error("TO-BE 분석 조회 실패:", err);
    return NextResponse.json({ error: "Gap 분석 · 추적표를 불러오지 못했습니다." }, { status: 500 });
  }
}
