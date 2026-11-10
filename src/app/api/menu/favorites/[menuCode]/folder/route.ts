/**
 * @file src/app/api/menu/favorites/[menuCode]/folder/route.ts
 * @description 내 즐겨찾기 메뉴를 폴더로 옮긴다.
 * 초보자 가이드:
 * - PUT { folderId } — null 이면 기본 즐겨찾기. 즐겨찾기에 없는 메뉴 · 남의 폴더는 404
 */
import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { moveFavoriteToFolder } from "@/lib/menu/menu-service";
import { menuFailure } from "@/lib/menu/menu-route";

type Context = { params: Promise<{ menuCode: string }> };

export async function PUT(request: NextRequest, context: Context) {
  const { user, error } = await requireAuth();
  if (error) return error;
  try {
    const { menuCode } = await context.params;
    const owner = { userId: user!.id }; // 본인 즐겨찾기만
    await moveFavoriteToFolder(owner.userId, menuCode, (await request.json())?.folderId);
    return NextResponse.json({ success: true });
  } catch (err) {
    return menuFailure(err, "즐겨찾기 폴더 이동");
  }
}
