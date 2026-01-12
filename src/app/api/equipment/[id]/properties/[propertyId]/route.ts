/**
 * @file src/app/api/equipment/[id]/properties/[propertyId]/route.ts
 * @description
 * 개별 설비 속성 API 라우트
 * 속성 수정(PATCH), 삭제(DELETE)를 처리합니다.
 *
 * 초보자 가이드:
 * 1. **PATCH /api/equipment/:id/properties/:propertyId**: 속성 수정
 * 2. **DELETE /api/equipment/:id/properties/:propertyId**: 속성 삭제
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { PropertyValueType } from "@prisma/client";

type RouteParams = {
  params: Promise<{ id: string; propertyId: string }>;
};

/**
 * 속성 수정
 * PATCH /api/equipment/:id/properties/:propertyId
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { id, propertyId } = await params;
    const body = await request.json();
    const { key, value, valueType, unit, order } = body;

    // 속성 존재 확인
    const existing = await prisma.equipmentProperty.findUnique({
      where: { id: propertyId },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "속성을 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    // 설비 ID 일치 확인
    if (existing.equipmentId !== id) {
      return NextResponse.json(
        { error: "속성이 해당 설비에 속하지 않습니다." },
        { status: 400 }
      );
    }

    // 타입 유효성 검증
    if (valueType !== undefined && !Object.values(PropertyValueType).includes(valueType)) {
      return NextResponse.json(
        { error: "유효하지 않은 속성 타입입니다." },
        { status: 400 }
      );
    }

    const property = await prisma.equipmentProperty.update({
      where: { id: propertyId },
      data: {
        ...(key !== undefined && { key }),
        ...(value !== undefined && { value: String(value) }),
        ...(valueType !== undefined && { valueType }),
        ...(unit !== undefined && { unit: unit || null }),
        ...(order !== undefined && { order }),
      },
    });

    return NextResponse.json(property);
  } catch (error) {
    console.error("속성 수정 실패:", error);
    return NextResponse.json(
      { error: "속성을 수정할 수 없습니다." },
      { status: 500 }
    );
  }
}

/**
 * 속성 삭제
 * DELETE /api/equipment/:id/properties/:propertyId
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id, propertyId } = await params;

    // 속성 존재 확인
    const existing = await prisma.equipmentProperty.findUnique({
      where: { id: propertyId },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "속성을 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    // 설비 ID 일치 확인
    if (existing.equipmentId !== id) {
      return NextResponse.json(
        { error: "속성이 해당 설비에 속하지 않습니다." },
        { status: 400 }
      );
    }

    await prisma.equipmentProperty.delete({ where: { id: propertyId } });

    return NextResponse.json({ message: "속성이 삭제되었습니다." });
  } catch (error) {
    console.error("속성 삭제 실패:", error);
    return NextResponse.json(
      { error: "속성을 삭제할 수 없습니다." },
      { status: 500 }
    );
  }
}
