/**
 * @file src/app/api/auth/me/route.ts
 * @description
 * 현재 로그인한 사용자 정보 조회 API입니다.
 */

import { NextResponse } from "next/server";
import { getUser } from "@/lib/auth";

/**
 * GET /api/auth/me
 * 현재 로그인한 사용자 정보 조회
 */
export async function GET() {
  try {
    const user = await getUser();

    if (!user) {
      return NextResponse.json(
        { error: "로그인되지 않았습니다." },
        { status: 401 }
      );
    }

    return NextResponse.json(user);
  } catch (error) {
    console.error("사용자 정보 조회 실패:", error);
    return NextResponse.json(
      { error: "사용자 정보를 조회할 수 없습니다." },
      { status: 500 }
    );
  }
}
