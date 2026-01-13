/**
 * @file src/app/api/notifications/[id]/route.ts
 * @description
 * 알림 개별 API - 읽음 처리, 삭제
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUser } from "@/lib/auth";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * PATCH /api/notifications/[id]
 * 알림 읽음 처리
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
    }

    const { id } = await params;

    // 알림 존재 및 소유권 확인
    const notification = await prisma.notification.findUnique({
      where: { id },
    });

    if (!notification) {
      return NextResponse.json({ error: "알림을 찾을 수 없습니다." }, { status: 404 });
    }

    if (notification.userId !== user.id) {
      return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
    }

    // 읽음 처리
    const updated = await prisma.notification.update({
      where: { id },
      data: { isRead: true },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("알림 업데이트 오류:", error);
    return NextResponse.json(
      { error: "알림을 업데이트하는 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/notifications/[id]
 * 알림 삭제
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
    }

    const { id } = await params;

    // 알림 존재 및 소유권 확인
    const notification = await prisma.notification.findUnique({
      where: { id },
    });

    if (!notification) {
      return NextResponse.json({ error: "알림을 찾을 수 없습니다." }, { status: 404 });
    }

    if (notification.userId !== user.id) {
      return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
    }

    await prisma.notification.delete({ where: { id } });

    return NextResponse.json({ message: "알림이 삭제되었습니다." });
  } catch (error) {
    console.error("알림 삭제 오류:", error);
    return NextResponse.json(
      { error: "알림을 삭제하는 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
