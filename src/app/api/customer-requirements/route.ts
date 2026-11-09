/**
 * @file src/app/api/customer-requirements/route.ts
 * @description
 * 고객요구사항 목록 조회 및 생성 API입니다.
 *
 * 초보자 가이드:
 * - GET /api/customer-requirements: 목록 조회 (필터링 지원)
 * - POST /api/customer-requirements: 새 고객요구사항 생성
 *   (사업부는 받지 않는다. DB 기본값 POLE 으로 저장)
 * - 인증: requireAuth + assertProjectAccess (프로젝트 멤버 · ADMIN 만). 목록은 ADMIN 이 아니면 projectId 필수
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, assertProjectAccess } from "@/lib/auth";

/**
 * 고객요구사항 목록 조회
 * GET /api/customer-requirements
 */
export async function GET(request: NextRequest) {
  try {
    const { user, error } = await requireAuth();
    if (error) return error;

    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get("projectId");
    const applyStatus = searchParams.get("applyStatus");
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


    if (applyStatus) {
      where.applyStatus = applyStatus;
    }

    if (search) {
      where.OR = [
        { code: { contains: search, mode: "insensitive" } },
        { functionName: { contains: search, mode: "insensitive" } },
        { content: { contains: search, mode: "insensitive" } },
        { requester: { contains: search, mode: "insensitive" } },
      ];
    }

    const requirements = await prisma.customerRequirement.findMany({
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

    return NextResponse.json(requirements);
  } catch (error) {
    console.error("고객요구사항 목록 조회 실패:", error);
    return NextResponse.json(
      { error: "고객요구사항 목록을 불러올 수 없습니다." },
      { status: 500 }
    );
  }
}

/**
 * 고객요구사항 생성
 * POST /api/customer-requirements
 */
export async function POST(request: NextRequest) {
  try {
    const { user, error } = await requireAuth();
    if (error) return error;

    const body = await request.json();
    const {
      projectId,
      category,
      functionName,
      content,
      requestDate,
      requester,
      solution,
      applyStatus,
      remarks,
      toBeCode,
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

    if (!functionName) {
      return NextResponse.json(
        { error: "기능명은 필수입니다." },
        { status: 400 }
      );
    }

    if (!content) {
      return NextResponse.json(
        { error: "요구사항 내용은 필수입니다." },
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

    // 다음 관리번호 생성 (RQIT_00001 형식)
    const lastRequirement = await prisma.customerRequirement.findFirst({
      where: { projectId },
      orderBy: { sequence: "desc" },
    });

    const nextSequence = lastRequirement ? lastRequirement.sequence + 1 : 1;
    const code = `RQIT_${String(nextSequence).padStart(5, "0")}`;

    // 고객요구사항 생성
    const requirement = await prisma.customerRequirement.create({
      data: {
        projectId,
        sequence: nextSequence,
        code,
        category: category || null,
        functionName,
        content,
        requestDate: requestDate ? new Date(requestDate) : null,
        requester: requester || null,
        solution: solution || null,
        applyStatus: applyStatus || "REVIEWING",
        remarks: remarks || null,
        toBeCode: toBeCode || null,
      },
      include: {
        project: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    // 프로젝트 팀 멤버들에게 알림 생성
    try {
      const teamMembers = await prisma.teamMember.findMany({
        where: { projectId },
        select: { userId: true },
      });

      if (teamMembers.length > 0) {
        await prisma.notification.createMany({
          data: teamMembers.map((member) => ({
            userId: member.userId,
            type: "CUSTOMER_REQ_CREATED",
            title: `고객요구사항 등록: ${code}`,
            message: `[${project.name}] "${functionName}" 고객요구사항이 등록되었습니다.`,
            link: "/dashboard/customer-requirements",
            relatedId: requirement.id,
            projectId: projectId,
            projectName: project.name,
          })),
        });
      }
    } catch (notifError) {
      // 알림 생성 실패해도 요구사항 생성은 성공 처리
      console.error("알림 생성 실패:", notifError);
    }

    return NextResponse.json(requirement, { status: 201 });
  } catch (error) {
    console.error("고객요구사항 생성 실패:", error);
    return NextResponse.json(
      { error: "고객요구사항을 생성할 수 없습니다." },
      { status: 500 }
    );
  }
}
