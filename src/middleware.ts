/**
 * @file src/middleware.ts
 * @description
 * Next.js 미들웨어로 인증 보호를 구현합니다.
 * 로그인하지 않은 사용자는 대시보드 접근 시 로그인 페이지로 리다이렉트됩니다.
 *
 * 초보자 가이드:
 * 1. **보호된 경로**: /dashboard/* 경로는 로그인 필요
 * 2. **공개 경로**: /, /login, /signup, /auth/* 는 누구나 접근 가능
 * 3. **세션 갱신**: 매 요청마다 세션 토큰 갱신
 *
 * 수정 방법:
 * - 보호 경로 추가: protectedPaths 배열에 추가
 * - 공개 경로 추가: publicPaths 배열에 추가
 */

import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/** 보호된 경로 (로그인 필요) */
const protectedPaths = ["/dashboard"];

/** 공개 경로 (로그인 불필요) */
const publicPaths = ["/", "/login", "/signup", "/auth"];

/**
 * 경로가 보호된 경로인지 확인
 */
function isProtectedPath(pathname: string): boolean {
  return protectedPaths.some((path) => pathname.startsWith(path));
}

/**
 * 경로가 공개 경로인지 확인
 */
function isPublicPath(pathname: string): boolean {
  return publicPaths.some((path) => pathname === path || pathname.startsWith(`${path}/`));
}

/**
 * 미들웨어 함수
 * 모든 요청에 대해 세션을 확인하고 리다이렉트 처리
 */
export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // 세션 갱신을 위해 getUser() 호출
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;

  // 보호된 경로에 로그인하지 않은 사용자가 접근하면 로그인 페이지로 리다이렉트
  if (isProtectedPath(pathname) && !user) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("redirectTo", pathname);
    return NextResponse.redirect(url);
  }

  // 로그인한 사용자가 로그인/회원가입 페이지에 접근하면 대시보드로 리다이렉트
  if ((pathname === "/login" || pathname === "/signup") && user) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}

/**
 * 미들웨어가 적용될 경로 설정
 * - 정적 파일, API 라우트(일부) 제외
 */
export const config = {
  matcher: [
    /*
     * 다음 경로 제외:
     * - _next/static (정적 파일)
     * - _next/image (이미지 최적화 파일)
     * - favicon.ico (파비콘)
     * - public 폴더의 파일들
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
