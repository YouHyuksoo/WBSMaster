/**
 * @file src/app/api/field-issues/route.ts
 * @description
 * 현업이슈 목록 조회 및 생성 API입니다.
 *
 * 초보자 가이드:
 * - GET /api/field-issues: 목록 조회 (필터링 지원)
 * - POST /api/field-issues: 새 현업이슈 생성
 *   (사업부는 받지 않는다. DB 기본값 POLE 으로 저장)
 * - 인증: requireAuth + assertProjectAccess (프로젝트 멤버 · ADMIN 만). 목록은 ADMIN 이 아니면 projectId 필수
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, assertProjectAccess } from "@/lib/auth";
import { createFieldIssue } from "@/lib/services/fieldIssueService";

/**
 * 현업이슈 목록 조회
 * GET /api/field-issues
 */
export async function GET(request: NextRequest) {
  try {
    const { user, error } = await requireAuth();
    if (error) return error;

    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get("projectId");
    const status = searchParams.get("status");
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

    if (search) {
      where.OR = [
        { code: { contains: search, mode: "insensitive" } },
        { title: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
        { issuer: { contains: search, mode: "insensitive" } },
        { assignee: { contains: search, mode: "insensitive" } },
      ];
    }

    const fieldIssues = await prisma.fieldIssue.findMany({
      where,
      include: {
        project: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: [
        { sequence: "asc" },
        { createdAt: "desc" },
      ],
    });

    return NextResponse.json(fieldIssues);
  } catch (error) {
    console.error("현업이슈 목록 조회 실패:", error);
    return NextResponse.json(
      { error: "현업이슈 목록을 불러올 수 없습니다." },
      { status: 500 }
    );
  }
}

/**
 * 현업이슈 생성
 * POST /api/field-issues
 */
export async function POST(request: NextRequest) {
  try {
    const { user, error } = await requireAuth();
    if (error) return error;

    const body = await request.json();
    const {
      projectId,
      category,
      title,
      description,
      registeredDate,
      issuer,
      requirementCode,
      assignee,
      status,
      targetDate,
      completedDate,
      proposedSolution,
      finalSolution,
      remarks,
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

    // 채번 · 생성 · 멤버 알림은 서비스에서 (AI 채팅 확인 카드와 같은 함수)
    const result = await createFieldIssue({
      projectId, category, title, description, registeredDate, issuer, requirementCode, assignee,
      status, targetDate, completedDate, proposedSolution, finalSolution, remarks,
    });
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    return NextResponse.json(result.data, { status: 201 });
  } catch (error) {
    console.error("현업이슈 생성 실패:", error);
    return NextResponse.json(
      { error: "현업이슈를 생성할 수 없습니다." },
      { status: 500 }
    );
  }
}
