/**
 * @file src/app/api/auth/logout/route.ts
 * @description
 * 로그아웃 API 엔드포인트입니다.
 * 세션 쿠키를 삭제하여 세션을 종료합니다.
 *
 * 초보자 가이드:
 * 1. **POST /api/auth/logout**: 로그아웃 처리
 * 2. **동작**: 세션 쿠키 삭제 (예전 userId 쿠키도 함께 지운다)
 *
 * @example
 * POST /api/auth/logout
 */

import { NextResponse } from "next/server";
import { clearSessionCookie } from "@/lib/session-cookie";

/**
 * POST /api/auth/logout
 * 로그아웃 처리 (쿠키 삭제)
 */
export async function POST() {
  try {
    await clearSessionCookie();

    return NextResponse.json({
      message: "로그아웃 성공",
    });
  } catch (error) {
    console.error("로그아웃 에러:", error);
    return NextResponse.json(
      { error: "로그아웃 처리 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
