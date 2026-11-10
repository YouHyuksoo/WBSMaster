/**
 * @file src/app/api/menu/unassigned/route.ts
 * @description 어느 그룹에도 놓이지 않은 메뉴 코드 목록 (메뉴 관리 화면의 미배치 메뉴). ADMIN 전용.
 * 초보자 가이드:
 * - GET: string[] — menu-config.ts 등록부에는 있지만 배치 행이 없는 메뉴
 */
import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getUnassignedMenus } from "@/lib/menu/menu-service";
import { adminOnly, menuFailure } from "@/lib/menu/menu-route";

export async function GET() {
  const { user, error } = await requireAuth();
  if (error) return error;
  const denied = adminOnly(user!.role);
  if (denied) return denied;
  try {
    return NextResponse.json(await getUnassignedMenus());
  } catch (err) {
    return menuFailure(err, "미배치 메뉴 조회");
  }
}
