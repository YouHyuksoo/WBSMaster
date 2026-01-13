/**
 * @file src/app/api/notifications/read-all/route.ts
 * @description
 * 알림 모두 읽음 처리 API
 */

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUser } from "@/lib/auth";

/**
 * PATCH /api/notifications/read-all
 * 모든 알림 읽음 처리
 */
export async function PATCH() {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
    }

    // 읽지 않은 모든 알림 읽음 처리
    const result = await prisma.notification.updateMany({
      where: { userId: user.id, isRead: false },
      data: { isRead: true },
    });

    return NextResponse.json({
      message: "모든 알림을 읽음 처리했습니다.",
      count: result.count,
    });
  } catch (error) {
    console.error("알림 모두 읽음 처리 오류:", error);
    return NextResponse.json(
      { error: "알림을 처리하는 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
