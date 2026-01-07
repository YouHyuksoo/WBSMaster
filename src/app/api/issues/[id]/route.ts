/**
 * @file src/app/api/issues/[id]/route.ts
 * @description
 * 개별 이슈 API 라우트입니다.
 * 이슈 조회(GET), 수정(PATCH), 삭제(DELETE)를 처리합니다.
 *
 * 초보자 가이드:
 * 1. **GET /api/issues/:id**: 특정 이슈 상세 조회
 * 2. **PATCH /api/issues/:id**: 이슈 정보 수정
 * 3. **DELETE /api/issues/:id**: 이슈 삭제
 *
 * 수정 방법:
 * - 반환 필드 추가: include에 필드 추가
 * - 수정 가능 필드 추가: data 객체에 필드 추가
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * 이슈 상세 조회
 * GET /api/issues/:id
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    const issue = await prisma.issue.findUnique({
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

    if (!issue) {
      return NextResponse.json(
        { error: "이슈를 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    return NextResponse.json(issue);
  } catch (error) {
    console.error("이슈 조회 실패:", error);
    return NextResponse.json(
      { error: "이슈를 조회할 수 없습니다." },
      { status: 500 }
    );
  }
}

/**
 * 이슈 수정
 * PATCH /api/issues/:id
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const body = await request.json();
    const {
      title,
      description,
      status,
      priority,
      category,
      dueDate,
      resolvedDate,
      reporterId,
      assigneeId,
      isDelayed,
    } = body;

    // 이슈 존재 확인
    const existingIssue = await prisma.issue.findUnique({ where: { id } });
    if (!existingIssue) {
      return NextResponse.json(
        { error: "이슈를 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    // 상태가 RESOLVED나 CLOSED로 변경될 때 resolvedDate 자동 설정
    let finalResolvedDate = resolvedDate !== undefined
      ? (resolvedDate ? new Date(resolvedDate) : null)
      : existingIssue.resolvedDate;

    if (status === "RESOLVED" || status === "CLOSED") {
      if (!finalResolvedDate) {
        finalResolvedDate = new Date();
      }
    } else if (status === "OPEN" || status === "IN_PROGRESS") {
      finalResolvedDate = null;
    }

    const issue = await prisma.issue.update({
      where: { id },
      data: {
        ...(title !== undefined && { title }),
        ...(description !== undefined && { description }),
        ...(status !== undefined && { status }),
        ...(priority !== undefined && { priority }),
        ...(category !== undefined && { category }),
        ...(dueDate !== undefined && { dueDate: dueDate ? new Date(dueDate) : null }),
        resolvedDate: finalResolvedDate,
        ...(reporterId !== undefined && { reporterId: reporterId || null }),
        ...(assigneeId !== undefined && { assigneeId: assigneeId || null }),
        ...(isDelayed !== undefined && { isDelayed }),
      },
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

    return NextResponse.json(issue);
  } catch (error) {
    console.error("이슈 수정 실패:", error);
    return NextResponse.json(
      { error: "이슈를 수정할 수 없습니다." },
      { status: 500 }
    );
  }
}

/**
 * 이슈 삭제
 * DELETE /api/issues/:id
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    // 이슈 존재 확인
    const existingIssue = await prisma.issue.findUnique({ where: { id } });
    if (!existingIssue) {
      return NextResponse.json(
        { error: "이슈를 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    await prisma.issue.delete({ where: { id } });

    return NextResponse.json({ message: "이슈가 삭제되었습니다." });
  } catch (error) {
    console.error("이슈 삭제 실패:", error);
    return NextResponse.json(
      { error: "이슈를 삭제할 수 없습니다." },
      { status: 500 }
    );
  }
}
