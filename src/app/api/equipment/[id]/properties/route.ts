/**
 * @file src/app/api/equipment/[id]/properties/route.ts
 * @description
 * 설비 동적 속성 API 라우트
 * 속성 목록 조회(GET), 속성 추가(POST)를 처리합니다.
 *
 * 초보자 가이드:
 * 1. **GET /api/equipment/:id/properties**: 설비의 속성 목록 조회
 * 2. **POST /api/equipment/:id/properties**: 새 속성 추가
 *
 * 수정 방법:
 * - 정렬 추가: orderBy 조건 수정
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { PropertyValueType } from "@prisma/client";

type RouteParams = {
  params: Promise<{ id: string }>;
};

/**
 * 속성 목록 조회
 * GET /api/equipment/:id/properties
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    // 설비 존재 확인
    const equipment = await prisma.equipment.findUnique({ where: { id } });
    if (!equipment) {
      return NextResponse.json(
        { error: "설비를 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    const properties = await prisma.equipmentProperty.findMany({
      where: { equipmentId: id },
      orderBy: { order: "asc" },
    });

    return NextResponse.json(properties);
  } catch (error) {
    console.error("속성 목록 조회 실패:", error);
    return NextResponse.json(
      { error: "속성 목록을 조회할 수 없습니다." },
      { status: 500 }
    );
  }
}

/**
 * 속성 추가
 * POST /api/equipment/:id/properties
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { key, value, valueType, unit, order } = body;

    // 필수 필드 검증
    if (!key || value === undefined || value === null) {
      return NextResponse.json(
        { error: "속성명과 값은 필수입니다." },
        { status: 400 }
      );
    }

    // 설비 존재 확인
    const equipment = await prisma.equipment.findUnique({ where: { id } });
    if (!equipment) {
      return NextResponse.json(
        { error: "설비를 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    // 타입 유효성 검증
    if (valueType && !Object.values(PropertyValueType).includes(valueType)) {
      return NextResponse.json(
        { error: "유효하지 않은 속성 타입입니다." },
        { status: 400 }
      );
    }

    // order가 지정되지 않았으면 마지막에 추가
    let finalOrder = order;
    if (finalOrder === undefined || finalOrder === null) {
      const lastProperty = await prisma.equipmentProperty.findFirst({
        where: { equipmentId: id },
        orderBy: { order: "desc" },
      });
      finalOrder = (lastProperty?.order ?? -1) + 1;
    }

    const property = await prisma.equipmentProperty.create({
      data: {
        equipmentId: id,
        key,
        value: String(value),
        valueType: valueType || PropertyValueType.TEXT,
        unit: unit || null,
        order: finalOrder,
      },
    });

    return NextResponse.json(property, { status: 201 });
  } catch (error) {
    console.error("속성 추가 실패:", error);
    return NextResponse.json(
      { error: "속성을 추가할 수 없습니다." },
      { status: 500 }
    );
  }
}
