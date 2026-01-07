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
 *
 * 수정 방법:
 * - 정렬 추가: orderBy 조건 수정
 * - 필터링 추가: where 조건 추가
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { IssueStatus, IssuePriority, IssueCategory, Prisma } from "@prisma/client";

/**
 * 이슈 목록 조회
 * GET /api/issues
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get("projectId");
    const status = searchParams.get("status") as IssueStatus | null;
    const priority = searchParams.get("priority") as IssuePriority | null;
    const category = searchParams.get("category") as IssueCategory | null;

    // 필터 조건 구성
    const where: Prisma.IssueWhereInput = {};

    if (projectId) where.projectId = projectId;
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

    // 프로젝트 존재 확인
    const project = await prisma.project.findUnique({ where: { id: projectId } });
    if (!project) {
      return NextResponse.json(
        { error: "프로젝트를 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    // 이슈 코드 자동 생성 (ISS-001, ISS-002, ...)
    const lastIssue = await prisma.issue.findFirst({
      where: { projectId },
      orderBy: { createdAt: "desc" },
      select: { code: true },
    });
    const nextNumber = lastIssue?.code
      ? parseInt(lastIssue.code.replace("ISS-", "")) + 1
      : 1;
    const code = `ISS-${String(nextNumber).padStart(3, "0")}`;

    const issue = await prisma.issue.create({
      data: {
        code,
        title,
        description,
        projectId,
        priority: priority || "MEDIUM",
        category: category || "BUG",
        dueDate: dueDate ? new Date(dueDate) : null,
        reporterId,
        assigneeId,
        status: "OPEN",
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

    return NextResponse.json(issue, { status: 201 });
  } catch (error) {
    console.error("이슈 생성 실패:", error);
    return NextResponse.json(
      { error: "이슈를 생성할 수 없습니다." },
      { status: 500 }
    );
  }
}
