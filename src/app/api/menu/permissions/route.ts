/**
 * @file src/app/api/menu/permissions/route.ts
 * @description 역할별 메뉴 접근 권한 조회 · 저장. ADMIN 전용.
 * 초보자 가이드:
 * - GET ?role=USER → string[] (허용 메뉴 코드). ADMIN 은 null (전부)
 * - PUT { role, menuCodes } → 그 역할의 권한을 통째로 바꾼다. ADMIN 역할 · ADMIN 전용 메뉴는 400
 */
import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { allowedMenusFor, parseRole, replacePermissions } from "@/lib/menu/menu-service";
import { adminOnly, menuFailure } from "@/lib/menu/menu-route";

export async function GET(request: NextRequest) {
  const { user, error } = await requireAuth();
  if (error) return error;
  const denied = adminOnly(user!.role);
  if (denied) return denied;
  try {
    const role = parseRole(new URL(request.url).searchParams.get("role"));
    return NextResponse.json(await allowedMenusFor(role));
  } catch (err) {
    return menuFailure(err, "메뉴 권한 조회");
  }
}

export async function PUT(request: NextRequest) {
  const { user, error } = await requireAuth();
  if (error) return error;
  const denied = adminOnly(user!.role);
  if (denied) return denied;
  try {
    const body = await request.json();
    return NextResponse.json(await replacePermissions(body?.role, body?.menuCodes));
  } catch (err) {
    return menuFailure(err, "메뉴 권한 저장");
  }
}
