/**
 * @file src/app/api/menu/items/move/route.ts
 * @description 메뉴를 다른 그룹으로 옮기거나 미배치로 내보낸다. ADMIN 전용.
 * 초보자 가이드:
 * - PATCH { menuCode, toCategoryCode } — toCategoryCode 가 null 이면 미배치. 옮긴 그룹의 맨 끝에 붙는다
 */
import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { moveMenu } from "@/lib/menu/menu-service";
import { adminOnly, menuFailure } from "@/lib/menu/menu-route";

export async function PATCH(request: NextRequest) {
  const { user, error } = await requireAuth();
  if (error) return error;
  const denied = adminOnly(user!.role);
  if (denied) return denied;
  try {
    await moveMenu(await request.json());
    return NextResponse.json({ success: true });
  } catch (err) {
    return menuFailure(err, "메뉴 이동");
  }
}
