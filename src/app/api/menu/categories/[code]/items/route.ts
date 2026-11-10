/**
 * @file src/app/api/menu/categories/[code]/items/route.ts
 * @description 그룹 안 메뉴 순서 바꾸기 (끌어 놓기). ADMIN 전용.
 * 초보자 가이드:
 * - PATCH { items: [{ menuCode, sortOrder }] } — 이 그룹의 메뉴만 받는다
 */
import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { reorderItems } from "@/lib/menu/menu-service";
import { menuFailure } from "@/lib/menu/menu-route";

type Context = { params: Promise<{ code: string }> };

export async function PATCH(request: NextRequest, context: Context) {
  const { user, error } = await requireAuth();
  if (error) return error;
  if (user!.role !== "ADMIN") return NextResponse.json({ error: "관리자만 사용할 수 있습니다." }, { status: 403 });
  try {
    const { code } = await context.params;
    await reorderItems(code, (await request.json())?.items);
    return NextResponse.json({ success: true });
  } catch (err) {
    return menuFailure(err, "메뉴 순서 저장");
  }
}
