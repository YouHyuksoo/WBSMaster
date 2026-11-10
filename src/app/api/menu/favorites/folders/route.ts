/**
 * @file src/app/api/menu/favorites/folders/route.ts
 * @description 내 즐겨찾기 폴더 조회 · 만들기.
 * 초보자 가이드:
 * - GET → { folders: [{ id, name, sortOrder }], assignments: [{ menuCode, folderId }] }
 * - POST { name } → 만든 폴더
 */
import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { createFolder, getFolders } from "@/lib/menu/menu-service";
import { menuFailure } from "@/lib/menu/menu-route";

export async function GET() {
  const { user, error } = await requireAuth();
  if (error) return error;
  try {
    return NextResponse.json(await getFolders(user!.id));
  } catch (err) {
    return menuFailure(err, "즐겨찾기 폴더 조회");
  }
}

export async function POST(request: NextRequest) {
  const { user, error } = await requireAuth();
  if (error) return error;
  try {
    return NextResponse.json(await createFolder(user!.id, (await request.json())?.name), { status: 201 });
  } catch (err) {
    return menuFailure(err, "즐겨찾기 폴더 만들기");
  }
}
