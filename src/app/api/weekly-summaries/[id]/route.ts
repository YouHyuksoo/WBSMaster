/**
 * @file src/app/api/weekly-summaries/[id]/route.ts
 * @description
 * 개별 주간보고 취합 API 엔드포인트입니다.
 * 단일 취합 보고서 조회, 수정, 삭제를 처리합니다.
 *
 * 초보자 가이드:
 * 1. **GET**: 단일 취합 보고서 조회
 * 2. **PATCH**: 취합 보고서 수정 (제목, LLM 분석 결과 등)
 * 3. **DELETE**: 취합 보고서 삭제
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/weekly-summaries/[id]
 * 단일 취합 보고서 조회
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    const summary = await prisma.weeklySummary.findUnique({
      where: { id },
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

    if (!summary) {
      return NextResponse.json(
        { error: "Weekly summary not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(summary);
  } catch (error) {
    console.error("Failed to fetch weekly summary:", error);
    return NextResponse.json(
      { error: "Failed to fetch weekly summary" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/weekly-summaries/[id]
 * 취합 보고서 수정
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const body = await request.json();

    const { title, llmSummary, llmInsights, llmAnalyzedAt, reportIds } = body;

    const updateData: Record<string, unknown> = {};

    if (title !== undefined) updateData.title = title;
    if (llmSummary !== undefined) updateData.llmSummary = llmSummary;
    if (llmInsights !== undefined) updateData.llmInsights = llmInsights;
    if (llmAnalyzedAt !== undefined) updateData.llmAnalyzedAt = new Date(llmAnalyzedAt);

    // 재취합: reportIds가 전달되면 보고서 데이터를 다시 취합
    if (reportIds && Array.isArray(reportIds) && reportIds.length > 0) {
      const reports = await prisma.weeklyReport.findMany({
        where: { id: { in: reportIds } },
        include: {
          user: { select: { id: true, name: true, email: true } },
          items: true,
        },
      });

      const memberIds = reports.map((r) => r.userId);
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

      updateData.reportIds = reportIds;
      updateData.memberIds = memberIds;
      updateData.memberSummaries = memberSummaries;
      // 재취합 시 이전 LLM 분석 결과 초기화
      updateData.llmSummary = null;
      updateData.llmInsights = null;
      updateData.llmAnalyzedAt = null;
    }

    const summary = await prisma.weeklySummary.update({
      where: { id },
      data: updateData,
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

    return NextResponse.json(summary);
  } catch (error) {
    console.error("Failed to update weekly summary:", error);
    return NextResponse.json(
      { error: "Failed to update weekly summary" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/weekly-summaries/[id]
 * 취합 보고서 삭제
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    await prisma.weeklySummary.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete weekly summary:", error);
    return NextResponse.json(
      { error: "Failed to delete weekly summary" },
      { status: 500 }
    );
  }
}
