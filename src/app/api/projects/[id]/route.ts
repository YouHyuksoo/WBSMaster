/**
 * @file src/app/api/projects/[id]/route.ts
 * @description
 * 개별 프로젝트 API 라우트입니다.
 * 프로젝트 상세 조회(GET), 수정(PATCH), 삭제(DELETE)를 처리합니다.
 *
 * 초보자 가이드:
 * 1. **GET /api/projects/:id**: 프로젝트 상세 정보 조회
 * 2. **PATCH /api/projects/:id**: 프로젝트 정보 수정
 * 3. **DELETE /api/projects/:id**: 프로젝트 삭제
 *
 * 수정 방법:
 * - 반환 필드 추가: include에 관계 추가
 * - 수정 가능 필드 추가: PATCH의 data에 필드 추가
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type RouteParams = {
  params: Promise<{ id: string }>;
};

/**
 * 프로젝트 상세 조회
 * GET /api/projects/:id
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    const project = await prisma.project.findUnique({
      where: { id },
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
                email: true,
                avatar: true,
              },
            },
          },
        },
        tasks: {
          orderBy: { order: "asc" },
        },
        requirements: {
          orderBy: { createdAt: "desc" },
        },
        holidays: {
          orderBy: { date: "asc" },
        },
        _count: {
          select: {
            tasks: true,
            requirements: true,
            teamMembers: true,
          },
        },
      },
    });

    if (!project) {
      return NextResponse.json(
        { error: "프로젝트를 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    return NextResponse.json(project);
  } catch (error) {
    console.error("프로젝트 조회 실패:", error);
    return NextResponse.json(
      { error: "프로젝트를 조회할 수 없습니다." },
      { status: 500 }
    );
  }
}

/**
 * 프로젝트 수정
 * PATCH /api/projects/:id
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { name, description, status, startDate, endDate, progress } = body;

    // 프로젝트 존재 확인
    const existing = await prisma.project.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { error: "프로젝트를 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    const project = await prisma.project.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(description !== undefined && { description }),
        ...(status !== undefined && { status }),
        ...(startDate !== undefined && { startDate: startDate ? new Date(startDate) : null }),
        ...(endDate !== undefined && { endDate: endDate ? new Date(endDate) : null }),
        ...(progress !== undefined && { progress }),
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

    return NextResponse.json(project);
  } catch (error) {
    console.error("프로젝트 수정 실패:", error);
    return NextResponse.json(
      { error: "프로젝트를 수정할 수 없습니다." },
      { status: 500 }
    );
  }
}

/**
 * 프로젝트 삭제
 * DELETE /api/projects/:id
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    // 프로젝트 존재 확인
    const existing = await prisma.project.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { error: "프로젝트를 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    // 프로젝트 삭제 (연관 데이터는 onDelete: Cascade로 자동 삭제)
    await prisma.project.delete({ where: { id } });

    return NextResponse.json({ message: "프로젝트가 삭제되었습니다." });
  } catch (error) {
    console.error("프로젝트 삭제 실패:", error);
    return NextResponse.json(
      { error: "프로젝트를 삭제할 수 없습니다." },
      { status: 500 }
    );
  }
}
