/**
 * @file src/app/api/menu/categories/reorder/route.ts
 * @description 메뉴 그룹 순서 바꾸기 (끌어 놓기). ADMIN 전용.
 * 초보자 가이드:
 * - PATCH { items: [{ code, sortOrder }] }
 */
import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { reorderCategories } from "@/lib/menu/menu-service";
import { adminOnly, menuFailure } from "@/lib/menu/menu-route";

export async function PATCH(request: NextRequest) {
  const { user, error } = await requireAuth();
  if (error) return error;
  const denied = adminOnly(user!.role);
  if (denied) return denied;
  try {
    await reorderCategories((await request.json())?.items);
    return NextResponse.json({ success: true });
  } catch (err) {
    return menuFailure(err, "메뉴 그룹 순서 저장");
  }
}
