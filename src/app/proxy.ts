/**
 * @file src/app/proxy.ts
 * @description
 * Next.js 16 Proxy 파일입니다. (기존 middleware.ts에서 변환)
 * Supabase Auth 세션을 갱신하고, 보호된 라우트 접근을 관리합니다.
 *
 * 초보자 가이드:
 * 1. **세션 갱신**: 매 요청마다 Supabase 세션을 확인하고 갱신
 * 2. **보호된 라우트**: /dashboard/* 경로는 로그인 필요
 * 3. **리다이렉션**: 미인증 사용자는 로그인 페이지로 이동
 *
 * 수정 방법:
 * - 보호할 경로 추가: protectedRoutes 배열에 경로 추가
 * - 공개 경로 추가: authRoutes 배열에 경로 추가
 *
 * @see https://nextjs.org/docs/app/api-reference/file-conventions/proxy
 */

import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/** 로그인이 필요한 보호된 경로 */
const protectedRoutes = [
  "/dashboard",
  "/kanban",
  "/requirements",
  "/calendar",
  "/members",
  "/settings",
  "/help",
];

/** 로그인 상태에서 접근 불가한 경로 (로그인/회원가입 페이지) */
const authRoutes = ["/login", "/register"];

/**
 * Proxy 함수 - Next.js 16에서 middleware를 대체
 * @param request - Next.js 요청 객체
 */
export async function proxy(request: NextRequest) {
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

  // 세션 갱신 (중요: getUser()를 호출해야 세션이 갱신됨)
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;

  // 보호된 경로 체크
  const isProtectedRoute = protectedRoutes.some((route) =>
    pathname.startsWith(route)
  );

  // 인증 경로 체크 (로그인/회원가입)
  const isAuthRoute = authRoutes.some((route) => pathname.startsWith(route));

  // 미인증 사용자가 보호된 경로 접근 시 → 로그인 페이지로 리다이렉트
  if (isProtectedRoute && !user) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("redirectTo", pathname);
    return NextResponse.redirect(url);
  }

  // 인증된 사용자가 로그인/회원가입 페이지 접근 시 → 대시보드로 리다이렉트
  if (isAuthRoute && user) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}

/** Proxy가 실행될 경로 설정 */
export const config = {
  matcher: [
    /*
     * 다음 경로를 제외한 모든 요청에 proxy 적용:
     * - _next/static (정적 파일)
     * - _next/image (이미지 최적화)
     * - favicon.ico (파비콘)
     * - 이미지 파일들
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
