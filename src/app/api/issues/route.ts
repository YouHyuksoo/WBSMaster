/**
 * @file src/app/api/issues/route.ts
 * @description
 * 이슈 API 라우트입니다.
 * 이슈 목록 조회(GET), 이슈 생성(POST)을 처리합니다.
 *
 * 초보자 가이드:
 * 1. **GET /api/issues**: 프로젝트별 이슈 목록 조회
 *    - ?projectId=xxx: 특정 프로젝트의 이슈만 조회
 *    - ?status=OPEN: 특정 상태의 이슈만 조회
 *    - ?priority=CRITICAL: 특정 우선순위의 이슈만 조회
 *    - ?category=BUG: 특정 카테고리의 이슈만 조회
 * 2. **POST /api/issues**: 새 이슈 생성
 * 3. 인증: requireAuth + assertProjectAccess (프로젝트 멤버 · ADMIN 만).
 *    projectId 없이 부르면 ADMIN 은 전체, 그 외는 자신이 멤버인 프로젝트의 이슈만 본다
 *
 * 수정 방법:
 * - 정렬 추가: orderBy 조건 수정
 * - 필터링 추가: where 조건 추가
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, assertProjectAccess } from "@/lib/auth";
import { IssueStatus, IssuePriority, IssueCategory, Prisma } from "@prisma/client";
import { createIssue } from "@/lib/services/issueService";

/**
 * 이슈 목록 조회
 * GET /api/issues
 */
export async function GET(request: NextRequest) {
  try {
    const { user, error } = await requireAuth();
    if (error) return error;

    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get("projectId");
    const status = searchParams.get("status") as IssueStatus | null;
    const priority = searchParams.get("priority") as IssuePriority | null;
    const category = searchParams.get("category") as IssueCategory | null;

    // 필터 조건 구성
    const where: Prisma.IssueWhereInput = {};

    if (projectId) {
      const denied = await assertProjectAccess(projectId, user!);
      if (denied) return denied;
      where.projectId = projectId;
    } else if (user!.role !== "ADMIN") {
      // 프로젝트 미선택 화면(대시보드 · 이슈 목록)이 projectId 없이 부른다 → 멤버 프로젝트로 제한
      where.project = { teamMembers: { some: { userId: user!.id } } };
    }
    if (status && Object.values(IssueStatus).includes(status)) where.status = status;
    if (priority && Object.values(IssuePriority).includes(priority)) where.priority = priority;
    if (category && Object.values(IssueCategory).includes(category)) where.category = category;

    const issues = await prisma.issue.findMany({
      where,
      include: {
        project: {
          select: {
            id: true,
            name: true,
          },
        },
        // 보고자 정보 포함
        reporter: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true,
          },
        },
        // 담당자 정보 포함
        assignee: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true,
          },
        },
      },
      orderBy: [
        { isDelayed: "desc" },
        { priority: "asc" }, // CRITICAL이 먼저
        { dueDate: "asc" },
        { createdAt: "desc" },
      ],
    });

    return NextResponse.json(issues);
  } catch (error) {
    console.error("이슈 목록 조회 실패:", error);
    return NextResponse.json(
      { error: "이슈 목록을 조회할 수 없습니다." },
      { status: 500 }
    );
  }
}

/**
 * 이슈 생성
 * POST /api/issues
 */
export async function POST(request: NextRequest) {
  try {
    const { user, error } = await requireAuth();
    if (error) return error;

    const body = await request.json();
    const {
      title,
      description,
      projectId,
      priority,
      category,
      dueDate,
      reporterId,
      assigneeId,
    } = body;

    // 필수 필드 검증
    if (!title || !projectId) {
      return NextResponse.json(
        { error: "이슈 제목과 프로젝트 ID는 필수입니다." },
        { status: 400 }
      );
    }

    const denied = await assertProjectAccess(projectId, user!);
    if (denied) return denied;

    // 코드 채번 · 생성 · 긴급 알림은 서비스에서 (AI 채팅 확인 카드와 같은 함수)
    const result = await createIssue({ title, description, projectId, priority, category, dueDate, reporterId, assigneeId });
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }
    const issue = result.data;

    return NextResponse.json(issue, { status: 201 });
  } catch (error) {
    console.error("이슈 생성 실패:", error);
    return NextResponse.json(
      { error: "이슈를 생성할 수 없습니다." },
      { status: 500 }
    );
  }
}
