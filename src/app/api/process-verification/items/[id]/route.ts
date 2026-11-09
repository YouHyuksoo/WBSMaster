/**
 * @file src/app/api/process-verification/items/[id]/route.ts
 * @description
 * 개별 공정검증 항목 API 라우트입니다.
 * 항목 상세 조회(GET), 수정(PATCH), 삭제(DELETE)를 처리합니다.
 *
 * 초보자 가이드:
 * - 인증: requireAuth + assertProjectAccess (항목 → 카테고리의 projectId 기준, 프로젝트 멤버 · ADMIN 만)
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, assertProjectAccess } from "@/lib/auth";

type RouteParams = {
  params: Promise<{ id: string }>;
};

/**
 * 항목 상세 조회
 * GET /api/process-verification/items/:id
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { user, error } = await requireAuth();
    if (error) return error;

    const { id } = await params;

    const item = await prisma.processVerificationItem.findUnique({
      where: { id },
      include: {
        categoryRef: {
          select: {
            id: true,
            name: true,
            code: true,
            projectId: true,
          },
        },
      },
    });

    if (!item) {
      return NextResponse.json(
        { error: "항목을 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    const denied = await assertProjectAccess(item.categoryRef.projectId, user!);
    if (denied) return denied;

    return NextResponse.json(item);
  } catch (error) {
    console.error("항목 조회 실패:", error);
    return NextResponse.json(
      { error: "항목을 조회할 수 없습니다." },
      { status: 500 }
    );
  }
}

/**
 * 항목 수정
 * PATCH /api/process-verification/items/:id
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { user, error } = await requireAuth();
    if (error) return error;

    const { id } = await params;
    const body = await request.json();
    const {
      category,
      isApplied,
      managementArea,
      detailItem,
      mesMapping,
      verificationDetail,
      managementCode,
      acceptanceStatus,
      existingMes,
      customerRequest,
      order,
      remarks,
      status,
      asIsCode,   // AS-IS 관리번호
      toBeCode,   // TO-BE 관리번호
    } = body;

    // 항목 존재 확인
    const existing = await prisma.processVerificationItem.findUnique({
      where: { id },
      include: { categoryRef: { select: { projectId: true } } },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "항목을 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    const denied = await assertProjectAccess(existing.categoryRef.projectId, user!);
    if (denied) return denied;

    const item = await prisma.processVerificationItem.update({
      where: { id },
      data: {
        ...(category !== undefined && { category }),
        ...(isApplied !== undefined && { isApplied }),
        ...(managementArea !== undefined && { managementArea }),
        ...(detailItem !== undefined && { detailItem }),
        ...(mesMapping !== undefined && { mesMapping }),
        ...(verificationDetail !== undefined && { verificationDetail }),
        ...(managementCode !== undefined && { managementCode }),
        ...(acceptanceStatus !== undefined && { acceptanceStatus }),
        ...(existingMes !== undefined && { existingMes }),
        ...(customerRequest !== undefined && { customerRequest }),
        ...(order !== undefined && { order }),
        ...(remarks !== undefined && { remarks }),
        ...(status !== undefined && { status }),
        ...(asIsCode !== undefined && { asIsCode }),
        ...(toBeCode !== undefined && { toBeCode }),
      },
      include: {
        categoryRef: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
      },
    });

    return NextResponse.json(item);
  } catch (error) {
    console.error("항목 수정 실패:", error);
    return NextResponse.json(
      { error: "항목을 수정할 수 없습니다." },
      { status: 500 }
    );
  }
}

/**
 * 항목 삭제
 * DELETE /api/process-verification/items/:id
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { user, error } = await requireAuth();
    if (error) return error;

    const { id } = await params;

    // 항목 존재 확인
    const existing = await prisma.processVerificationItem.findUnique({
      where: { id },
      include: { categoryRef: { select: { projectId: true } } },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "항목을 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    const denied = await assertProjectAccess(existing.categoryRef.projectId, user!);
    if (denied) return denied;

    await prisma.processVerificationItem.delete({ where: { id } });

    return NextResponse.json({ message: "항목이 삭제되었습니다." });
  } catch (error) {
    console.error("항목 삭제 실패:", error);
    return NextResponse.json(
      { error: "항목을 삭제할 수 없습니다." },
      { status: 500 }
    );
  }
}
