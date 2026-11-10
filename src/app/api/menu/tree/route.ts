/**
 * @file src/app/api/menu/tree/route.ts
 * @description 메뉴 그룹 · 배치 트리 (좌측 메뉴 · 메뉴 관리 · 권한 관리가 같이 쓴다).
 * 초보자 가이드:
 * - GET: [{ code, label, icon, sortOrder, isActive, menus: [{ menuCode, sortOrder }] }] (비활성 그룹 포함)
 * - 로그인한 사용자 누구나 읽는다. 바꾸는 API 는 ADMIN 전용.
 */
import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getMenuTree } from "@/lib/menu/menu-service";
import { menuFailure } from "@/lib/menu/menu-route";

export async function GET() {
  const { error } = await requireAuth();
  if (error) return error;
  try {
    return NextResponse.json(await getMenuTree());
  } catch (err) {
    return menuFailure(err, "메뉴 트리 조회");
  }
}
