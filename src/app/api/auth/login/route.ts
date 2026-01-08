/**
 * @file src/app/api/auth/login/route.ts
 * @description
 * 로그인 API 엔드포인트입니다.
 * users 테이블에서 이메일/비밀번호를 체크하여 인증합니다.
 * 인증 성공 시 userId 쿠키를 설정합니다.
 *
 * 초보자 가이드:
 * 1. **POST /api/auth/login**: 이메일/비밀번호로 로그인
 * 2. **응답**: 성공 시 사용자 정보 반환 + userId 쿠키 설정
 * 3. **쿠키**: httpOnly 쿠키로 7일간 유지
 *
 * @example
 * POST /api/auth/login
 * Body: { email: "user@example.com", password: "admin123" }
 */

import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";

/**
 * POST /api/auth/login
 * 이메일/비밀번호로 로그인
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password } = body;

    // 필수 필드 체크
    if (!email || !password) {
      return NextResponse.json(
        { error: "이메일과 비밀번호를 입력해주세요." },
        { status: 400 }
      );
    }

    // 사용자 조회
    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        password: true,
        name: true,
        avatar: true,
        role: true,
        createdAt: true,
      },
    });

    // 사용자가 없거나 비밀번호가 틀린 경우
    if (!user || user.password !== password) {
      return NextResponse.json(
        { error: "이메일 또는 비밀번호가 올바르지 않습니다." },
        { status: 401 }
      );
    }

    // 쿠키에 userId 저장 (7일간 유지)
    const cookieStore = await cookies();
    cookieStore.set("userId", user.id, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7, // 7일
      path: "/",
    });

    // 비밀번호 제외하고 반환
    const { password: _, ...userWithoutPassword } = user;

    return NextResponse.json({
      message: "로그인 성공",
      user: userWithoutPassword,
    });
  } catch (error) {
    console.error("로그인 에러:", error);
    return NextResponse.json(
      { error: "로그인 처리 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
