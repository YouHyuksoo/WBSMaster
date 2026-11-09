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
 * 4. 인증: requireAuth + assertProjectAccess (레코드의 프로젝트 멤버 · ADMIN 만)
 *
 * 수정 방법:
 * - 반환 필드 추가: include에 필드 추가
 * - 수정 가능 필드 추가: data 객체에 필드 추가
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, assertProjectAccess } from "@/lib/auth";
import { updateIssue } from "@/lib/services/issueService";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * 이슈 상세 조회
 * GET /api/issues/:id
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { user, error } = await requireAuth();
    if (error) return error;

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

    const denied = await assertProjectAccess(issue.projectId, user!);
    if (denied) return denied;

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
    const { user, error } = await requireAuth();
    if (error) return error;

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

    const denied = await assertProjectAccess(existingIssue.projectId, user!);
    if (denied) return denied;

    // 해결일 자동 설정 등 수정 규칙은 서비스에서 (AI 채팅 확인 카드와 같은 함수)
    const result = await updateIssue(id, existingIssue.projectId, {
      title, description, status, priority, category, dueDate, resolvedDate, reporterId, assigneeId, isDelayed,
    });
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    return NextResponse.json(result.data);
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
    const { user, error } = await requireAuth();
    if (error) return error;

    const { id } = await params;

    // 이슈 존재 확인
    const existingIssue = await prisma.issue.findUnique({ where: { id } });
    if (!existingIssue) {
      return NextResponse.json(
        { error: "이슈를 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    const denied = await assertProjectAccess(existingIssue.projectId, user!);
    if (denied) return denied;

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
