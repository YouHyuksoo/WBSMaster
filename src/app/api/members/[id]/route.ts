/**
 * @file src/app/api/members/[id]/route.ts
 * @description
 * 개별 팀 멤버 API 라우트입니다.
 * 팀 멤버 상세 조회(GET), 역할 수정(PATCH), 멤버 제거(DELETE)를 처리합니다.
 *
 * 초보자 가이드:
 * 1. **GET /api/members/:id**: 팀 멤버 상세 정보 조회
 * 2. **PATCH /api/members/:id**: 팀 멤버 역할 수정
 * 3. **DELETE /api/members/:id**: 프로젝트에서 멤버 제거
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
 * 팀 멤버 상세 조회
 * GET /api/members/:id
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    const member = await prisma.teamMember.findUnique({
      where: { id },
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

    if (!member) {
      return NextResponse.json(
        { error: "팀 멤버를 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    return NextResponse.json(member);
  } catch (error) {
    console.error("팀 멤버 조회 실패:", error);
    return NextResponse.json(
      { error: "팀 멤버를 조회할 수 없습니다." },
      { status: 500 }
    );
  }
}

/**
 * 팀 멤버 정보 수정
 * PATCH /api/members/:id
 * @param role - 프로젝트 역할 (OWNER, MANAGER, MEMBER)
 * @param customRole - 커스텀 역할명 (예: PMO, 프로젝트 총괄 등)
 * @param department - 부서 (예: 개발팀, 기획팀 등)
 * @param position - 직급 (예: 사원, 대리, 과장 등)
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { role, customRole, department, position } = body;

    // 멤버 존재 확인
    const existing = await prisma.teamMember.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { error: "팀 멤버를 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    const member = await prisma.teamMember.update({
      where: { id },
      data: {
        ...(role !== undefined && { role }),
        ...(customRole !== undefined && { customRole: customRole || null }),
        ...(department !== undefined && { department: department || null }),
        ...(position !== undefined && { position: position || null }),
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

    return NextResponse.json(member);
  } catch (error) {
    console.error("팀 멤버 수정 실패:", error);
    return NextResponse.json(
      { error: "팀 멤버를 수정할 수 없습니다." },
      { status: 500 }
    );
  }
}

/**
 * 팀 멤버 제거
 * DELETE /api/members/:id
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    // 멤버 존재 확인
    const existing = await prisma.teamMember.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { error: "팀 멤버를 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    await prisma.teamMember.delete({ where: { id } });

    return NextResponse.json({ message: "팀 멤버가 제거되었습니다." });
  } catch (error) {
    console.error("팀 멤버 제거 실패:", error);
    return NextResponse.json(
      { error: "팀 멤버를 제거할 수 없습니다." },
      { status: 500 }
    );
  }
}
