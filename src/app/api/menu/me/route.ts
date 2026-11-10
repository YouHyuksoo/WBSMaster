/**
 * @file src/app/api/menu/me/route.ts
 * @description 로그인 사용자가 쓸 수 있는 메뉴 (좌측 메뉴 흐림 표시 · 화면 접근 차단에 쓴다).
 * 초보자 가이드:
 * - GET: { role, allowedMenus } — ADMIN 은 allowedMenus=null (전부 허용)
 */
import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { allowedMenusFor } from "@/lib/menu/menu-service";
import { menuFailure } from "@/lib/menu/menu-route";

export async function GET() {
  const { user, error } = await requireAuth();
  if (error) return error;
  try {
    return NextResponse.json({ role: user!.role, allowedMenus: await allowedMenusFor(user!.role) });
  } catch (err) {
    return menuFailure(err, "내 메뉴 권한 조회");
  }
}
