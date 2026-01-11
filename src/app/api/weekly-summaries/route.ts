/**
 * @file src/app/api/weekly-summaries/route.ts
 * @description
 * 주간보고 취합(Summary) API 엔드포인트입니다.
 * 여러 멤버의 주간보고를 취합하여 요약 보고서를 생성합니다.
 *
 * 초보자 가이드:
 * 1. **GET**: 취합 보고서 목록 조회 (프로젝트별)
 * 2. **POST**: 새 취합 보고서 생성 (선택된 멤버 주간보고 취합)
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/weekly-summaries
 * 취합 보고서 목록 조회
 * Query: projectId (필수), year (선택), weekNumber (선택)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get("projectId");
    const year = searchParams.get("year");
    const weekNumber = searchParams.get("weekNumber");

    if (!projectId) {
      return NextResponse.json(
        { error: "projectId is required" },
        { status: 400 }
      );
    }

    const where: Record<string, unknown> = { projectId };

    if (year) {
      where.year = parseInt(year, 10);
    }

    if (weekNumber) {
      where.weekNumber = parseInt(weekNumber, 10);
    }

    const summaries = await prisma.weeklySummary.findMany({
      where,
      include: {
        createdBy: {
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
      },
      orderBy: [{ year: "desc" }, { weekNumber: "desc" }, { createdAt: "desc" }],
    });

    return NextResponse.json(summaries);
  } catch (error) {
    console.error("Failed to fetch weekly summaries:", error);
    return NextResponse.json(
      { error: "Failed to fetch weekly summaries" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/weekly-summaries
 * 새 취합 보고서 생성
 * Body: { projectId, year, weekNumber, weekStart, weekEnd, title, reportIds, createdById }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      projectId,
      year,
      weekNumber,
      weekStart,
      weekEnd,
      title,
      reportIds,
      createdById,
    } = body;

    // 필수 필드 검증
    if (!projectId || !year || !weekNumber || !title || !reportIds?.length || !createdById) {
      return NextResponse.json(
        { error: "Missing required fields: projectId, year, weekNumber, title, reportIds, createdById" },
        { status: 400 }
      );
    }

    // 선택된 주간보고들 조회
    const reports = await prisma.weeklyReport.findMany({
      where: {
        id: { in: reportIds },
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        items: true,
      },
    });

    if (reports.length === 0) {
      return NextResponse.json(
        { error: "No reports found for the given IDs" },
        { status: 404 }
      );
    }

    // 멤버 ID 목록 추출
    const memberIds = reports.map((r) => r.userId);

    // 멤버별 요약 생성
    const memberSummaries = reports.map((report) => {
      const previousItems = report.items.filter((item) => item.type === "PREVIOUS_RESULT");
      const nextItems = report.items.filter((item) => item.type === "NEXT_PLAN");

      return {
        memberId: report.userId,
        memberName: report.user?.name || report.user?.email || "Unknown",
        previousResults: previousItems.map((item) => ({
          category: item.category,
          title: item.title,
          description: item.description,
          isCompleted: item.isCompleted,
          progress: item.progress,
        })),
        nextPlans: nextItems.map((item) => ({
          category: item.category,
          title: item.title,
          description: item.description,
          targetDate: item.targetDate,
        })),
      };
    });

    // 취합 보고서 생성
    const summary = await prisma.weeklySummary.create({
      data: {
        projectId,
        year,
        weekNumber,
        weekStart: new Date(weekStart),
        weekEnd: new Date(weekEnd),
        title,
        memberIds,
        reportIds,
        memberSummaries,
        createdById,
      },
      include: {
        createdBy: {
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
      },
    });

    return NextResponse.json(summary, { status: 201 });
  } catch (error) {
    console.error("Failed to create weekly summary:", error);
    return NextResponse.json(
      { error: "Failed to create weekly summary" },
      { status: 500 }
    );
  }
}
