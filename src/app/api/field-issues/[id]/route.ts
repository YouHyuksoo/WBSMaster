/**
 * @file src/app/api/field-issues/[id]/route.ts
 * @description
 * 현업이슈 단건 조회, 수정, 삭제 API입니다.
 *
 * 초보자 가이드:
 * - GET /api/field-issues/:id: 단건 조회
 * - PATCH /api/field-issues/:id: 수정
 * - DELETE /api/field-issues/:id: 삭제
 * - 인증: requireAuth + assertProjectAccess (레코드의 프로젝트 멤버 · ADMIN 만)
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, assertProjectAccess } from "@/lib/auth";
import { updateFieldIssue } from "@/lib/services/fieldIssueService";

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
    const { user, error } = await requireAuth();
    if (error) return error;

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

    const denied = await assertProjectAccess(fieldIssue.projectId, user!);
    if (denied) return denied;

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
    const { user, error } = await requireAuth();
    if (error) return error;

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

    const denied = await assertProjectAccess(existing.projectId, user!);
    if (denied) return denied;

    // 넘어온 필드만 수정 (서비스, AI 채팅 확인 카드와 같은 함수)
    const result = await updateFieldIssue(id, existing.projectId, body);
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    return NextResponse.json(result.data);
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
    const { user, error } = await requireAuth();
    if (error) return error;

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

    const denied = await assertProjectAccess(existing.projectId, user!);
    if (denied) return denied;

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
