/**
 * @file src/app/api/discussion-items/[id]/route.ts
 * @description
 * 협의요청 단건 조회, 수정, 삭제 API입니다.
 *
 * 초보자 가이드:
 * - GET /api/discussion-items/[id]: 단건 조회
 * - PATCH /api/discussion-items/[id]: 수정
 * - DELETE /api/discussion-items/[id]: 삭제
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * 협의요청 단건 조회
 * GET /api/discussion-items/[id]
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
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
 * - businessUnit: 사업부구분
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

    // 업데이트할 데이터 구성
    const updateData: Record<string, unknown> = {};

    if (body.businessUnit !== undefined) updateData.businessUnit = body.businessUnit;
    if (body.title !== undefined) updateData.title = body.title;
    if (body.description !== undefined) updateData.description = body.description || null;
    if (body.stage !== undefined) updateData.stage = body.stage;
    if (body.priority !== undefined) updateData.priority = body.priority;
    if (body.status !== undefined) {
      updateData.status = body.status;
      // 완료 상태로 변경 시 결정 완료일 설정
      if (body.status === "COMPLETED" && !existing.resolvedDate) {
        updateData.resolvedDate = new Date();
      }
    }
    if (body.options !== undefined) updateData.options = body.options;
    if (body.decision !== undefined) updateData.decision = body.decision || null;
    if (body.requesterName !== undefined) updateData.requesterName = body.requesterName || null;
    if (body.dueDate !== undefined) updateData.dueDate = body.dueDate ? new Date(body.dueDate) : null;
    if (body.resolvedDate !== undefined) updateData.resolvedDate = body.resolvedDate ? new Date(body.resolvedDate) : null;
    if (body.convertedToType !== undefined) updateData.convertedToType = body.convertedToType;
    if (body.convertedToCode !== undefined) updateData.convertedToCode = body.convertedToCode;
    if (body.referenceNote !== undefined) updateData.referenceNote = body.referenceNote;

    // 업데이트 실행
    const discussionItem = await prisma.discussionItem.update({
      where: { id },
      data: updateData,
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

    return NextResponse.json(discussionItem);
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
