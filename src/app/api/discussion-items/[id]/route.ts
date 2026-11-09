/**
 * @file src/app/api/discussion-items/[id]/route.ts
 * @description
 * 협의요청 단건 조회, 수정, 삭제 API입니다.
 *
 * 초보자 가이드:
 * - GET /api/discussion-items/[id]: 단건 조회
 * - PATCH /api/discussion-items/[id]: 수정
 * - DELETE /api/discussion-items/[id]: 삭제
 * - 인증: requireAuth + assertProjectAccess (레코드의 프로젝트 멤버 · ADMIN 만)
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, assertProjectAccess } from "@/lib/auth";
import { updateDiscussionItem } from "@/lib/services/discussionItemService";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * 협의요청 단건 조회
 * GET /api/discussion-items/[id]
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { user, error } = await requireAuth();
    if (error) return error;

    const { id } = await params;

    const discussionItem = await prisma.discussionItem.findUnique({
      where: { id },
      include: {
        project: {
          select: {
            id: true,
            name: true,
          },
        },
        reporter: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true,
          },
        },
        assignee: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true,
          },
        },
      },
    });

    if (!discussionItem) {
      return NextResponse.json(
        { error: "협의요청을 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    const denied = await assertProjectAccess(discussionItem.projectId, user!);
    if (denied) return denied;

    return NextResponse.json(discussionItem);
  } catch (error) {
    console.error("협의요청 조회 실패:", error);
    return NextResponse.json(
      { error: "협의요청을 불러올 수 없습니다." },
      { status: 500 }
    );
  }
}

/**
 * 협의요청 수정
 * PATCH /api/discussion-items/[id]
 *
 * 수정 가능한 필드:
 * - title: 협의 주제
 * - description: 상세 내용
 * - stage: 발생 단계
 * - priority: 우선순위
 * - status: 상태
 * - options: 선택지 배열
 * - decision: 최종 결정
 * - requesterName: 요청자명
 * - dueDate: 협의 기한
 * - resolvedDate: 결정 완료일
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { user, error } = await requireAuth();
    if (error) return error;

    const { id } = await params;
    const body = await request.json();

    // 존재 여부 확인
    const existing = await prisma.discussionItem.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "협의요청을 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    const denied = await assertProjectAccess(existing.projectId, user!);
    if (denied) return denied;

    // 넘어온 필드만 수정, 완료 시 결정 완료일 자동 (서비스, AI 채팅 확인 카드와 같은 함수)
    const result = await updateDiscussionItem(id, existing.projectId, body);
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    return NextResponse.json(result.data);
  } catch (error) {
    console.error("협의요청 수정 실패:", error);
    return NextResponse.json(
      { error: "협의요청을 수정할 수 없습니다." },
      { status: 500 }
    );
  }
}

/**
 * 협의요청 삭제
 * DELETE /api/discussion-items/[id]
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { user, error } = await requireAuth();
    if (error) return error;

    const { id } = await params;

    // 존재 여부 확인
    const existing = await prisma.discussionItem.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "협의요청을 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    const denied = await assertProjectAccess(existing.projectId, user!);
    if (denied) return denied;

    // 삭제 실행
    await prisma.discussionItem.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("협의요청 삭제 실패:", error);
    return NextResponse.json(
      { error: "협의요청을 삭제할 수 없습니다." },
      { status: 500 }
    );
  }
}
