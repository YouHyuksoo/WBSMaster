/**
 * @file src/app/api/discussion-items/route.ts
 * @description
 * 협의요청 목록 조회 및 생성 API입니다.
 *
 * 초보자 가이드:
 * - GET /api/discussion-items: 목록 조회 (필터링 지원)
 * - POST /api/discussion-items: 새 협의요청 생성
 *
 * 협의요청(Discussion Item)이란?
 * - 버그도 아니고 새 기능도 아닌, 어떻게 할지 PM과 협의가 필요한 사항
 * - 예: 화면 레이아웃 결정, 프로세스 변경 여부, 기술 스택 선택 등
 * - 최소 2개 이상의 선택지를 제시하고 PM이 최종 결정
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * 협의요청 목록 조회
 * GET /api/discussion-items
 *
 * 쿼리 파라미터:
 * - projectId: 프로젝트 ID (필터링)
 * - businessUnit: 사업부구분 (필터링)
 * - status: 상태 (DISCUSSING, CONVERTED_TO_REQUEST 등)
 * - stage: 발생 단계 (ANALYSIS, DESIGN 등)
 * - search: 검색어 (코드, 제목, 설명)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get("projectId");
    const businessUnit = searchParams.get("businessUnit");
    const status = searchParams.get("status");
    const stage = searchParams.get("stage");
    const search = searchParams.get("search");

    // 필터 조건 구성
    const where: Record<string, unknown> = {};

    if (projectId) {
      where.projectId = projectId;
    }

    if (businessUnit) {
      where.businessUnit = businessUnit;
    }

    if (status) {
      where.status = status;
    }

    if (stage) {
      where.stage = stage;
    }

    if (search) {
      where.OR = [
        { code: { contains: search, mode: "insensitive" } },
        { title: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
        { decision: { contains: search, mode: "insensitive" } },
      ];
    }

    const discussionItems = await prisma.discussionItem.findMany({
      where,
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
      orderBy: [
        { createdAt: "desc" },
      ],
    });

    return NextResponse.json(discussionItems);
  } catch (error) {
    console.error("협의요청 목록 조회 실패:", error);
    return NextResponse.json(
      { error: "협의요청 목록을 불러올 수 없습니다." },
      { status: 500 }
    );
  }
}

/**
 * 협의요청 생성
 * POST /api/discussion-items
 *
 * 필수 필드:
 * - projectId: 프로젝트 ID
 * - businessUnit: 사업부구분
 * - title: 협의 주제
 * - stage: 발생 단계
 * - options: 선택지 배열 (최소 2개 이상)
 *
 * 선택 필드:
 * - description: 상세 내용
 * - priority: 우선순위 (HIGH, MEDIUM, LOW)
 * - requesterName: 요청자명 (텍스트)
 * - reporterId: 보고자 ID
 * - assigneeId: 담당자 ID (PM)
 * - dueDate: 협의 기한 (기본 3~7일)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      projectId,
      businessUnit,
      title,
      description,
      stage,
      priority,
      options,
      requesterName,
      reporterId,
      assigneeId,
      dueDate,
    } = body;

    // 필수 값 검증
    if (!projectId) {
      return NextResponse.json(
        { error: "프로젝트 ID는 필수입니다." },
        { status: 400 }
      );
    }

    if (!businessUnit) {
      return NextResponse.json(
        { error: "사업부구분은 필수입니다." },
        { status: 400 }
      );
    }

    if (!title) {
      return NextResponse.json(
        { error: "협의 주제는 필수입니다." },
        { status: 400 }
      );
    }

    if (!stage) {
      return NextResponse.json(
        { error: "발생 단계는 필수입니다." },
        { status: 400 }
      );
    }

    // 선택지 검증 (최소 2개 이상)
    if (!options || !Array.isArray(options) || options.length < 2) {
      return NextResponse.json(
        { error: "선택지는 최소 2개 이상이어야 합니다." },
        { status: 400 }
      );
    }

    // 프로젝트 존재 확인
    const project = await prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      return NextResponse.json(
        { error: "프로젝트를 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    // 다음 협의요청 코드 생성 (DIS-0001 형식)
    const lastItem = await prisma.discussionItem.findFirst({
      where: { projectId },
      orderBy: { createdAt: "desc" },
    });

    let nextNumber = 1;
    if (lastItem && lastItem.code) {
      const match = lastItem.code.match(/DIS-(\d+)/);
      if (match) {
        nextNumber = parseInt(match[1], 10) + 1;
      }
    }

    const code = `DIS-${String(nextNumber).padStart(4, "0")}`;

    // 기본 협의 기한 설정 (7일 후)
    const defaultDueDate = new Date();
    defaultDueDate.setDate(defaultDueDate.getDate() + 7);

    // 협의요청 생성
    const discussionItem = await prisma.discussionItem.create({
      data: {
        projectId,
        code,
        businessUnit,
        title,
        description: description || null,
        stage,
        priority: priority || "MEDIUM",
        options,
        requesterName: requesterName || null,
        reporterId: reporterId || null,
        assigneeId: assigneeId || null,
        dueDate: dueDate ? new Date(dueDate) : defaultDueDate,
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

    return NextResponse.json(discussionItem, { status: 201 });
  } catch (error) {
    console.error("협의요청 생성 실패:", error);
    return NextResponse.json(
      { error: "협의요청을 생성할 수 없습니다." },
      { status: 500 }
    );
  }
}
