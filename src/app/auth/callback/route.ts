/**
 * @file src/app/auth/callback/route.ts
 * @description
 * Supabase OAuth 콜백 처리 라우트입니다.
 * 소셜 로그인(Google, GitHub) 완료 후 이 라우트로 리다이렉트됩니다.
 *
 * 초보자 가이드:
 * 1. **code**: Supabase가 전달하는 인증 코드
 * 2. **exchangeCodeForSession**: 코드를 세션으로 교환
 * 3. **next**: 로그인 후 리다이렉트할 경로
 *
 * 흐름:
 * 1. 사용자가 소셜 로그인 버튼 클릭
 * 2. Supabase → OAuth 제공자 → Supabase → 이 콜백 라우트
 * 3. 세션 생성 후 next 파라미터로 리다이렉트
 */

import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);

  // 인증 코드 및 리다이렉트 경로 추출
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/dashboard";

  if (code) {
    const supabase = await createClient();

    // 인증 코드를 세션으로 교환
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      // 성공: 지정된 경로로 리다이렉트
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // 에러 발생 시 로그인 페이지로 리다이렉트
  return NextResponse.redirect(`${origin}/login?error=auth_callback_error`);
}
