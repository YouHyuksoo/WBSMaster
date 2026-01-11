/**
 * @file src/app/api/customer-requirements/[id]/route.ts
 * @description
 * 고객요구사항 단건 조회, 수정, 삭제 API입니다.
 *
 * 초보자 가이드:
 * - GET /api/customer-requirements/:id: 단건 조회
 * - PATCH /api/customer-requirements/:id: 수정
 * - DELETE /api/customer-requirements/:id: 삭제
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type RouteContext = {
  params: Promise<{ id: string }>;
};

/**
 * 고객요구사항 단건 조회
 * GET /api/customer-requirements/:id
 */
export async function GET(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { id } = await context.params;

    const requirement = await prisma.customerRequirement.findUnique({
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

    if (!requirement) {
      return NextResponse.json(
        { error: "고객요구사항을 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    return NextResponse.json(requirement);
  } catch (error) {
    console.error("고객요구사항 조회 실패:", error);
    return NextResponse.json(
      { error: "고객요구사항을 불러올 수 없습니다." },
      { status: 500 }
    );
  }
}

/**
 * 고객요구사항 수정
 * PATCH /api/customer-requirements/:id
 */
export async function PATCH(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { id } = await context.params;
    const body = await request.json();

    // 존재 확인
    const existing = await prisma.customerRequirement.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "고객요구사항을 찾을 수 없습니다." },
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
    if (body.functionName !== undefined) {
      updateData.functionName = body.functionName;
    }
    if (body.content !== undefined) {
      updateData.content = body.content;
    }
    if (body.requestDate !== undefined) {
      updateData.requestDate = body.requestDate ? new Date(body.requestDate) : null;
    }
    if (body.requester !== undefined) {
      updateData.requester = body.requester || null;
    }
    if (body.solution !== undefined) {
      updateData.solution = body.solution || null;
    }
    if (body.applyStatus !== undefined) {
      updateData.applyStatus = body.applyStatus;
    }
    if (body.remarks !== undefined) {
      updateData.remarks = body.remarks || null;
    }
    if (body.toBeCode !== undefined) {
      updateData.toBeCode = body.toBeCode || null;
    }

    const requirement = await prisma.customerRequirement.update({
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

    return NextResponse.json(requirement);
  } catch (error) {
    console.error("고객요구사항 수정 실패:", error);
    return NextResponse.json(
      { error: "고객요구사항을 수정할 수 없습니다." },
      { status: 500 }
    );
  }
}

/**
 * 고객요구사항 삭제
 * DELETE /api/customer-requirements/:id
 */
export async function DELETE(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { id } = await context.params;

    // 존재 확인
    const existing = await prisma.customerRequirement.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "고객요구사항을 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    await prisma.customerRequirement.delete({
      where: { id },
    });

    return NextResponse.json({ message: "고객요구사항이 삭제되었습니다." });
  } catch (error) {
    console.error("고객요구사항 삭제 실패:", error);
    return NextResponse.json(
      { error: "고객요구사항을 삭제할 수 없습니다." },
      { status: 500 }
    );
  }
}
