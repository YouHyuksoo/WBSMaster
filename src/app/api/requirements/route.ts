/**
 * @file src/app/api/requirements/route.ts
 * @description
 * 요구사항 API 라우트입니다.
 * 요구사항 목록 조회(GET), 요구사항 생성(POST)을 처리합니다.
 *
 * 초보자 가이드:
 * 1. **GET /api/requirements**: 프로젝트별 요구사항 목록 조회
 *    - ?projectId=xxx: 특정 프로젝트의 요구사항만 조회
 *    - ?status=PENDING: 특정 상태의 요구사항만 조회
 * 2. **POST /api/requirements**: 새 요구사항 생성
 *
 * 수정 방법:
 * - 정렬 추가: orderBy 조건 수정
 * - 필터링 추가: where 조건 추가
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { RequirementStatus, Prisma } from "@prisma/client";
import { sendRequirementCreatedNotification } from "@/lib/slack";

/**
 * 요구사항 목록 조회
 * GET /api/requirements
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get("projectId");
    const status = searchParams.get("status") as RequirementStatus | null;

    // 필터 조건 구성
    const where: Prisma.RequirementWhereInput = {};

    if (projectId) where.projectId = projectId;
    if (status && Object.values(RequirementStatus).includes(status)) where.status = status;

    const requirements = await prisma.requirement.findMany({
      where,
      include: {
        project: {
          select: {
            id: true,
            name: true,
          },
        },
        // 요청자 정보 포함
        requester: {
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
        // 연결된 태스크 목록 포함
        tasks: {
          select: {
            id: true,
            title: true,
            status: true,
            priority: true,
          },
          orderBy: {
            createdAt: "desc",
          },
        },
        // 연결된 태스크 개수
        _count: {
          select: {
            tasks: true,
          },
        },
      },
      orderBy: [
        { isDelayed: "desc" },
        { dueDate: "asc" },
        { createdAt: "desc" },
      ],
    });

    return NextResponse.json(requirements);
  } catch (error) {
    console.error("요구사항 목록 조회 실패:", error);
    return NextResponse.json(
      { error: "요구사항 목록을 조회할 수 없습니다." },
      { status: 500 }
    );
  }
}

/**
 * 요구사항 생성
 * POST /api/requirements
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
      oneDriveLink,
      dueDate,
      requesterId,
      assigneeId,
    } = body;

    // 필수 필드 검증
    if (!title || !projectId) {
      return NextResponse.json(
        { error: "요구사항 제목과 프로젝트 ID는 필수입니다." },
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

    // 요구사항 코드 자동 생성 (REQ-001, REQ-002, ...)
    const lastReq = await prisma.requirement.findFirst({
      where: { projectId },
      orderBy: { createdAt: "desc" },
      select: { code: true },
    });
    const nextNumber = lastReq?.code
      ? parseInt(lastReq.code.replace("REQ-", "")) + 1
      : 1;
    const code = `REQ-${String(nextNumber).padStart(3, "0")}`;

    const requirement = await prisma.requirement.create({
      data: {
        code,
        title,
        description,
        projectId,
        priority: priority || "SHOULD",
        category,
        oneDriveLink,
        dueDate: dueDate ? new Date(dueDate) : null,
        requesterId,
        assigneeId,
        status: "DRAFT",
      },
      include: {
        project: {
          select: {
            id: true,
            name: true,
          },
        },
        requester: {
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

    // Slack 알림 전송 (비동기, 실패해도 응답에 영향 없음)
    sendRequirementCreatedNotification({
      requirementTitle: title,
      requirementCode: code,
      projectName: project.name,
      requesterName: requirement.requester?.name || undefined,
      assigneeName: requirement.assignee?.name || undefined,
      priority: priority || "SHOULD",
      category: category || undefined,
      dueDate: dueDate ? new Date(dueDate) : undefined,
    }).catch((err) => {
      console.error("[Slack] 요구사항 등록 알림 전송 실패:", err);
    });

    return NextResponse.json(requirement, { status: 201 });
  } catch (error) {
    console.error("요구사항 생성 실패:", error);
    return NextResponse.json(
      { error: "요구사항을 생성할 수 없습니다." },
      { status: 500 }
    );
  }
}
