/**
 * @file src/app/api/auth/login/route.ts
 * @description
 * 로그인 API 엔드포인트입니다.
 * users 테이블에서 이메일/비밀번호를 체크하여 인증합니다.
 * 인증 성공 시 서명된 세션 쿠키를 설정합니다 (src/lib/session-cookie.ts).
 *
 * 초보자 가이드:
 * 1. **POST /api/auth/login**: 이메일/비밀번호로 로그인
 * 2. **응답**: 성공 시 사용자 정보 반환 + 세션 쿠키 설정
 * 3. **쿠키**: httpOnly 쿠키로 7일간 유지. 값은 서명된 토큰이라 사용자 ID 를 알아도 만들 수 없다
 * 4. **시도 제한**: 15분 안에 여러 번 틀리면 429 로 막는다 (src/lib/login-throttle.ts)
 * 5. **비밀번호**: 해시와 비교한다 (src/lib/password.ts). 예전 평문 행은 로그인에 성공하면 그 자리에서 해시로 바꿔 저장한다
 *
 * @example
 * POST /api/auth/login
 * Body: { email: "user@example.com", password: "admin123" }
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyPassword, hashPassword } from "@/lib/password";
import { setSessionCookie } from "@/lib/session-cookie";
import { clearLoginFailures, clientIp, loginBlockedSeconds, recordLoginFailure } from "@/lib/login-throttle";

/**
 * POST /api/auth/login
 * 이메일/비밀번호로 로그인
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password } = body;

    // 필수 필드 체크
    if (!email || !password || typeof email !== "string" || typeof password !== "string") {
      return NextResponse.json(
        { error: "이메일과 비밀번호를 입력해주세요." },
        { status: 400 }
      );
    }

    // 비밀번호를 계속 넣어 보는 시도 막기
    const ip = clientIp(request);
    const wait = loginBlockedSeconds(ip, email);
    if (wait > 0) {
      return NextResponse.json(
        { error: `로그인 시도가 너무 많습니다. ${Math.ceil(wait / 60)}분 뒤에 다시 시도해 주세요.` },
        { status: 429, headers: { "Retry-After": String(wait) } }
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
    const check = user ? await verifyPassword(password, user.password) : { ok: false, needsRehash: false };
    if (!user || !check.ok) {
      recordLoginFailure(ip, email);
      return NextResponse.json(
        { error: "이메일 또는 비밀번호가 올바르지 않습니다." },
        { status: 401 }
      );
    }

    // 서명된 세션 쿠키 저장 (7일간 유지). SESSION_SECRET 이 없으면 여기서 실패한다
    await setSessionCookie(user.id, request.url.startsWith("https://"));
    clearLoginFailures(ip, email);

    // 예전 평문 비밀번호는 로그인에 성공한 지금 해시로 바꿔 둔다
    if (check.needsRehash) {
      await prisma.user.update({ where: { id: user.id }, data: { password: await hashPassword(password) } });
    }

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
