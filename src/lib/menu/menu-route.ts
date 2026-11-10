/**
 * @file src/lib/menu/menu-route.ts
 * @description 메뉴 관리 API 라우트 공용 응답 도우미입니다.
 *
 * 초보자 가이드:
 * - menuFailure(err): MenuError 는 그 상태 코드로, 그 밖의 오류는 500 으로 바꾼다.
 * - adminOnly(role): ADMIN 이 아니면 403 응답 (메뉴 관리 · 권한 관리 API 전용).
 */
import { NextResponse } from "next/server";
import { MenuError } from "./menu-service";

export function menuFailure(err: unknown, label: string) {
  if (err instanceof MenuError) return NextResponse.json({ error: err.message }, { status: err.status });
  if (err instanceof SyntaxError) return NextResponse.json({ error: "JSON 입력을 확인해주세요." }, { status: 400 });
  console.error(`${label} 실패:`, err);
  return NextResponse.json({ error: `${label}에 실패했습니다.` }, { status: 500 });
}

export function adminOnly(role: string | undefined) {
  return role === "ADMIN" ? null : NextResponse.json({ error: "관리자만 사용할 수 있습니다." }, { status: 403 });
}
