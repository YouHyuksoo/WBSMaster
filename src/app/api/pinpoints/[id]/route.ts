/**
 * @file src/app/api/pinpoints/[id]/route.ts
 * @description
 * 개별 핀포인트 API 라우트입니다.
 * 핀포인트 상세 조회(GET), 수정(PATCH), 삭제(DELETE)를 처리합니다.
 *
 * 초보자 가이드:
 * - 인증: requireAuth + assertProjectAccess (프로젝트 멤버 · ADMIN 만)
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, assertProjectAccess } from "@/lib/auth";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * 핀포인트 상세 조회
 * GET /api/pinpoints/:id
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { user, error: authError } = await requireAuth();
    if (authError) return authError;
    const { id } = await params;

    const pinpoint = await prisma.pinpoint.findUnique({
      where: { id },
      include: {
        row: true,
        project: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!pinpoint) {
      return NextResponse.json(
        { error: "핀포인트를 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    const accessError = await assertProjectAccess(pinpoint.projectId, user!);
    if (accessError) return accessError;

    return NextResponse.json(pinpoint);
  } catch (error) {
    console.error("핀포인트 조회 실패:", error);
    return NextResponse.json(
      { error: "핀포인트를 조회할 수 없습니다." },
      { status: 500 }
    );
  }
}

/**
 * 핀포인트 수정
 * PATCH /api/pinpoints/:id
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { user, error: authError } = await requireAuth();
    if (authError) return authError;
    const { id } = await params;
    const body = await request.json();
    const { name, date, color, description } = body;

    // 핀포인트 존재 확인
    const existing = await prisma.pinpoint.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "핀포인트를 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    const accessError = await assertProjectAccess(existing.projectId, user!);
    if (accessError) return accessError;

    // 핀포인트 수정
    const pinpoint = await prisma.pinpoint.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(date !== undefined && { date: new Date(date) }),
        ...(color !== undefined && { color }),
        ...(description !== undefined && { description }),
      },
    });

    return NextResponse.json(pinpoint);
  } catch (error) {
    console.error("핀포인트 수정 실패:", error);
    return NextResponse.json(
      { error: "핀포인트를 수정할 수 없습니다." },
      { status: 500 }
    );
  }
}

/**
 * 핀포인트 삭제
 * DELETE /api/pinpoints/:id
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { user, error: authError } = await requireAuth();
    if (authError) return authError;
    const { id } = await params;

    // 핀포인트 존재 확인
    const existing = await prisma.pinpoint.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "핀포인트를 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    const accessError = await assertProjectAccess(existing.projectId, user!);
    if (accessError) return accessError;

    // 핀포인트 삭제
    await prisma.pinpoint.delete({
      where: { id },
    });

    return NextResponse.json({ message: "핀포인트가 삭제되었습니다." });
  } catch (error) {
    console.error("핀포인트 삭제 실패:", error);
    return NextResponse.json(
      { error: "핀포인트를 삭제할 수 없습니다." },
      { status: 500 }
    );
  }
}
