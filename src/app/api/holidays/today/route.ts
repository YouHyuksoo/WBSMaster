/**
 * @file src/app/api/holidays/today/route.ts
 * @description
 * 오늘의 일정 조회 API 라우트입니다.
 * 당일 날짜에 해당하는 모든 일정을 조회합니다.
 *
 * 초보자 가이드:
 * 1. **GET /api/holidays/today**: 오늘의 일정 목록 조회
 *    - ?projectId=xxx: 특정 프로젝트의 일정만 조회
 *    - ?userId=xxx: 특정 사용자의 개인 일정만 조회
 *
 * 수정 방법:
 * - 조회 조건 변경: where 조건 수정
 * - 반환 필드 추가: include에 관계 추가
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

/**
 * 오늘의 일정 조회
 * GET /api/holidays/today
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get("projectId");
    const userId = searchParams.get("userId");

    // 오늘 날짜 범위 계산 (시작 00:00:00 ~ 끝 23:59:59)
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0);
    const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59);

    // 필터 조건 구성
    const where: Prisma.HolidayWhereInput = {
      OR: [
        // 당일 시작하는 일정
        {
          date: {
            gte: startOfDay,
            lte: endOfDay,
          },
        },
        // 기간 일정 중 오늘이 포함되는 일정 (시작일 <= 오늘 <= 종료일)
        {
          AND: [
            { date: { lte: endOfDay } },
            { endDate: { gte: startOfDay } },
          ],
        },
      ],
    };

    // 프로젝트 필터
    if (projectId) {
      where.projectId = projectId;
    }

    // 사용자 필터 (개인 일정 또는 전체 공통 일정)
    if (userId) {
      where.AND = [
        ...(where.AND as Prisma.HolidayWhereInput[] || []),
        {
          OR: [
            { userId: userId },  // 해당 사용자의 개인 일정
            { userId: null },     // 공통 일정 (userId가 없는 일정)
          ],
        },
      ];
    }

    const holidays = await prisma.holiday.findMany({
      where,
      include: {
        project: {
          select: {
            id: true,
            name: true,
          },
        },
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true,
          },
        },
      },
      orderBy: [
        { isAllDay: "desc" },  // 종일 일정 먼저
        { startTime: "asc" },   // 시작 시간순
        { date: "asc" },
      ],
    });

    return NextResponse.json(holidays);
  } catch (error) {
    console.error("오늘의 일정 조회 실패:", error);
    return NextResponse.json(
      { error: "오늘의 일정을 조회할 수 없습니다." },
      { status: 500 }
    );
  }
}
