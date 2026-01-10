/**
 * @file src/app/api/timeline-rows/[id]/route.ts
 * @description
 * 개별 타임라인 행 API 라우트입니다.
 * 타임라인 행 상세 조회(GET), 수정(PATCH), 삭제(DELETE)를 처리합니다.
 *
 * 초보자 가이드:
 * 1. **GET /api/timeline-rows/:id**: 행 상세 조회
 * 2. **PATCH /api/timeline-rows/:id**: 행 수정
 * 3. **DELETE /api/timeline-rows/:id**: 행 삭제 (기본 행은 삭제 불가)
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * 타임라인 행 상세 조회
 * GET /api/timeline-rows/:id
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    const row = await prisma.timelineRow.findUnique({
      where: { id },
      include: {
        milestones: {
          orderBy: { startDate: "asc" },
        },
        project: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!row) {
      return NextResponse.json(
        { error: "타임라인 행을 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    return NextResponse.json(row);
  } catch (error) {
    console.error("타임라인 행 조회 실패:", error);
    return NextResponse.json(
      { error: "타임라인 행을 조회할 수 없습니다." },
      { status: 500 }
    );
  }
}

/**
 * 타임라인 행 수정
 * PATCH /api/timeline-rows/:id
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { name, color, order, parentId } = body;

    // 행 존재 확인
    const existing = await prisma.timelineRow.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "타임라인 행을 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    // parentId가 지정된 경우 (다른 부모로 변경), 부모 행이 같은 프로젝트에 속하는지 확인
    if (parentId !== undefined) {
      if (parentId) {
        const parentRow = await prisma.timelineRow.findUnique({
          where: { id: parentId },
        });

        if (!parentRow || parentRow.projectId !== existing.projectId) {
          return NextResponse.json(
            { error: "부모 행을 찾을 수 없습니다." },
            { status: 404 }
          );
        }

        // 자기 자신을 부모로 설정하려고 하는 경우 방지
        if (parentId === id) {
          return NextResponse.json(
            { error: "자신을 부모로 설정할 수 없습니다." },
            { status: 400 }
          );
        }
      }
    }

    // 행 수정
    const row = await prisma.timelineRow.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(color !== undefined && { color }),
        ...(order !== undefined && { order }),
        ...(parentId !== undefined && { parentId: parentId || null }),
      },
      include: {
        milestones: {
          orderBy: { startDate: "asc" },
        },
      },
    });

    return NextResponse.json(row);
  } catch (error) {
    console.error("타임라인 행 수정 실패:", error);
    return NextResponse.json(
      { error: "타임라인 행을 수정할 수 없습니다." },
      { status: 500 }
    );
  }
}

/**
 * 타임라인 행 삭제
 * DELETE /api/timeline-rows/:id
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    // 행 존재 확인
    const existing = await prisma.timelineRow.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "타임라인 행을 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    // 기본 행은 삭제 불가
    if (existing.isDefault) {
      return NextResponse.json(
        { error: "기본 행은 삭제할 수 없습니다." },
        { status: 400 }
      );
    }

    // 행 삭제 (연결된 마일스톤의 rowId는 null로 설정됨 - onDelete: SetNull)
    await prisma.timelineRow.delete({
      where: { id },
    });

    return NextResponse.json({ message: "타임라인 행이 삭제되었습니다." });
  } catch (error) {
    console.error("타임라인 행 삭제 실패:", error);
    return NextResponse.json(
      { error: "타임라인 행을 삭제할 수 없습니다." },
      { status: 500 }
    );
  }
}
