/**
 * @file src/app/api/holidays/route.ts
 * @description
 * 일정 관리 API 라우트입니다.
 * 일정 목록 조회(GET), 일정 생성(POST)을 처리합니다.
 *
 * 초보자 가이드:
 * 1. **GET /api/holidays**: 프로젝트별 일정 목록 조회
 *    - ?projectId=xxx: 특정 프로젝트의 일정만 조회
 *    - ?type=COMPANY_HOLIDAY: 특정 유형의 일정만 조회
 *    - ?year=2024&month=1: 특정 연월의 일정만 조회
 * 2. **POST /api/holidays**: 새 일정 생성
 *
 * 수정 방법:
 * - 정렬 추가: orderBy 조건 수정
 * - 필터링 추가: where 조건 추가
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { HolidayType, Prisma } from "@prisma/client";

/**
 * 휴무 목록 조회
 * GET /api/holidays
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get("projectId");
    const type = searchParams.get("type") as HolidayType | null;
    const year = searchParams.get("year");
    const month = searchParams.get("month");

    // 필터 조건 구성
    const where: Prisma.HolidayWhereInput = {};

    if (projectId) where.projectId = projectId;
    if (type && Object.values(HolidayType).includes(type)) where.type = type;

    // 연월 필터링
    if (year && month) {
      const startDate = new Date(parseInt(year), parseInt(month) - 1, 1);
      const endDate = new Date(parseInt(year), parseInt(month), 0);
      where.date = {
        gte: startDate,
        lte: endDate,
      };
    } else if (year) {
      const startDate = new Date(parseInt(year), 0, 1);
      const endDate = new Date(parseInt(year), 11, 31);
      where.date = {
        gte: startDate,
        lte: endDate,
      };
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
      orderBy: {
        date: "asc",
      },
    });

    return NextResponse.json(holidays);
  } catch (error) {
    console.error("휴무 목록 조회 실패:", error);
    return NextResponse.json(
      { error: "휴무 목록을 조회할 수 없습니다." },
      { status: 500 }
    );
  }
}

/**
 * 일정 생성
 * POST /api/holidays
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      title,
      description,
      date,
      startDate, // 대시보드에서 startDate로 보낼 수도 있음
      endDate,
      type,
      isAllDay,
      startTime,
      endTime,
      projectId,
      userId,
    } = body;

    // startDate가 있으면 date로 사용 (호환성)
    const eventDate = date || startDate;

    // 필수 필드 검증
    if (!title || !eventDate || !type || !projectId) {
      return NextResponse.json(
        { error: "일정 제목, 날짜, 유형, 프로젝트 ID는 필수입니다." },
        { status: 400 }
      );
    }

    // 프로젝트 존재 확인
    const project = await prisma.project.findUnique({ where: { id: projectId } });
    if (!project) {
      return NextResponse.json(
        { error: "프로젝트를 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    const holiday = await prisma.holiday.create({
      data: {
        title,
        description: description || null,
        date: new Date(eventDate),
        endDate: endDate ? new Date(endDate) : null,
        type,
        isAllDay: isAllDay !== undefined ? isAllDay : true,
        startTime: startTime || null,
        endTime: endTime || null,
        projectId,
        userId: userId || null,
      },
      include: {
        project: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    return NextResponse.json(holiday, { status: 201 });
  } catch (error) {
    console.error("일정 생성 실패:", error);
    return NextResponse.json(
      { error: "일정을 생성할 수 없습니다." },
      { status: 500 }
    );
  }
}
