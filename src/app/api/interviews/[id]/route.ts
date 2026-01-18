/**
 * @file src/app/api/interviews/[id]/route.ts
 * @description
 * 단일 인터뷰 조회/수정/삭제 API입니다.
 *
 * 초보자 가이드:
 * - GET /api/interviews/[id]: 단건 조회
 * - PATCH /api/interviews/[id]: 수정
 * - DELETE /api/interviews/[id]: 삭제
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/** 라우트 파라미터 타입 (Next.js 16 방식) */
interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * 인터뷰 단건 조회
 * GET /api/interviews/[id]
 */
export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { id } = await params;

    const interview = await prisma.interview.findUnique({
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

    if (!interview) {
      return NextResponse.json(
        { error: "인터뷰를 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    return NextResponse.json(interview);
  } catch (error) {
    console.error("인터뷰 조회 실패:", error);
    return NextResponse.json(
      { error: "인터뷰를 불러올 수 없습니다." },
      { status: 500 }
    );
  }
}

/**
 * 인터뷰 수정
 * PATCH /api/interviews/[id]
 */
export async function PATCH(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { id } = await params;
    const body = await request.json();

    // 인터뷰 존재 확인
    const existingInterview = await prisma.interview.findUnique({
      where: { id },
    });

    if (!existingInterview) {
      return NextResponse.json(
        { error: "인터뷰를 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    // 날짜 필드 변환 처리
    const updateData: Record<string, unknown> = {};

    Object.keys(body).forEach((key) => {
      if (key === "interviewDate" && body[key]) {
        updateData[key] = new Date(body[key]);
      } else if (key === "transferredAt" && body[key]) {
        updateData[key] = new Date(body[key]);
      } else {
        updateData[key] = body[key];
      }
    });

    // 인터뷰 수정
    const updatedInterview = await prisma.interview.update({
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

    return NextResponse.json(updatedInterview);
  } catch (error) {
    console.error("인터뷰 수정 실패:", error);
    return NextResponse.json(
      { error: "인터뷰를 수정할 수 없습니다." },
      { status: 500 }
    );
  }
}

/**
 * 인터뷰 삭제
 * DELETE /api/interviews/[id]
 */
export async function DELETE(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { id } = await params;

    // 인터뷰 존재 확인
    const existingInterview = await prisma.interview.findUnique({
      where: { id },
    });

    if (!existingInterview) {
      return NextResponse.json(
        { error: "인터뷰를 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    // 인터뷰 삭제
    await prisma.interview.delete({
      where: { id },
    });

    return NextResponse.json({ message: "인터뷰가 삭제되었습니다." });
  } catch (error) {
    console.error("인터뷰 삭제 실패:", error);
    return NextResponse.json(
      { error: "인터뷰를 삭제할 수 없습니다." },
      { status: 500 }
    );
  }
}
