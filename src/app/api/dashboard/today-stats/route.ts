/**
 * @file src/app/api/dashboard/today-stats/route.ts
 * @description
 * 오늘 등록된 데이터 통계 API입니다.
 * 헤더 중앙 스크롤러에서 사용합니다.
 *
 * 초보자 가이드:
 * 1. **오늘 날짜 범위**: 00:00:00 ~ 23:59:59 계산
 * 2. **병렬 집계**: Promise.all로 4개 count 쿼리 동시 실행
 * 3. **프로젝트 필터**: projectId 파라미터로 특정 프로젝트만 조회
 * 4. **성능**: Prisma count는 SELECT COUNT(*) 쿼리 생성 (최적화됨)
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";

/**
 * 오늘 등록된 데이터 통계 조회
 * GET /api/dashboard/today-stats?projectId=xxx
 *
 * 응답:
 * {
 *   "tasks": 5,
 *   "requirements": 3,
 *   "customerRequirements": 2,
 *   "issues": 4
 * }
 */
export async function GET(request: NextRequest) {
  try {
    // 인증 확인
    const { user, error } = await requireAuth();
    if (error) return error;

    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get("projectId");

    // 오늘 날짜 범위 계산 (00:00:00 ~ 23:59:59)
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0, 0);
    const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999);

    // 병렬 집계 (4개 count 쿼리 동시 실행)
    const [tasks, requirements, customerRequirements, issues] = await Promise.all([
      // 오늘 등록된 TASK
      prisma.task.count({
        where: {
          ...(projectId && { projectId }),
          createdAt: {
            gte: startOfDay,
            lte: endOfDay,
          },
        },
      }),

      // 오늘 등록된 Requirement (업무협조요청)
      prisma.requirement.count({
        where: {
          ...(projectId && { projectId }),
          createdAt: {
            gte: startOfDay,
            lte: endOfDay,
          },
        },
      }),

      // 오늘 등록된 CustomerRequirement (고객요구사항)
      prisma.customerRequirement.count({
        where: {
          ...(projectId && { projectId }),
          createdAt: {
            gte: startOfDay,
            lte: endOfDay,
          },
        },
      }),

      // 오늘 등록된 Issue (이슈)
      prisma.issue.count({
        where: {
          ...(projectId && { projectId }),
          createdAt: {
            gte: startOfDay,
            lte: endOfDay,
          },
        },
      }),
    ]);

    return NextResponse.json({
      tasks,
      requirements,
      customerRequirements,
      issues,
    });
  } catch (error) {
    console.error("[API] 오늘 통계 조회 실패:", error);
    return NextResponse.json(
      { error: "오늘 통계 조회에 실패했습니다." },
      { status: 500 }
    );
  }
}
