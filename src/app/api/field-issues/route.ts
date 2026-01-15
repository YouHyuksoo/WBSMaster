/**
 * @file src/app/api/field-issues/route.ts
 * @description
 * 현업이슈 목록 조회 및 생성 API입니다.
 *
 * 초보자 가이드:
 * - GET /api/field-issues: 목록 조회 (필터링 지원)
 * - POST /api/field-issues: 새 현업이슈 생성
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * 현업이슈 목록 조회
 * GET /api/field-issues
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get("projectId");
    const businessUnit = searchParams.get("businessUnit");
    const status = searchParams.get("status");
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
    const body = await request.json();
    const {
      projectId,
      businessUnit,
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

    if (!businessUnit) {
      return NextResponse.json(
        { error: "사업부는 필수입니다." },
        { status: 400 }
      );
    }

    if (!title) {
      return NextResponse.json(
        { error: "이슈관리명은 필수입니다." },
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

    // 다음 이슈번호 생성 (IS0001 형식)
    const lastIssue = await prisma.fieldIssue.findFirst({
      where: { projectId },
      orderBy: { sequence: "desc" },
    });

    const nextSequence = lastIssue ? lastIssue.sequence + 1 : 1;
    const code = `IS${String(nextSequence).padStart(4, "0")}`;

    // 현업이슈 생성
    const fieldIssue = await prisma.fieldIssue.create({
      data: {
        projectId,
        sequence: nextSequence,
        code,
        businessUnit,
        category: category || null,
        title,
        description: description || null,
        registeredDate: registeredDate ? new Date(registeredDate) : null,
        issuer: issuer || null,
        requirementCode: requirementCode || null,
        assignee: assignee || null,
        status: status || "OPEN",
        targetDate: targetDate ? new Date(targetDate) : null,
        completedDate: completedDate ? new Date(completedDate) : null,
        proposedSolution: proposedSolution || null,
        finalSolution: finalSolution || null,
        remarks: remarks || null,
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

    return NextResponse.json(fieldIssue, { status: 201 });
  } catch (error) {
    console.error("현업이슈 생성 실패:", error);
    return NextResponse.json(
      { error: "현업이슈를 생성할 수 없습니다." },
      { status: 500 }
    );
  }
}
