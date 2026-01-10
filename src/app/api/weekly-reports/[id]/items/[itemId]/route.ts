/**
 * @file src/app/api/weekly-reports/[id]/items/[itemId]/route.ts
 * @description
 * 주간보고 개별 항목 관리 API 라우트입니다.
 * 항목 수정(PATCH), 항목 삭제(DELETE)를 처리합니다.
 *
 * 초보자 가이드:
 * 1. **PATCH /api/weekly-reports/:id/items/:itemId**: 항목 수정
 * 2. **DELETE /api/weekly-reports/:id/items/:itemId**: 항목 삭제
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { WorkCategory, ReportItemType } from "@prisma/client";

interface RouteParams {
  params: Promise<{ id: string; itemId: string }>;
}

/**
 * 주간보고 항목 수정
 * PATCH /api/weekly-reports/:id/items/:itemId
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: reportId, itemId } = await params;
    const body = await request.json();

    // 기존 항목 확인
    const existingItem = await prisma.weeklyReportItem.findUnique({
      where: { id: itemId },
    });

    if (!existingItem) {
      return NextResponse.json(
        { error: "항목을 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    // 보고서 ID 일치 확인
    if (existingItem.reportId !== reportId) {
      return NextResponse.json(
        { error: "잘못된 요청입니다." },
        { status: 400 }
      );
    }

    // 업데이트 데이터 구성
    const updateData: {
      type?: ReportItemType;
      category?: WorkCategory;
      title?: string;
      description?: string | null;
      targetDate?: Date | null;
      remarks?: string | null;
      isAdditional?: boolean;
      isCompleted?: boolean;
      progress?: number;
      linkedTaskId?: string | null;
      linkedWbsId?: string | null;
      order?: number;
    } = {};

    if (body.type !== undefined) {
      updateData.type = body.type as ReportItemType;
    }
    if (body.category !== undefined) {
      updateData.category = body.category as WorkCategory;
    }
    if (body.title !== undefined) {
      updateData.title = body.title;
    }
    if (body.description !== undefined) {
      updateData.description = body.description || null;
    }
    if (body.targetDate !== undefined) {
      updateData.targetDate = body.targetDate ? new Date(body.targetDate) : null;
    }
    if (body.remarks !== undefined) {
      updateData.remarks = body.remarks || null;
    }
    if (body.isAdditional !== undefined) {
      updateData.isAdditional = body.isAdditional;
    }
    if (body.isCompleted !== undefined) {
      updateData.isCompleted = body.isCompleted;
    }
    if (body.progress !== undefined) {
      updateData.progress = body.progress;
    }
    if (body.linkedTaskId !== undefined) {
      updateData.linkedTaskId = body.linkedTaskId || null;
    }
    if (body.linkedWbsId !== undefined) {
      updateData.linkedWbsId = body.linkedWbsId || null;
    }
    if (body.order !== undefined) {
      updateData.order = body.order;
    }

    const item = await prisma.weeklyReportItem.update({
      where: { id: itemId },
      data: updateData,
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
    });

    return NextResponse.json(item);
  } catch (error) {
    console.error("주간보고 항목 수정 실패:", error);
    return NextResponse.json(
      { error: "항목을 수정할 수 없습니다." },
      { status: 500 }
    );
  }
}

/**
 * 주간보고 항목 삭제
 * DELETE /api/weekly-reports/:id/items/:itemId
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: reportId, itemId } = await params;

    // 기존 항목 확인
    const existingItem = await prisma.weeklyReportItem.findUnique({
      where: { id: itemId },
    });

    if (!existingItem) {
      return NextResponse.json(
        { error: "항목을 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    // 보고서 ID 일치 확인
    if (existingItem.reportId !== reportId) {
      return NextResponse.json(
        { error: "잘못된 요청입니다." },
        { status: 400 }
      );
    }

    // 삭제
    await prisma.weeklyReportItem.delete({
      where: { id: itemId },
    });

    return NextResponse.json({ message: "항목이 삭제되었습니다." });
  } catch (error) {
    console.error("주간보고 항목 삭제 실패:", error);
    return NextResponse.json(
      { error: "항목을 삭제할 수 없습니다." },
      { status: 500 }
    );
  }
}
