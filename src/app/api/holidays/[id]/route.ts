/**
 * @file src/app/api/holidays/[id]/route.ts
 * @description
 * 개별 휴무 API 라우트입니다.
 * 휴무 상세 조회(GET), 수정(PATCH), 삭제(DELETE)를 처리합니다.
 *
 * 초보자 가이드:
 * 1. **GET /api/holidays/:id**: 휴무 상세 정보 조회
 * 2. **PATCH /api/holidays/:id**: 휴무 정보 수정
 * 3. **DELETE /api/holidays/:id**: 휴무 삭제
 *
 * 수정 방법:
 * - 반환 필드 추가: include에 관계 추가
 * - 수정 가능 필드 추가: PATCH의 data에 필드 추가
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type RouteParams = {
  params: Promise<{ id: string }>;
};

/**
 * 휴무 상세 조회
 * GET /api/holidays/:id
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    const holiday = await prisma.holiday.findUnique({
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

    if (!holiday) {
      return NextResponse.json(
        { error: "휴무를 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    return NextResponse.json(holiday);
  } catch (error) {
    console.error("휴무 조회 실패:", error);
    return NextResponse.json(
      { error: "휴무를 조회할 수 없습니다." },
      { status: 500 }
    );
  }
}

/**
 * 휴무 수정
 * PATCH /api/holidays/:id
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { title, date, type } = body;

    // 휴무 존재 확인
    const existing = await prisma.holiday.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { error: "휴무를 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    const holiday = await prisma.holiday.update({
      where: { id },
      data: {
        ...(title !== undefined && { title }),
        ...(date !== undefined && { date: new Date(date) }),
        ...(type !== undefined && { type }),
      },
      include: {
        project: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    return NextResponse.json(holiday);
  } catch (error) {
    console.error("휴무 수정 실패:", error);
    return NextResponse.json(
      { error: "휴무를 수정할 수 없습니다." },
      { status: 500 }
    );
  }
}

/**
 * 휴무 삭제
 * DELETE /api/holidays/:id
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    // 휴무 존재 확인
    const existing = await prisma.holiday.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { error: "휴무를 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    await prisma.holiday.delete({ where: { id } });

    return NextResponse.json({ message: "휴무가 삭제되었습니다." });
  } catch (error) {
    console.error("휴무 삭제 실패:", error);
    return NextResponse.json(
      { error: "휴무를 삭제할 수 없습니다." },
      { status: 500 }
    );
  }
}
