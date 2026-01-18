/**
 * @file src/app/api/interviews/route.ts
 * @description
 * 인터뷰 관리 목록 조회 및 생성 API입니다.
 *
 * 초보자 가이드:
 * - GET /api/interviews: 목록 조회 (필터링 지원)
 * - POST /api/interviews: 새 인터뷰 생성
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * 인터뷰 목록 조회
 * GET /api/interviews
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get("projectId");
    const businessUnit = searchParams.get("businessUnit");
    const transferStatus = searchParams.get("transferStatus");
    const search = searchParams.get("search");

    // 필터 조건 구성
    const where: Record<string, unknown> = {};

    if (projectId) {
      where.projectId = projectId;
    }

    if (businessUnit) {
      where.businessUnit = businessUnit;
    }

    if (transferStatus) {
      where.transferStatus = transferStatus;
    }

    if (search) {
      where.OR = [
        { code: { contains: search, mode: "insensitive" } },
        { title: { contains: search, mode: "insensitive" } },
        { interviewer: { contains: search, mode: "insensitive" } },
        { interviewee: { contains: search, mode: "insensitive" } },
      ];
    }

    const interviews = await prisma.interview.findMany({
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

    return NextResponse.json(interviews);
  } catch (error) {
    console.error("인터뷰 목록 조회 실패:", error);
    return NextResponse.json(
      { error: "인터뷰 목록을 불러올 수 없습니다." },
      { status: 500 }
    );
  }
}

/**
 * 인터뷰 생성
 * POST /api/interviews
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      projectId,
      title,
      interviewDate,
      interviewer,
      interviewee,
      businessUnit,
      category,
      currentProcess,
      painPoints,
      desiredResults,
      technicalConstraints,
      questions,
      remarks,
    } = body;

    // 필수 값 검증
    if (!projectId) {
      return NextResponse.json(
        { error: "프로젝트 ID는 필수입니다." },
        { status: 400 }
      );
    }

    if (!title) {
      return NextResponse.json(
        { error: "인터뷰 제목은 필수입니다." },
        { status: 400 }
      );
    }

    if (!businessUnit) {
      return NextResponse.json(
        { error: "사업부는 필수입니다." },
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

    // 다음 인터뷰 코드 생성 (IV0001 형식)
    const lastInterview = await prisma.interview.findFirst({
      where: { projectId },
      orderBy: { sequence: "desc" },
    });

    const nextSequence = lastInterview ? lastInterview.sequence + 1 : 1;
    const code = `IV${String(nextSequence).padStart(4, "0")}`;

    // 인터뷰 생성
    const interview = await prisma.interview.create({
      data: {
        projectId,
        sequence: nextSequence,
        code,
        title,
        interviewDate: interviewDate ? new Date(interviewDate) : new Date(),
        interviewer: interviewer || null,
        interviewee: interviewee || null,
        businessUnit,
        category: category || null,
        currentProcess: currentProcess || null,
        painPoints: painPoints || null,
        desiredResults: desiredResults || null,
        technicalConstraints: technicalConstraints || null,
        questions: questions || null,
        remarks: remarks || null,
        transferStatus: "NOT_TRANSFERRED",
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

    return NextResponse.json(interview, { status: 201 });
  } catch (error) {
    console.error("인터뷰 생성 실패:", error);
    return NextResponse.json(
      { error: "인터뷰를 생성할 수 없습니다." },
      { status: 500 }
    );
  }
}
