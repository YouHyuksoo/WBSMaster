/**
 * @file src/app/api/admin/chatgpt-auth/route.ts
 * @description
 * 관리자 전용: 서버가 공용으로 쓰는 회사 ChatGPT 구독 계정(OAuth)을 연결·확인·해제합니다.
 *
 * 초보자 가이드:
 * 1. **GET**: 연결 상태 { connected, accountEmail, expiresAt, error }
 * 2. **POST { action: "start" }**: 디바이스 코드 로그인 시작 → { verificationUri, userCode, deviceCode, intervalSec, expiresAt }
 * 3. **POST { action: "poll", deviceCode }**: 승인 여부 → { state: pending | connected | expired | denied }
 * 4. **DELETE**: 연결 해제 (서버 토큰 파일 삭제)
 * - 모두 ADMIN 만. 토큰 값은 응답에 담지 않는다 (서버 파일 CHATGPT_AUTH_FILE 에만 있음).
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAuth, type AuthUser } from "@/lib/auth";
import {
  clearChatGptAuth,
  getChatGptAuthStatus,
  pollDeviceLogin,
  startDeviceLogin,
} from "@/lib/llm/chatgpt/token-store";

/** 관리자가 아니면 403 응답 */
function adminOnly(user: AuthUser): NextResponse | null {
  if (user.role !== "ADMIN") {
    return NextResponse.json({ error: "관리자만 회사 ChatGPT 연결을 관리할 수 있습니다." }, { status: 403 });
  }
  return null;
}

export async function GET() {
  const { user, error } = await requireAuth();
  if (error) return error;
  const denied = adminOnly(user!);
  if (denied) return denied;
  return NextResponse.json(await getChatGptAuthStatus());
}

export async function POST(request: NextRequest) {
  const { user, error } = await requireAuth();
  if (error) return error;
  const denied = adminOnly(user!);
  if (denied) return denied;
  try {
    const body = (await request.json()) as { action?: string; deviceCode?: string };
    if (body.action === "start") return NextResponse.json(await startDeviceLogin());
    if (body.action === "poll" && typeof body.deviceCode === "string") {
      return NextResponse.json({ state: await pollDeviceLogin(body.deviceCode) });
    }
    return NextResponse.json({ error: "action 은 start 또는 poll(deviceCode 필요) 입니다." }, { status: 400 });
  } catch (e) {
    console.error("ChatGPT 연결 처리 실패:", e instanceof Error ? e.message : e);
    return NextResponse.json({ error: "ChatGPT 연결 처리에 실패했습니다." }, { status: 500 });
  }
}

export async function DELETE() {
  const { user, error } = await requireAuth();
  if (error) return error;
  const denied = adminOnly(user!);
  if (denied) return denied;
  await clearChatGptAuth();
  return NextResponse.json({ success: true });
}
