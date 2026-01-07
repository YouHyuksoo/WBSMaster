/**
 * @file src/lib/auth.ts
 * @description
 * 인증 관련 헬퍼 함수들입니다.
 * API 라우트에서 현재 사용자를 가져오거나 인증을 검증할 때 사용합니다.
 *
 * 초보자 가이드:
 * 1. **getUser**: 현재 로그인한 사용자 정보 조회
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

import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import type { User } from "@supabase/supabase-js";

/** 인증 결과 타입 */
export type AuthResult = {
  user: User | null;
  error: NextResponse | null;
};

/**
 * 현재 로그인한 사용자 조회
 * 인증되지 않은 경우 null 반환
 *
 * @returns 사용자 객체 또는 null
 */
export async function getUser(): Promise<User | null> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
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
 * 세션 정보 조회
 * 액세스 토큰과 함께 사용자 정보 반환
 */
export async function getSession() {
  try {
    const supabase = await createClient();
    const { data: { session } } = await supabase.auth.getSession();
    return session;
  } catch {
    return null;
  }
}

/**
 * 로그아웃
 */
export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
}
