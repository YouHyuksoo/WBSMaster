/**
 * @file src/lib/session-cookie.ts
 * @description
 * 로그인 세션 쿠키를 만들고 확인하는 유일한 곳입니다 (서버 전용. 화면 쪽 세션 만료 처리는 src/lib/session.ts).
 * 쿠키 값은 서버 비밀키(SESSION_SECRET)로 서명한 토큰이라, 사용자 ID 를 알아도 위조할 수 없습니다.
 *
 * 초보자 가이드:
 * - 회귀: 예전에는 쿠키에 userId 를 그대로 넣었다. 사용자 목록에서 본 ADMIN 의 id 를 쿠키에 적으면 관리자가 됐다.
 * - 토큰 모양: `v1.<userId(base64url)>.<만료 시각(ms)>.<HMAC-SHA256 서명>`
 * - readSessionUserId(): 쿠키를 확인해 userId 를 돌려준다 (없음 · 위조 · 만료면 null)
 * - setSessionCookie(userId, secure) / clearSessionCookie(): 로그인 · 로그아웃에서만 쓴다
 * - 다른 파일에서 next/headers 의 cookies 를 직접 쓰지 않는다 (session-cookie.test.ts 가 검사).
 * - SESSION_SECRET 은 32자 이상이어야 한다. 임시 기본값은 없다(없으면 로그인 · 인증 실패).
 *   값을 바꾸면 모든 사용자의 로그인이 풀린다. 강제 로그아웃이 필요할 때 이 값을 바꾼다.
 */

import { createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";

/** 세션 쿠키 이름 */
export const SESSION_COOKIE = "wbs_session";
/** 서명 없던 예전 쿠키 (읽지 않고 지우기만 한다) */
const LEGACY_COOKIE = "userId";
/** 세션 유지 시간: 7일 */
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;
const VERSION = "v1";

function secret(): string {
  const value = process.env.SESSION_SECRET;
  if (!value || value.length < 32) {
    throw new Error("SESSION_SECRET 환경 변수가 없거나 32자보다 짧습니다. .env.local 에 설정하세요 (.env.example 참고).");
  }
  return value;
}

function sign(payload: string): string {
  return createHmac("sha256", secret()).update(payload).digest("base64url");
}

/** userId 로 서명된 세션 토큰을 만든다 */
export function createSessionToken(userId: string, now: number = Date.now()): string {
  const id = Buffer.from(userId, "utf8").toString("base64url");
  const payload = `${VERSION}.${id}.${now + SESSION_MAX_AGE_SECONDS * 1000}`;
  return `${payload}.${sign(payload)}`;
}

/**
 * 세션 토큰을 확인한다.
 * @returns 서명이 맞고 만료 전이면 userId, 아니면 null
 * @throws SESSION_SECRET 이 없으면 Error
 */
export function verifySessionToken(token: string | null | undefined, now: number = Date.now()): string | null {
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length !== 4 || parts[0] !== VERSION) return null;
  const [version, id, expires, signature] = parts;
  const expected = Buffer.from(sign(`${version}.${id}.${expires}`));
  const given = Buffer.from(signature);
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) return null;
  if (!/^\d+$/.test(expires) || Number(expires) <= now) return null;
  return Buffer.from(id, "base64url").toString("utf8") || null;
}

/** 요청 쿠키에서 로그인한 사용자 ID 를 읽는다 (없음 · 위조 · 만료면 null) */
export async function readSessionUserId(): Promise<string | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  try {
    return verifySessionToken(token);
  } catch (error) {
    // 설정 누락을 조용히 "비로그인"으로 넘기지 않게 서버 로그에 남긴다
    console.error("세션 확인 실패:", error instanceof Error ? error.message : error);
    return null;
  }
}

/** 로그인 성공 시 세션 쿠키를 심는다 (예전 userId 쿠키는 지운다) */
export async function setSessionCookie(userId: string, secure: boolean): Promise<void> {
  const token = createSessionToken(userId);
  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure, // HTTPS 접속 시에만 Secure 적용
    sameSite: "lax",
    maxAge: SESSION_MAX_AGE_SECONDS,
    path: "/",
  });
  store.delete(LEGACY_COOKIE);
}

/** 로그아웃: 세션 쿠키와 예전 userId 쿠키를 지운다 */
export async function clearSessionCookie(): Promise<void> {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
  store.delete(LEGACY_COOKIE);
}
