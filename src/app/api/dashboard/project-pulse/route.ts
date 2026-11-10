/**
 * @file src/app/api/dashboard/project-pulse/route.ts
 * @description 대시보드 상단 "프로젝트 한눈에" 패널 집계 API입니다.
 *
 * 초보자 가이드:
 * - GET ?projectId=xxx → { today, totals, open, urgent, urgentCount, trend, todaySchedules } (src/lib/dashboard/project-pulse.ts)
 * - 인증: requireAuth + assertProjectAccess (프로젝트 멤버 · ADMIN)
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAuth, assertProjectAccess } from "@/lib/auth";
import { getProjectPulse } from "@/lib/dashboard/project-pulse";

export async function GET(request: NextRequest) {
  const { user, error } = await requireAuth();
  if (error) return error;
  const projectId = new URL(request.url).searchParams.get("projectId");
  if (!projectId) return NextResponse.json({ error: "projectId 가 필요합니다." }, { status: 400 });
  const denied = await assertProjectAccess(projectId, user!);
  if (denied) return denied;
  try {
    return NextResponse.json(await getProjectPulse(projectId));
  } catch (err) {
    console.error("[API] 프로젝트 한눈에 집계 실패:", err);
    return NextResponse.json({ error: "프로젝트 현황을 불러오지 못했습니다." }, { status: 500 });
  }
}
