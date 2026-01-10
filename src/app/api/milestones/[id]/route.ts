/**
 * @file src/app/api/milestones/[id]/route.ts
 * @description
 * 개별 마일스톤 API 라우트입니다.
 * 마일스톤 상세 조회(GET), 수정(PATCH), 삭제(DELETE)를 처리합니다.
 *
 * 초보자 가이드:
 * 1. **GET /api/milestones/:id**: 마일스톤 상세 조회
 * 2. **PATCH /api/milestones/:id**: 마일스톤 수정 (드래그/리사이즈 포함)
 * 3. **DELETE /api/milestones/:id**: 마일스톤 삭제
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { MilestoneStatus } from "@prisma/client";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * 마일스톤 상세 조회
 * GET /api/milestones/:id
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    const milestone = await prisma.milestone.findUnique({
      where: { id },
      include: {
        project: {
          select: {
            id: true,
            name: true,
            startDate: true,
            endDate: true,
          },
        },
        row: {
          select: {
            id: true,
            name: true,
            color: true,
          },
        },
      },
    });

    if (!milestone) {
      return NextResponse.json(
        { error: "마일스톤을 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    return NextResponse.json(milestone);
  } catch (error) {
    console.error("마일스톤 조회 실패:", error);
    return NextResponse.json(
      { error: "마일스톤을 조회할 수 없습니다." },
      { status: 500 }
    );
  }
}

/**
 * 마일스톤 수정
 * PATCH /api/milestones/:id
 *
 * 드래그/리사이즈 지원:
 * - 드래그 이동: startDate, endDate 동시 변경
 * - 리사이즈: startDate 또는 endDate만 변경
 * - 행 이동: rowId 변경
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { name, description, startDate, endDate, status, color, order, rowId } = body;

    // 마일스톤 존재 확인
    const existing = await prisma.milestone.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "마일스톤을 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    // 상태 유효성 검증
    if (status && !Object.values(MilestoneStatus).includes(status)) {
      return NextResponse.json(
        { error: "유효하지 않은 상태입니다." },
        { status: 400 }
      );
    }

    // rowId가 변경되는 경우 행 존재 확인
    if (rowId !== undefined && rowId !== null) {
      const row = await prisma.timelineRow.findUnique({
        where: { id: rowId },
      });

      if (!row) {
        return NextResponse.json(
          { error: "타임라인 행을 찾을 수 없습니다." },
          { status: 404 }
        );
      }
    }

    // 마일스톤 수정
    const milestone = await prisma.milestone.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(description !== undefined && { description }),
        ...(startDate !== undefined && { startDate: new Date(startDate) }),
        ...(endDate !== undefined && { endDate: new Date(endDate) }),
        ...(status !== undefined && { status }),
        ...(color !== undefined && { color }),
        ...(order !== undefined && { order }),
        ...(rowId !== undefined && { rowId: rowId || null }),
      },
      include: {
        project: {
          select: {
            id: true,
            name: true,
          },
        },
        row: {
          select: {
            id: true,
            name: true,
            color: true,
          },
        },
      },
    });

    return NextResponse.json(milestone);
  } catch (error) {
    console.error("마일스톤 수정 실패:", error);
    return NextResponse.json(
      { error: "마일스톤을 수정할 수 없습니다." },
      { status: 500 }
    );
  }
}

/**
 * 마일스톤 삭제
 * DELETE /api/milestones/:id
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    // 마일스톤 존재 확인
    const existing = await prisma.milestone.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "마일스톤을 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    // 마일스톤 삭제
    await prisma.milestone.delete({
      where: { id },
    });

    return NextResponse.json({ message: "마일스톤이 삭제되었습니다." });
  } catch (error) {
    console.error("마일스톤 삭제 실패:", error);
    return NextResponse.json(
      { error: "마일스톤을 삭제할 수 없습니다." },
      { status: 500 }
    );
  }
}
