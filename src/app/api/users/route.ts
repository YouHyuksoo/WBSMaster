/**
 * @file src/app/api/users/route.ts
 * @description
 * 사용자 API 라우트입니다.
 * 사용자 목록 조회(GET), 사용자 생성(POST)을 처리합니다.
 *
 * 초보자 가이드:
 * 1. **GET /api/users**: 사용자 목록 조회 (팀 멤버 추가 시 검색용)
 *    - ?email=xxx: 이메일로 사용자 검색
 *    - ?name=xxx: 이름으로 사용자 검색
 * 2. **POST /api/users**: 새 사용자 생성 (Supabase Auth 연동 시 사용)
 *
 * 수정 방법:
 * - 필터링 추가: where 조건 추가
 * - 역할 추가: UserRole enum 수정 (schema.prisma)
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * 사용자 목록 조회
 * GET /api/users
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const email = searchParams.get("email");
    const name = searchParams.get("name");
    const search = searchParams.get("search");

    // 필터 조건 구성
    const where: {
      email?: { contains: string; mode: "insensitive" };
      name?: { contains: string; mode: "insensitive" };
      OR?: Array<{
        email?: { contains: string; mode: "insensitive" };
        name?: { contains: string; mode: "insensitive" };
      }>;
    } = {};

    if (email) {
      where.email = { contains: email, mode: "insensitive" };
    }
    if (name) {
      where.name = { contains: name, mode: "insensitive" };
    }
    if (search) {
      where.OR = [
        { email: { contains: search, mode: "insensitive" } },
        { name: { contains: search, mode: "insensitive" } },
      ];
    }

    const users = await prisma.user.findMany({
      where,
      select: {
        id: true,
        email: true,
        name: true,
        avatar: true,
        role: true,
        createdAt: true,
        _count: {
          select: {
            ownedProjects: true,
            teamMembers: true,
            taskAssignments: true, // 다대다 관계로 변경됨
          },
        },
      },
      orderBy: {
        name: "asc",
      },
      take: 50, // 최대 50명까지 조회
    });

    return NextResponse.json(users);
  } catch (error) {
    console.error("사용자 목록 조회 실패:", error);
    return NextResponse.json(
      { error: "사용자 목록을 조회할 수 없습니다." },
      { status: 500 }
    );
  }
}

/**
 * 사용자 생성 (회원가입)
 * POST /api/users
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, email, password, name, avatar } = body;

    // 필수 필드 검증
    if (!email) {
      return NextResponse.json(
        { error: "이메일은 필수입니다." },
        { status: 400 }
      );
    }

    // 이미 존재하는 사용자인지 확인
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "이미 등록된 이메일입니다." },
        { status: 409 }
      );
    }

    const user = await prisma.user.create({
      data: {
        ...(id && { id }),
        email,
        password: password || "admin123", // 기본 비밀번호
        name: name || email.split("@")[0],
        avatar,
        role: "MEMBER",
      },
      select: {
        id: true,
        email: true,
        name: true,
        avatar: true,
        role: true,
        createdAt: true,
      },
    });

    return NextResponse.json(user, { status: 201 });
  } catch (error) {
    console.error("사용자 생성 실패:", error);
    return NextResponse.json(
      { error: "사용자를 생성할 수 없습니다." },
      { status: 500 }
    );
  }
}
