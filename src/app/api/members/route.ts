/**
 * @file src/app/api/members/route.ts
 * @description
 * 팀 멤버 API 라우트입니다.
 * 팀 멤버 목록 조회(GET), 팀 멤버 추가(POST)를 처리합니다.
 *
 * 초보자 가이드:
 * 1. **GET /api/members**: 프로젝트별 팀 멤버 목록 조회
 *    - ?projectId=xxx: 특정 프로젝트의 멤버만 조회
 * 2. **POST /api/members**: 프로젝트에 멤버 추가
 *
 * 수정 방법:
 * - 필터링 추가: where 조건 추가
 * - 역할 추가: TeamMemberRole enum 수정 (schema.prisma)
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * 팀 멤버 목록 조회
 * GET /api/members
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get("projectId");

    // 필터 조건 구성
    const where: {
      projectId?: string;
    } = {};

    if (projectId) where.projectId = projectId;

    const members = await prisma.teamMember.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true,
          },
        },
        project: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: [
        { role: "asc" },
        { joinedAt: "asc" },
      ],
    });

    return NextResponse.json(members);
  } catch (error) {
    console.error("팀 멤버 목록 조회 실패:", error);
    return NextResponse.json(
      { error: "팀 멤버 목록을 조회할 수 없습니다." },
      { status: 500 }
    );
  }
}

/**
 * 팀 멤버 추가
 * POST /api/members
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { projectId, userId, role } = body;

    // 필수 필드 검증
    if (!projectId || !userId) {
      return NextResponse.json(
        { error: "프로젝트 ID와 사용자 ID는 필수입니다." },
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

    // 사용자 존재 확인
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      return NextResponse.json(
        { error: "사용자를 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    // 이미 멤버인지 확인
    const existingMember = await prisma.teamMember.findUnique({
      where: {
        projectId_userId: {
          projectId,
          userId,
        },
      },
    });

    if (existingMember) {
      return NextResponse.json(
        { error: "이미 프로젝트에 추가된 멤버입니다." },
        { status: 400 }
      );
    }

    const member = await prisma.teamMember.create({
      data: {
        projectId,
        userId,
        role: role || "MEMBER",
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true,
          },
        },
        project: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    return NextResponse.json(member, { status: 201 });
  } catch (error) {
    console.error("팀 멤버 추가 실패:", error);
    return NextResponse.json(
      { error: "팀 멤버를 추가할 수 없습니다." },
      { status: 500 }
    );
  }
}
