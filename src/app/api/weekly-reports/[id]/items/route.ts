/**
 * @file src/app/api/weekly-reports/[id]/items/route.ts
 * @description
 * 주간보고 항목 관리 API 라우트입니다.
 * 항목 목록 조회(GET), 항목 추가(POST)를 처리합니다.
 *
 * 초보자 가이드:
 * 1. **GET /api/weekly-reports/:id/items**: 항목 목록 조회
 * 2. **POST /api/weekly-reports/:id/items**: 새 항목 추가
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { WorkCategory, ReportItemType } from "@prisma/client";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * 주간보고 항목 목록 조회
 * GET /api/weekly-reports/:id/items
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: reportId } = await params;

    // 보고서 존재 확인
    const report = await prisma.weeklyReport.findUnique({
      where: { id: reportId },
    });

    if (!report) {
      return NextResponse.json(
        { error: "주간보고를 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    const items = await prisma.weeklyReportItem.findMany({
      where: { reportId },
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
      orderBy: [
        { type: "asc" },
        { order: "asc" },
      ],
    });

    return NextResponse.json(items);
  } catch (error) {
    console.error("주간보고 항목 목록 조회 실패:", error);
    return NextResponse.json(
      { error: "항목 목록을 조회할 수 없습니다." },
      { status: 500 }
    );
  }
}

/**
 * 주간보고 항목 추가
 * POST /api/weekly-reports/:id/items
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: reportId } = await params;
    const body = await request.json();
    const {
      type,
      category,
      title,
      description,
      targetDate,
      remarks,
      isAdditional,
      isCompleted,
      progress,
      linkedTaskId,
      linkedWbsId,
      order,
    } = body;

    // 필수 필드 검증
    if (!type || !category || !title) {
      return NextResponse.json(
        { error: "type, category, title은 필수입니다." },
        { status: 400 }
      );
    }

    // 보고서 존재 확인
    const report = await prisma.weeklyReport.findUnique({
      where: { id: reportId },
    });

    if (!report) {
      return NextResponse.json(
        { error: "주간보고를 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    // 현재 최대 order 값 조회
    const maxOrderItem = await prisma.weeklyReportItem.findFirst({
      where: { reportId, type: type as ReportItemType },
      orderBy: { order: "desc" },
    });
    const nextOrder = order !== undefined ? order : (maxOrderItem?.order ?? -1) + 1;

    // 항목 생성
    const item = await prisma.weeklyReportItem.create({
      data: {
        type: type as ReportItemType,
        category: category as WorkCategory,
        title,
        description: description || null,
        targetDate: targetDate ? new Date(targetDate) : null,
        remarks: remarks || null,
        isAdditional: isAdditional ?? false,
        isCompleted: isCompleted ?? false,
        progress: progress ?? 0,
        linkedTaskId: linkedTaskId || null,
        linkedWbsId: linkedWbsId || null,
        order: nextOrder,
        reportId,
      },
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

    return NextResponse.json(item, { status: 201 });
  } catch (error) {
    console.error("주간보고 항목 추가 실패:", error);
    return NextResponse.json(
      { error: "항목을 추가할 수 없습니다." },
      { status: 500 }
    );
  }
}
