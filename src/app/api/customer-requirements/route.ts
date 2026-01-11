/**
 * @file src/app/api/customer-requirements/route.ts
 * @description
 * 고객요구사항 목록 조회 및 생성 API입니다.
 *
 * 초보자 가이드:
 * - GET /api/customer-requirements: 목록 조회 (필터링 지원)
 * - POST /api/customer-requirements: 새 고객요구사항 생성
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * 고객요구사항 목록 조회
 * GET /api/customer-requirements
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get("projectId");
    const businessUnit = searchParams.get("businessUnit");
    const applyStatus = searchParams.get("applyStatus");
    const search = searchParams.get("search");

    // 필터 조건 구성
    const where: Record<string, unknown> = {};

    if (projectId) {
      where.projectId = projectId;
    }

    if (businessUnit) {
      where.businessUnit = businessUnit;
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
    const body = await request.json();
    const {
      projectId,
      businessUnit,
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

    if (!businessUnit) {
      return NextResponse.json(
        { error: "사업부는 필수입니다." },
        { status: 400 }
      );
    }

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
        businessUnit,
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

    return NextResponse.json(requirement, { status: 201 });
  } catch (error) {
    console.error("고객요구사항 생성 실패:", error);
    return NextResponse.json(
      { error: "고객요구사항을 생성할 수 없습니다." },
      { status: 500 }
    );
  }
}
