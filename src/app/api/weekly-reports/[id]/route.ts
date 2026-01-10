/**
 * @file src/app/api/weekly-reports/[id]/route.ts
 * @description
 * 주간보고 개별 관리 API 라우트입니다.
 * 주간보고 상세 조회(GET), 수정(PATCH), 삭제(DELETE)를 처리합니다.
 *
 * 초보자 가이드:
 * 1. **GET /api/weekly-reports/:id**: 주간보고 상세 조회
 * 2. **PATCH /api/weekly-reports/:id**: 주간보고 수정
 * 3. **DELETE /api/weekly-reports/:id**: 주간보고 삭제
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ReportStatus } from "@prisma/client";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * 주간보고 상세 조회
 * GET /api/weekly-reports/:id
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    const report = await prisma.weeklyReport.findUnique({
      where: { id },
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

    if (!report) {
      return NextResponse.json(
        { error: "주간보고를 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    return NextResponse.json(report);
  } catch (error) {
    console.error("주간보고 상세 조회 실패:", error);
    return NextResponse.json(
      { error: "주간보고를 조회할 수 없습니다." },
      { status: 500 }
    );
  }
}

/**
 * 주간보고 수정
 * PATCH /api/weekly-reports/:id
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { issueContent, status } = body;

    // 기존 보고서 확인
    const existingReport = await prisma.weeklyReport.findUnique({
      where: { id },
    });

    if (!existingReport) {
      return NextResponse.json(
        { error: "주간보고를 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    // 업데이트 데이터 구성
    const updateData: {
      issueContent?: string | null;
      status?: ReportStatus;
      submittedAt?: Date | null;
    } = {};

    if (issueContent !== undefined) {
      updateData.issueContent = issueContent;
    }

    if (status !== undefined) {
      updateData.status = status as ReportStatus;
      // 제출 완료 상태로 변경 시 submittedAt 설정
      if (status === "SUBMITTED") {
        updateData.submittedAt = new Date();
      }
    }

    const report = await prisma.weeklyReport.update({
      where: { id },
      data: updateData,
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
    });

    return NextResponse.json(report);
  } catch (error) {
    console.error("주간보고 수정 실패:", error);
    return NextResponse.json(
      { error: "주간보고를 수정할 수 없습니다." },
      { status: 500 }
    );
  }
}

/**
 * 주간보고 삭제
 * DELETE /api/weekly-reports/:id
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    // 기존 보고서 확인
    const existingReport = await prisma.weeklyReport.findUnique({
      where: { id },
    });

    if (!existingReport) {
      return NextResponse.json(
        { error: "주간보고를 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    // 삭제 (연관된 items도 cascade 삭제됨)
    await prisma.weeklyReport.delete({
      where: { id },
    });

    return NextResponse.json({ message: "주간보고가 삭제되었습니다." });
  } catch (error) {
    console.error("주간보고 삭제 실패:", error);
    return NextResponse.json(
      { error: "주간보고를 삭제할 수 없습니다." },
      { status: 500 }
    );
  }
}
