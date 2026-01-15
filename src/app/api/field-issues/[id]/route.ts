/**
 * @file src/app/api/field-issues/[id]/route.ts
 * @description
 * 현업이슈 단건 조회, 수정, 삭제 API입니다.
 *
 * 초보자 가이드:
 * - GET /api/field-issues/:id: 단건 조회
 * - PATCH /api/field-issues/:id: 수정
 * - DELETE /api/field-issues/:id: 삭제
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type RouteContext = {
  params: Promise<{ id: string }>;
};

/**
 * 현업이슈 단건 조회
 * GET /api/field-issues/:id
 */
export async function GET(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { id } = await context.params;

    const fieldIssue = await prisma.fieldIssue.findUnique({
      where: { id },
      include: {
        project: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!fieldIssue) {
      return NextResponse.json(
        { error: "현업이슈를 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    return NextResponse.json(fieldIssue);
  } catch (error) {
    console.error("현업이슈 조회 실패:", error);
    return NextResponse.json(
      { error: "현업이슈를 불러올 수 없습니다." },
      { status: 500 }
    );
  }
}

/**
 * 현업이슈 수정
 * PATCH /api/field-issues/:id
 */
export async function PATCH(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { id } = await context.params;
    const body = await request.json();

    // 존재 확인
    const existing = await prisma.fieldIssue.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "현업이슈를 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    // 업데이트할 데이터 구성
    const updateData: Record<string, unknown> = {};

    if (body.businessUnit !== undefined) {
      updateData.businessUnit = body.businessUnit;
    }
    if (body.category !== undefined) {
      updateData.category = body.category || null;
    }
    if (body.title !== undefined) {
      updateData.title = body.title;
    }
    if (body.description !== undefined) {
      updateData.description = body.description || null;
    }
    if (body.registeredDate !== undefined) {
      updateData.registeredDate = body.registeredDate ? new Date(body.registeredDate) : null;
    }
    if (body.issuer !== undefined) {
      updateData.issuer = body.issuer || null;
    }
    if (body.requirementCode !== undefined) {
      updateData.requirementCode = body.requirementCode || null;
    }
    if (body.assignee !== undefined) {
      updateData.assignee = body.assignee || null;
    }
    if (body.status !== undefined) {
      updateData.status = body.status;
    }
    if (body.targetDate !== undefined) {
      updateData.targetDate = body.targetDate ? new Date(body.targetDate) : null;
    }
    if (body.completedDate !== undefined) {
      updateData.completedDate = body.completedDate ? new Date(body.completedDate) : null;
    }
    if (body.proposedSolution !== undefined) {
      updateData.proposedSolution = body.proposedSolution || null;
    }
    if (body.finalSolution !== undefined) {
      updateData.finalSolution = body.finalSolution || null;
    }
    if (body.remarks !== undefined) {
      updateData.remarks = body.remarks || null;
    }

    const fieldIssue = await prisma.fieldIssue.update({
      where: { id },
      data: updateData,
      include: {
        project: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    return NextResponse.json(fieldIssue);
  } catch (error) {
    console.error("현업이슈 수정 실패:", error);
    return NextResponse.json(
      { error: "현업이슈를 수정할 수 없습니다." },
      { status: 500 }
    );
  }
}

/**
 * 현업이슈 삭제
 * DELETE /api/field-issues/:id
 */
export async function DELETE(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { id } = await context.params;

    // 존재 확인
    const existing = await prisma.fieldIssue.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "현업이슈를 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    await prisma.fieldIssue.delete({
      where: { id },
    });

    return NextResponse.json({ message: "현업이슈가 삭제되었습니다." });
  } catch (error) {
    console.error("현업이슈 삭제 실패:", error);
    return NextResponse.json(
      { error: "현업이슈를 삭제할 수 없습니다." },
      { status: 500 }
    );
  }
}
