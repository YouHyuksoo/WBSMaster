/**
 * @file src/app/api/menu/favorites/folders/[id]/route.ts
 * @description 내 즐겨찾기 폴더 이름 바꾸기 · 지우기 (남의 폴더는 404).
 * 초보자 가이드:
 * - PATCH { name }
 * - DELETE — 안의 메뉴는 기본 즐겨찾기로 돌아간다
 */
import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { deleteFolder, renameFolder } from "@/lib/menu/menu-service";
import { menuFailure } from "@/lib/menu/menu-route";

type Context = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, context: Context) {
  const { user, error } = await requireAuth();
  if (error) return error;
  try {
    const { id } = await context.params;
    const owner = { userId: user!.id }; // 본인 폴더만 (서비스가 소유자를 비교)
    return NextResponse.json(await renameFolder(owner.userId, id, (await request.json())?.name));
  } catch (err) {
    return menuFailure(err, "즐겨찾기 폴더 이름 바꾸기");
  }
}

export async function DELETE(_request: NextRequest, context: Context) {
  const { user, error } = await requireAuth();
  if (error) return error;
  try {
    const { id } = await context.params;
    const owner = { userId: user!.id }; // 본인 폴더만 (서비스가 소유자를 비교)
    await deleteFolder(owner.userId, id);
    return NextResponse.json({ success: true });
  } catch (err) {
    return menuFailure(err, "즐겨찾기 폴더 삭제");
  }
}
