/**
 * @file src/app/api/menu/favorites/route.ts
 * @description 내 즐겨찾기 메뉴 조회 · 맞추기.
 * 초보자 가이드:
 * - GET → string[] (순서대로)
 * - PUT { menuCodes } (최대 30개) → 배열 순서가 순서, 빠진 것은 지우고 남은 것의 폴더는 유지
 */
import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getFavorites, syncFavorites } from "@/lib/menu/menu-service";
import { menuFailure } from "@/lib/menu/menu-route";

export async function GET() {
  const { user, error } = await requireAuth();
  if (error) return error;
  try {
    return NextResponse.json(await getFavorites(user!.id));
  } catch (err) {
    return menuFailure(err, "즐겨찾기 조회");
  }
}

export async function PUT(request: NextRequest) {
  const { user, error } = await requireAuth();
  if (error) return error;
  try {
    return NextResponse.json(await syncFavorites(user!.id, (await request.json())?.menuCodes));
  } catch (err) {
    return menuFailure(err, "즐겨찾기 저장");
  }
}
