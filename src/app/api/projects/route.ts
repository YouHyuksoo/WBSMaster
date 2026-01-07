/**
 * @file src/app/api/projects/route.ts
 * @description
 * 프로젝트 API 라우트입니다.
 * 프로젝트 목록 조회(GET), 프로젝트 생성(POST)을 처리합니다.
 *
 * 초보자 가이드:
 * 1. **GET /api/projects**: 모든 프로젝트 목록 조회
 * 2. **POST /api/projects**: 새 프로젝트 생성
 *
 * 수정 방법:
 * - 필터링 추가: GET에서 searchParams 처리
 * - 필드 추가: POST의 body에서 새 필드 처리
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ProjectStatus, Prisma } from "@prisma/client";
import { requireAuth } from "@/lib/auth";

/**
 * 프로젝트 목록 조회
 * GET /api/projects
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") as ProjectStatus | null;
    const ownerId = searchParams.get("ownerId");

    // 필터 조건 구성
    const where: Prisma.ProjectWhereInput = {};

    if (status && Object.values(ProjectStatus).includes(status)) where.status = status;
    if (ownerId) where.ownerId = ownerId;

    const projects = await prisma.project.findMany({
      where,
      include: {
        owner: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true,
          },
        },
        teamMembers: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                avatar: true,
              },
            },
          },
        },
        _count: {
          select: {
            tasks: true,
            requirements: true,
          },
        },
      },
      orderBy: {
        updatedAt: "desc",
      },
    });

    return NextResponse.json(projects);
  } catch (error) {
    console.error("프로젝트 목록 조회 실패:", error);
    return NextResponse.json(
      { error: "프로젝트 목록을 조회할 수 없습니다." },
      { status: 500 }
    );
  }
}

/**
 * 프로젝트 생성
 * POST /api/projects
 * (인증 필요)
 */
export async function POST(request: NextRequest) {
  try {
    // 인증 확인
    const { user, error } = await requireAuth();
    if (error) return error;

    const body = await request.json();
    const { name, description, startDate, endDate } = body;

    // 필수 필드 검증
    if (!name) {
      return NextResponse.json(
        { error: "프로젝트 이름은 필수입니다." },
        { status: 400 }
      );
    }

    // 소유자 ID는 현재 로그인한 사용자
    const ownerId = user!.id;

    // 사용자가 users 테이블에 없으면 자동 생성 (Supabase Auth 연동)
    await prisma.user.upsert({
      where: { id: ownerId },
      update: {}, // 이미 있으면 아무것도 안함
      create: {
        id: ownerId,
        email: user!.email!,
        name: user!.user_metadata?.full_name || user!.user_metadata?.name || null,
        avatar: user!.user_metadata?.avatar_url || null,
      },
    });

    const project = await prisma.project.create({
      data: {
        name,
        description,
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
        ownerId,
        status: "PLANNING",
        progress: 0,
      },
      include: {
        owner: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true,
          },
        },
      },
    });

    // 프로젝트 생성자를 팀 멤버로 자동 추가 (OWNER 역할)
    await prisma.teamMember.create({
      data: {
        projectId: project.id,
        userId: ownerId,
        role: "OWNER",
      },
    });

    return NextResponse.json(project, { status: 201 });
  } catch (error) {
    console.error("프로젝트 생성 실패:", error);
    return NextResponse.json(
      { error: "프로젝트를 생성할 수 없습니다." },
      { status: 500 }
    );
  }
}
