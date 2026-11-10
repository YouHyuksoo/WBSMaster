/**
 * @file src/app/api/menu/categories/[code]/route.ts
 * @description 메뉴 그룹 수정 · 삭제. ADMIN 전용.
 * 초보자 가이드:
 * - PATCH { label?, icon?, isActive? } — '__ROOT__' 는 바꿀 수 없다
 * - DELETE — 메뉴가 남아 있으면 409
 */
import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { deleteCategory, updateCategory } from "@/lib/menu/menu-service";
import { menuFailure } from "@/lib/menu/menu-route";

type Context = { params: Promise<{ code: string }> };

export async function PATCH(request: NextRequest, context: Context) {
  const { user, error } = await requireAuth();
  if (error) return error;
  if (user!.role !== "ADMIN") return NextResponse.json({ error: "관리자만 사용할 수 있습니다." }, { status: 403 });
  try {
    const { code } = await context.params;
    return NextResponse.json(await updateCategory(code, await request.json()));
  } catch (err) {
    return menuFailure(err, "메뉴 그룹 수정");
  }
}

export async function DELETE(_request: NextRequest, context: Context) {
  const { user, error } = await requireAuth();
  if (error) return error;
  if (user!.role !== "ADMIN") return NextResponse.json({ error: "관리자만 사용할 수 있습니다." }, { status: 403 });
  try {
    const { code } = await context.params;
    await deleteCategory(code);
    return NextResponse.json({ success: true });
  } catch (err) {
    return menuFailure(err, "메뉴 그룹 삭제");
  }
}
