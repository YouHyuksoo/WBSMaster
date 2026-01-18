/**
 * @file src/app/api/as-is-analysis/interviews/[id]/route.ts
 * @description
 * AS-IS 현업 인터뷰 개별 API 라우트입니다.
 * 인터뷰 항목의 조회, 수정, 삭제를 처리합니다.
 *
 * 초보자 가이드:
 * - GET: 특정 인터뷰 조회
 * - PATCH: 인터뷰 수정
 * - DELETE: 인터뷰 삭제
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/as-is-analysis/interviews/[id]
 * 특정 인터뷰 조회
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    // 인증 확인
    const { error } = await requireAuth();
    if (error) return error;

    const { id } = await params;

    const item = await prisma.asIsInterview.findUnique({
      where: { id },
    });

    if (!item) {
      return NextResponse.json(
        { error: "인터뷰를 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    return NextResponse.json(item);
  } catch (error) {
    console.error("인터뷰 조회 오류:", error);
    return NextResponse.json(
      { error: "인터뷰 조회에 실패했습니다." },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/as-is-analysis/interviews/[id]
 * 인터뷰 수정
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    // 인증 확인
    const { error } = await requireAuth();
    if (error) return error;

    const { id } = await params;
    const body = await request.json();
    const {
      interviewee,
      department,
      position,
      interviewDate,
      topic,
      content,
      keyFindings,
      suggestions,
      remarks,
      order,
    } = body;

    // 존재 여부 확인
    const existing = await prisma.asIsInterview.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "인터뷰를 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    // 업데이트
    const updated = await prisma.asIsInterview.update({
      where: { id },
      data: {
        ...(interviewee !== undefined && { interviewee }),
        ...(department !== undefined && { department }),
        ...(position !== undefined && { position }),
        ...(interviewDate !== undefined && {
          interviewDate: interviewDate ? new Date(interviewDate) : null,
        }),
        ...(topic !== undefined && { topic }),
        ...(content !== undefined && { content }),
        ...(keyFindings !== undefined && { keyFindings }),
        ...(suggestions !== undefined && { suggestions }),
        ...(remarks !== undefined && { remarks }),
        ...(order !== undefined && { order }),
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("인터뷰 수정 오류:", error);
    return NextResponse.json(
      { error: "인터뷰 수정에 실패했습니다." },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/as-is-analysis/interviews/[id]
 * 인터뷰 삭제
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    // 인증 확인
    const { error } = await requireAuth();
    if (error) return error;

    const { id } = await params;

    // 존재 여부 확인
    const existing = await prisma.asIsInterview.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "인터뷰를 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    // 삭제
    await prisma.asIsInterview.delete({
      where: { id },
    });

    return NextResponse.json({ message: "인터뷰가 삭제되었습니다." });
  } catch (error) {
    console.error("인터뷰 삭제 오류:", error);
    return NextResponse.json(
      { error: "인터뷰 삭제에 실패했습니다." },
      { status: 500 }
    );
  }
}
