/**
 * @file src/app/api/equipment/connections/[id]/route.ts
 * @description
 * 개별 설비 연결 API 라우트입니다.
 * 연결 수정(PATCH), 삭제(DELETE)를 처리합니다.
 *
 * 초보자 가이드:
 * 1. **PATCH /api/equipment/connections/:id**: 연결 정보 수정 (라벨, 색상, 애니메이션 등)
 * 2. **DELETE /api/equipment/connections/:id**: 연결 삭제
 *
 * 수정 방법:
 * - 수정 가능 필드 추가: PATCH의 data에 필드 추가
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ConnectionType } from "@prisma/client";

type RouteParams = {
  params: Promise<{ id: string }>;
};

/**
 * 연결 수정
 * PATCH /api/equipment/connections/:id
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { label, type, color, animated, order } = body;

    // 연결 존재 확인
    const existing = await prisma.equipmentConnection.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { error: "연결을 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    // 타입 유효성 검증
    if (type !== undefined && !Object.values(ConnectionType).includes(type)) {
      return NextResponse.json(
        { error: "유효하지 않은 연결 타입입니다." },
        { status: 400 }
      );
    }

    const connection = await prisma.equipmentConnection.update({
      where: { id },
      data: {
        ...(label !== undefined && { label: label || null }),
        ...(type !== undefined && { type }),
        ...(color !== undefined && { color: color || null }),
        ...(animated !== undefined && { animated }),
        ...(order !== undefined && { order }),
      },
      include: {
        fromEquipment: {
          select: {
            id: true,
            code: true,
            name: true,
            type: true,
            status: true,
          },
        },
        toEquipment: {
          select: {
            id: true,
            code: true,
            name: true,
            type: true,
            status: true,
          },
        },
      },
    });

    return NextResponse.json(connection);
  } catch (error) {
    console.error("연결 수정 실패:", error);
    return NextResponse.json(
      { error: "연결을 수정할 수 없습니다." },
      { status: 500 }
    );
  }
}

/**
 * 연결 삭제
 * DELETE /api/equipment/connections/:id
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    // 연결 존재 확인
    const existing = await prisma.equipmentConnection.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { error: "연결을 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    await prisma.equipmentConnection.delete({ where: { id } });

    return NextResponse.json({ message: "연결이 삭제되었습니다." });
  } catch (error) {
    console.error("연결 삭제 실패:", error);
    return NextResponse.json(
      { error: "연결을 삭제할 수 없습니다." },
      { status: 500 }
    );
  }
}
