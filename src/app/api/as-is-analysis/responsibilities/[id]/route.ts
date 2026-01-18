/**
 * @file src/app/api/as-is-analysis/responsibilities/[id]/route.ts
 * @description
 * AS-IS R&R 정의 개별 API 라우트입니다.
 * R&R 항목의 조회, 수정, 삭제를 처리합니다.
 *
 * 초보자 가이드:
 * - GET: 특정 R&R 조회
 * - PATCH: R&R 수정
 * - DELETE: R&R 삭제
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/as-is-analysis/responsibilities/[id]
 * 특정 R&R 조회
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    // 인증 확인
    const { error } = await requireAuth();
    if (error) return error;

    const { id } = await params;

    const item = await prisma.asIsResponsibility.findUnique({
      where: { id },
    });

    if (!item) {
      return NextResponse.json(
        { error: "R&R을 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    return NextResponse.json(item);
  } catch (error) {
    console.error("R&R 조회 오류:", error);
    return NextResponse.json(
      { error: "R&R 조회에 실패했습니다." },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/as-is-analysis/responsibilities/[id]
 * R&R 수정
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    // 인증 확인
    const { error } = await requireAuth();
    if (error) return error;

    const { id } = await params;
    const body = await request.json();
    const { role, department, responsibility, authority, remarks, order } = body;

    // 존재 여부 확인
    const existing = await prisma.asIsResponsibility.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "R&R을 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    // 업데이트
    const updated = await prisma.asIsResponsibility.update({
      where: { id },
      data: {
        ...(role !== undefined && { role }),
        ...(department !== undefined && { department }),
        ...(responsibility !== undefined && { responsibility }),
        ...(authority !== undefined && { authority }),
        ...(remarks !== undefined && { remarks }),
        ...(order !== undefined && { order }),
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("R&R 수정 오류:", error);
    return NextResponse.json(
      { error: "R&R 수정에 실패했습니다." },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/as-is-analysis/responsibilities/[id]
 * R&R 삭제
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    // 인증 확인
    const { error } = await requireAuth();
    if (error) return error;

    const { id } = await params;

    // 존재 여부 확인
    const existing = await prisma.asIsResponsibility.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "R&R을 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    // 삭제
    await prisma.asIsResponsibility.delete({
      where: { id },
    });

    return NextResponse.json({ message: "R&R이 삭제되었습니다." });
  } catch (error) {
    console.error("R&R 삭제 오류:", error);
    return NextResponse.json(
      { error: "R&R 삭제에 실패했습니다." },
      { status: 500 }
    );
  }
}
