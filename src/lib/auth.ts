/**
 * @file src/lib/auth.ts
 * @description
 * 인증 관련 헬퍼 함수들입니다.
 * 쿠키 기반 자체 인증 시스템을 사용합니다.
 *
 * 초보자 가이드:
 * 1. **getUser**: 현재 로그인한 사용자 정보 조회 (쿠키에서 userId 읽음)
 * 2. **requireAuth**: 인증 필수 API에서 사용자 검증
 * 3. **getUserOrNull**: 인증 선택적 API에서 사용
 *
 * @example
 * // API 라우트에서 사용
 * import { requireAuth } from '@/lib/auth';
 *
 * export async function POST(request: NextRequest) {
 *   const { user, error } = await requireAuth();
 *   if (error) return error;
 *   // user를 사용한 로직
 * }
 */

import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/** 사용자 타입 (DB User 기반) */
export type AuthUser = {
  id: string;
  email: string;
  name?: string | null;
  avatar?: string | null;
  role: string;
};

/** 인증 결과 타입 */
export type AuthResult = {
  user: AuthUser | null;
  error: NextResponse | null;
};

/**
 * 현재 로그인한 사용자 조회
 * 쿠키에서 userId를 읽어서 DB에서 사용자 정보 조회
 *
 * @returns 사용자 객체 또는 null
 */
export async function getUser(): Promise<AuthUser | null> {
  try {
    const cookieStore = await cookies();
    const userId = cookieStore.get("userId")?.value;

    if (!userId) {
      return null;
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        avatar: true,
        role: true,
      },
    });

    return user;
  } catch {
    return null;
  }
}

/**
 * 인증 필수 검증
 * 인증되지 않은 경우 401 에러 응답 반환
 *
 * @returns 사용자 객체 또는 에러 응답
 */
export async function requireAuth(): Promise<AuthResult> {
  const user = await getUser();

  if (!user) {
    return {
      user: null,
      error: NextResponse.json(
        { error: "인증이 필요합니다." },
        { status: 401 }
      ),
    };
  }

  return { user, error: null };
}

/**
 * 세션 정보 조회 (호환성 유지)
 */
export async function getSession() {
  const user = await getUser();
  if (!user) return null;
  return { user };
}

/**
 * 로그아웃 (쿠키 삭제)
 */
export async function signOut() {
  const cookieStore = await cookies();
  cookieStore.delete("userId");
}
