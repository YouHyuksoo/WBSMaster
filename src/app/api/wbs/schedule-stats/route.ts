/**
 * @file src/app/api/wbs/schedule-stats/route.ts
 * @description
 * WBS 프로젝트 일정 통계 API입니다.
 * 총일수, 휴무일, 작업일, 진행일, 남은일 등 일정 관련 통계를 계산합니다.
 *
 * 초보자 가이드:
 * 1. **GET /api/wbs/schedule-stats**: 프로젝트 일정 통계 조회
 *    - ?projectId=xxx: 특정 프로젝트 (필수)
 *    - 인증: requireAuth + assertProjectAccess (프로젝트 멤버 · ADMIN 만)
 * 2. 계산은 src/lib/wbs/schedule-stats.ts 의 loadWbsScheduleStats 한 곳에서 한다.
 *    AI 채팅 도구(wbs_schedule_stats)도 같은 함수를 써서 화면과 같은 숫자를 낸다.
 *
 * 계산 방식 (말단 업무 기준 통일):
 * - **계획 진척률**: 각 대분류(LEVEL1)별 (가중치 × 말단 평균기간경과비율)의 합계
 * - **실적 진척률**: 각 대분류(LEVEL1)별 (가중치 × 말단 평균진행률)의 합계
 * - **지연율**: 계획 - 실적 (양수면 지연, 음수면 선행)
 * - **달성률**: (실적 / 계획) × 100
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, assertProjectAccess } from "@/lib/auth";
import { loadWbsScheduleStats } from "@/lib/wbs/schedule-stats";

/**
 * WBS 프로젝트 일정 통계 조회
 * GET /api/wbs/schedule-stats
 */
export async function GET(request: NextRequest) {
  try {
    // 인증 확인
    const { user, error } = await requireAuth();
    if (error) return error;

    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get("projectId");

    if (!projectId) {
      return NextResponse.json(
        { error: "프로젝트 ID가 필요합니다." },
        { status: 400 }
      );
    }

    const denied = await assertProjectAccess(projectId, user!);
    if (denied) return denied;

    const stats = await loadWbsScheduleStats(prisma, projectId);
    if (!stats) {
      return NextResponse.json(
        { error: "프로젝트를 찾을 수 없습니다." },
        { status: 404 }
      );
    }
    return NextResponse.json(stats);
  } catch (error) {
    console.error("WBS 일정 통계 조회 실패:", error);
    return NextResponse.json(
      { error: "WBS 일정 통계를 조회할 수 없습니다." },
      { status: 500 }
    );
  }
}
