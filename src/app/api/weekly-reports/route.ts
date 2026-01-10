/**
 * @file src/app/api/weekly-reports/route.ts
 * @description
 * 주간보고 관리 API 라우트입니다.
 * 주간보고 목록 조회(GET), 주간보고 생성(POST)을 처리합니다.
 *
 * 초보자 가이드:
 * 1. **GET /api/weekly-reports**: 주간보고 목록 조회
 *    - ?projectId=xxx: 프로젝트 필터
 *    - ?userId=xxx: 사용자 필터
 *    - ?year=2026: 연도 필터
 *    - ?weekNumber=2: 주차 필터
 * 2. **POST /api/weekly-reports**: 새 주간보고 생성
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { getUser } from "@/lib/auth";

/**
 * 주간보고 목록 조회
 * GET /api/weekly-reports
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get("projectId");
    const userId = searchParams.get("userId");
    const year = searchParams.get("year");
    const weekNumber = searchParams.get("weekNumber");

    // 필터 조건 구성
    const where: Prisma.WeeklyReportWhereInput = {};

    if (projectId) {
      where.projectId = projectId;
    }
    if (userId) {
      where.userId = userId;
    }
    if (year) {
      where.year = parseInt(year, 10);
    }
    if (weekNumber) {
      where.weekNumber = parseInt(weekNumber, 10);
    }

    const reports = await prisma.weeklyReport.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true,
          },
        },
        project: {
          select: {
            id: true,
            name: true,
          },
        },
        items: {
          orderBy: { order: "asc" },
        },
      },
      orderBy: [
        { year: "desc" },
        { weekNumber: "desc" },
        { createdAt: "desc" },
      ],
    });

    return NextResponse.json(reports);
  } catch (error) {
    console.error("주간보고 목록 조회 실패:", error);
    return NextResponse.json(
      { error: "주간보고 목록을 조회할 수 없습니다." },
      { status: 500 }
    );
  }
}

/**
 * 주간보고 생성
 * POST /api/weekly-reports
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { projectId, year, weekNumber, weekStart, weekEnd, issueContent, userId } = body;

    // 필수 필드 검증
    if (!projectId || !year || !weekNumber || !weekStart || !weekEnd) {
      return NextResponse.json(
        { error: "projectId, year, weekNumber, weekStart, weekEnd는 필수입니다." },
        { status: 400 }
      );
    }

    // 현재 로그인한 사용자 확인
    const currentUser = await getUser();
    const currentUserId = userId || currentUser?.id;

    if (!currentUserId) {
      return NextResponse.json(
        { error: "사용자 인증이 필요합니다." },
        { status: 401 }
      );
    }

    // 프로젝트 존재 확인
    const project = await prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      return NextResponse.json(
        { error: "프로젝트를 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    // 중복 체크 (같은 프로젝트, 사용자, 연도, 주차)
    const existingReport = await prisma.weeklyReport.findUnique({
      where: {
        projectId_userId_year_weekNumber: {
          projectId,
          userId: currentUserId,
          year: parseInt(year, 10),
          weekNumber: parseInt(weekNumber, 10),
        },
      },
    });

    if (existingReport) {
      return NextResponse.json(
        { error: "이미 해당 주차의 주간보고가 존재합니다.", existingId: existingReport.id },
        { status: 409 }
      );
    }

    // 주간보고 생성
    const report = await prisma.weeklyReport.create({
      data: {
        year: parseInt(year, 10),
        weekNumber: parseInt(weekNumber, 10),
        weekStart: new Date(weekStart),
        weekEnd: new Date(weekEnd),
        issueContent: issueContent || null,
        status: "DRAFT",
        userId: currentUserId,
        projectId,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true,
          },
        },
        project: {
          select: {
            id: true,
            name: true,
          },
        },
        items: true,
      },
    });

    return NextResponse.json(report, { status: 201 });
  } catch (error) {
    console.error("주간보고 생성 실패:", error);
    return NextResponse.json(
      { error: "주간보고를 생성할 수 없습니다." },
      { status: 500 }
    );
  }
}
