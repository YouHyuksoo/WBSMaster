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
 * - 인증: requireAuth + assertProjectAccess (프로젝트 멤버 · ADMIN 만). 목록은 ADMIN 이 아니면 projectId 필수
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, assertProjectAccess } from "@/lib/auth";
import { createDiscussionItem } from "@/lib/services/discussionItemService";

/**
 * 협의요청 목록 조회
 * GET /api/discussion-items
 *
 * 쿼리 파라미터:
 * - projectId: 프로젝트 ID (필터링)
 * - status: 상태 (DISCUSSING, CONVERTED_TO_REQUEST 등)
 * - stage: 발생 단계 (ANALYSIS, DESIGN 등)
 * - search: 검색어 (코드, 제목, 설명)
 */
export async function GET(request: NextRequest) {
  try {
    const { user, error } = await requireAuth();
    if (error) return error;

    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get("projectId");
    const status = searchParams.get("status");
    const stage = searchParams.get("stage");
    const search = searchParams.get("search");

    // 필터 조건 구성
    const where: Record<string, unknown> = {};

    if (projectId) {
      const denied = await assertProjectAccess(projectId, user!);
      if (denied) return denied;
      where.projectId = projectId;
    } else if (user!.role !== "ADMIN") {
      return NextResponse.json({ error: "projectId 가 필요합니다." }, { status: 400 });
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
    const { user, error } = await requireAuth();
    if (error) return error;

    const body = await request.json();
    const {
      projectId,
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

    const denied = await assertProjectAccess(projectId, user!);
    if (denied) return denied;

    // 필수 검사 · 채번 · 생성 · 멤버 알림은 서비스에서 (AI 채팅 확인 카드와 같은 함수)
    const result = await createDiscussionItem({
      projectId, title, description, stage, priority, options, requesterName, reporterId, assigneeId, dueDate,
    });
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    return NextResponse.json(result.data, { status: 201 });
  } catch (error) {
    console.error("협의요청 생성 실패:", error);
    return NextResponse.json(
      { error: "협의요청을 생성할 수 없습니다." },
      { status: 500 }
    );
  }
}
