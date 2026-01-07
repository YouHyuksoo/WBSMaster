/**
 * @file src/app/api/users/[id]/route.ts
 * @description
 * 개별 사용자 API 라우트입니다.
 * 사용자 상세 조회(GET), 정보 수정(PATCH), 사용자 삭제(DELETE)를 처리합니다.
 *
 * 초보자 가이드:
 * 1. **GET /api/users/:id**: 사용자 상세 정보 조회
 * 2. **PATCH /api/users/:id**: 사용자 정보 수정 (이름, 역할 등)
 * 3. **DELETE /api/users/:id**: 사용자 삭제 (관련 데이터 주의)
 *
 * 수정 방법:
 * - 반환 필드 추가: select에 필드 추가
 * - 수정 가능 필드 추가: PATCH의 data에 필드 추가
 *
 * @warning 사용자 삭제 시 관련된 TeamMember, Task 등의 데이터도 영향받을 수 있음
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type RouteParams = {
  params: Promise<{ id: string }>;
};

/**
 * 사용자 상세 조회
 * GET /api/users/:id
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        name: true,
        avatar: true,
        role: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            ownedProjects: true,
            teamMembers: true,
            taskAssignments: true,
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: "사용자를 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    return NextResponse.json(user);
  } catch (error) {
    console.error("사용자 조회 실패:", error);
    return NextResponse.json(
      { error: "사용자를 조회할 수 없습니다." },
      { status: 500 }
    );
  }
}

/**
 * 사용자 정보 수정
 * PATCH /api/users/:id
 * @param name - 사용자 이름
 * @param role - 사용자 역할 (ADMIN, MANAGER, MEMBER)
 * @param avatar - 프로필 이미지 URL
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { name, role, avatar } = body;

    // 사용자 존재 확인
    const existing = await prisma.user.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { error: "사용자를 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    // 역할 유효성 검사
    const validRoles = ["EXECUTIVE", "DIRECTOR", "PMO", "PM", "PL", "DEVELOPER", "DESIGNER", "OPERATOR", "MEMBER"];
    if (role && !validRoles.includes(role)) {
      return NextResponse.json(
        { error: "유효하지 않은 역할입니다." },
        { status: 400 }
      );
    }

    const user = await prisma.user.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(role !== undefined && { role }),
        ...(avatar !== undefined && { avatar }),
      },
      select: {
        id: true,
        email: true,
        name: true,
        avatar: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return NextResponse.json(user);
  } catch (error) {
    console.error("사용자 수정 실패:", error);
    return NextResponse.json(
      { error: "사용자를 수정할 수 없습니다." },
      { status: 500 }
    );
  }
}

/**
 * 사용자 삭제
 * DELETE /api/users/:id
 * @warning 관련된 TeamMember 레코드도 함께 삭제됨 (Cascade)
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    // 사용자 존재 확인
    const existing = await prisma.user.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            ownedProjects: true,
            taskAssignments: true,
          },
        },
      },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "사용자를 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    // 프로젝트 소유자인 경우 삭제 불가
    if (existing._count.ownedProjects > 0) {
      return NextResponse.json(
        { error: "프로젝트를 소유하고 있는 사용자는 삭제할 수 없습니다. 먼저 프로젝트를 삭제하거나 소유권을 이전하세요." },
        { status: 400 }
      );
    }

    // 할당된 태스크 해제 (TaskAssignee 레코드 삭제)
    if (existing._count.taskAssignments > 0) {
      await prisma.taskAssignee.deleteMany({
        where: { userId: id },
      });
    }

    // TeamMember 레코드는 onDelete: Cascade로 자동 삭제됨
    await prisma.user.delete({ where: { id } });

    return NextResponse.json({ message: "사용자가 삭제되었습니다." });
  } catch (error) {
    console.error("사용자 삭제 실패:", error);
    return NextResponse.json(
      { error: "사용자를 삭제할 수 없습니다." },
      { status: 500 }
    );
  }
}
