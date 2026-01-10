/**
 * @file src/app/api/weekly-reports/auto-load/route.ts
 * @description
 * 주간보고 자동 데이터 로드 API 라우트입니다.
 * 전주의 차주계획 항목과 해당 주에 완료된 Task를 조회합니다.
 *
 * 초보자 가이드:
 * 1. **GET /api/weekly-reports/auto-load**: 자동 로드 데이터 조회
 *    - ?projectId=xxx: 프로젝트 ID (필수)
 *    - ?year=2026: 현재 연도 (필수)
 *    - ?weekNumber=2: 현재 주차 (필수)
 *
 * 반환 데이터:
 * - previousPlanItems: 전주 차주계획 항목들 (NEXT_PLAN → PREVIOUS_RESULT로 변환 가능)
 * - completedTasks: 해당 주에 완료된 Task 목록
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUser } from "@/lib/auth";

/**
 * ISO 주차 계산 함수
 * 월요일을 주의 시작으로 함
 */
function getISOWeek(date: Date): { year: number; week: number } {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return { year: d.getUTCFullYear(), week: weekNo };
}

/**
 * 특정 주차의 시작일(월요일)과 종료일(일요일) 계산
 */
function getWeekDateRange(year: number, weekNumber: number): { start: Date; end: Date } {
  // 해당 연도의 1월 4일이 속한 주가 1주차
  const jan4 = new Date(year, 0, 4);
  const jan4Day = jan4.getDay() || 7;
  const weekStart = new Date(jan4);
  weekStart.setDate(jan4.getDate() - jan4Day + 1 + (weekNumber - 1) * 7);

  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);
  weekEnd.setHours(23, 59, 59, 999);

  return { start: weekStart, end: weekEnd };
}

/**
 * 자동 로드 데이터 조회
 * GET /api/weekly-reports/auto-load
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get("projectId");
    const yearStr = searchParams.get("year");
    const weekNumberStr = searchParams.get("weekNumber");

    // 필수 파라미터 검증
    if (!projectId || !yearStr || !weekNumberStr) {
      return NextResponse.json(
        { error: "projectId, year, weekNumber는 필수입니다." },
        { status: 400 }
      );
    }

    const year = parseInt(yearStr, 10);
    const weekNumber = parseInt(weekNumberStr, 10);

    // 현재 사용자 확인
    const currentUser = await getUser();

    if (!currentUser) {
      return NextResponse.json(
        { error: "사용자 인증이 필요합니다." },
        { status: 401 }
      );
    }

    const currentUserId = currentUser.id;

    // 전주 계산
    let prevYear = year;
    let prevWeek = weekNumber - 1;
    if (prevWeek < 1) {
      prevYear = year - 1;
      // 작년의 마지막 주차 계산
      const dec31 = new Date(prevYear, 11, 31);
      const isoWeek = getISOWeek(dec31);
      prevWeek = isoWeek.week;
    }

    // 1. 전주의 주간보고에서 차주계획(NEXT_PLAN) 항목 조회
    const previousReport = await prisma.weeklyReport.findUnique({
      where: {
        projectId_userId_year_weekNumber: {
          projectId,
          userId: currentUserId,
          year: prevYear,
          weekNumber: prevWeek,
        },
      },
      include: {
        items: {
          where: {
            type: "NEXT_PLAN",
          },
          orderBy: { order: "asc" },
          include: {
            linkedTask: {
              select: {
                id: true,
                title: true,
                status: true,
                priority: true,
              },
            },
            linkedWbs: {
              select: {
                id: true,
                code: true,
                name: true,
                level: true,
              },
            },
          },
        },
      },
    });

    // 2. 해당 주에 완료된 Task 조회
    const { start: weekStart, end: weekEnd } = getWeekDateRange(year, weekNumber);

    const completedTasks = await prisma.task.findMany({
      where: {
        projectId,
        assigneeId: currentUserId,
        status: "COMPLETED",
        completedAt: {
          gte: weekStart,
          lte: weekEnd,
        },
      },
      select: {
        id: true,
        title: true,
        status: true,
        completedAt: true,
        assigneeId: true,
      },
      orderBy: { completedAt: "asc" },
    });

    return NextResponse.json({
      previousPlanItems: previousReport?.items || [],
      completedTasks: completedTasks.map((task) => ({
        ...task,
        completedAt: task.completedAt?.toISOString() || null,
      })),
    });
  } catch (error) {
    console.error("자동 로드 데이터 조회 실패:", error);
    return NextResponse.json(
      { error: "자동 로드 데이터를 조회할 수 없습니다." },
      { status: 500 }
    );
  }
}
