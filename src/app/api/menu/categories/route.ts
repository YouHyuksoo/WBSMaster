/**
 * @file src/app/api/menu/categories/route.ts
 * @description 메뉴 그룹 만들기. ADMIN 전용.
 * 초보자 가이드:
 * - POST { code, label, icon?, isActive? } → 맨 끝 순서로 만든다. 코드는 영문 대문자 · 숫자 · _, '__ROOT__' 불가
 */
import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { createCategory } from "@/lib/menu/menu-service";
import { adminOnly, menuFailure } from "@/lib/menu/menu-route";

export async function POST(request: NextRequest) {
  const { user, error } = await requireAuth();
  if (error) return error;
  const denied = adminOnly(user!.role);
  if (denied) return denied;
  try {
    return NextResponse.json(await createCategory(await request.json()), { status: 201 });
  } catch (err) {
    return menuFailure(err, "메뉴 그룹 만들기");
  }
}
