/**
 * @file src/app/api/equipment/[id]/route.ts
 * @description
 * 개별 설비 API 라우트입니다.
 * 설비 상세 조회(GET), 수정(PATCH), 삭제(DELETE)를 처리합니다.
 *
 * 초보자 가이드:
 * 1. **GET /api/equipment/:id**: 설비 상세 정보 조회
 * 2. **PATCH /api/equipment/:id**: 설비 정보 수정 (위치, 상태 등)
 * 3. **DELETE /api/equipment/:id**: 설비 삭제
 *
 * 수정 방법:
 * - 반환 필드 추가: include에 관계 추가
 * - 수정 가능 필드 추가: PATCH의 data에 필드 추가
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { EquipmentType, EquipmentStatus } from "@prisma/client";

type RouteParams = {
  params: Promise<{ id: string }>;
};

/**
 * 설비 상세 조회
 * GET /api/equipment/:id
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    const equipment = await prisma.equipment.findUnique({
      where: { id },
      include: {
        project: {
          select: {
            id: true,
            name: true,
          },
        },
        properties: {
          orderBy: {
            order: "asc",
          },
        },
        connectionsFrom: {
          select: {
            id: true,
            label: true,
            type: true,
            color: true,
            animated: true,
            toEquipmentId: true,
            toEquipment: {
              select: {
                id: true,
                code: true,
                name: true,
              },
            },
          },
        },
        connectionsTo: {
          select: {
            id: true,
            label: true,
            type: true,
            color: true,
            animated: true,
            fromEquipmentId: true,
            fromEquipment: {
              select: {
                id: true,
                code: true,
                name: true,
              },
            },
          },
        },
      },
    });

    if (!equipment) {
      return NextResponse.json(
        { error: "설비를 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    return NextResponse.json(equipment);
  } catch (error) {
    console.error("설비 조회 실패:", error);
    return NextResponse.json(
      { error: "설비를 조회할 수 없습니다." },
      { status: 500 }
    );
  }
}

/**
 * 설비 수정
 * PATCH /api/equipment/:id
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const body = await request.json();
    const {
      name,
      type,
      status,
      positionX,
      positionY,
      description,
      location,
      lineCode,
      divisionCode,
      imageUrl,
      manufacturer,
      modelNumber,
      serialNumber,
      purchaseDate,
      warrantyEndDate,
      ipAddress,
      portNumber,
      isLogTarget,
      isInterlockTarget,
      isBarcodeEnabled,
    } = body;

    // 설비 존재 확인
    const existing = await prisma.equipment.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { error: "설비를 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    // 타입 유효성 검증
    if (type !== undefined && !Object.values(EquipmentType).includes(type)) {
      return NextResponse.json(
        { error: "유효하지 않은 설비 타입입니다." },
        { status: 400 }
      );
    }

    // 상태 유효성 검증
    if (status !== undefined && !Object.values(EquipmentStatus).includes(status)) {
      return NextResponse.json(
        { error: "유효하지 않은 설비 상태입니다." },
        { status: 400 }
      );
    }

    const equipment = await prisma.equipment.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(type !== undefined && { type }),
        ...(status !== undefined && { status }),
        ...(positionX !== undefined && { positionX }),
        ...(positionY !== undefined && { positionY }),
        ...(description !== undefined && { description: description || null }),
        ...(location !== undefined && { location: location || null }),
        ...(lineCode !== undefined && { lineCode: lineCode || null }),
        ...(divisionCode !== undefined && { divisionCode: divisionCode || null }),
        ...(imageUrl !== undefined && { imageUrl: imageUrl || null }),
        ...(manufacturer !== undefined && { manufacturer: manufacturer || null }),
        ...(modelNumber !== undefined && { modelNumber: modelNumber || null }),
        ...(serialNumber !== undefined && { serialNumber: serialNumber || null }),
        ...(purchaseDate !== undefined && { purchaseDate: purchaseDate ? new Date(purchaseDate) : null }),
        ...(warrantyEndDate !== undefined && { warrantyEndDate: warrantyEndDate ? new Date(warrantyEndDate) : null }),
        ...(ipAddress !== undefined && { ipAddress: ipAddress || null }),
        ...(portNumber !== undefined && { portNumber: portNumber || null }),
        ...(isLogTarget !== undefined && { isLogTarget }),
        ...(isInterlockTarget !== undefined && { isInterlockTarget }),
        ...(isBarcodeEnabled !== undefined && { isBarcodeEnabled }),
      },
      include: {
        project: {
          select: {
            id: true,
            name: true,
          },
        },
        properties: true,
      },
    });

    return NextResponse.json(equipment);
  } catch (error) {
    console.error("설비 수정 실패:", error);
    return NextResponse.json(
      { error: "설비를 수정할 수 없습니다." },
      { status: 500 }
    );
  }
}

/**
 * 설비 삭제
 * DELETE /api/equipment/:id
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    // 설비 존재 확인
    const existing = await prisma.equipment.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { error: "설비를 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    // Prisma Cascade로 자동 삭제되므로 별도 처리 불필요
    // - properties: onDelete: Cascade
    // - connectionsFrom: onDelete: Cascade
    // - connectionsTo: onDelete: Cascade
    await prisma.equipment.delete({ where: { id } });

    return NextResponse.json({ message: "설비가 삭제되었습니다." });
  } catch (error) {
    console.error("설비 삭제 실패:", error);
    return NextResponse.json(
      { error: "설비를 삭제할 수 없습니다." },
      { status: 500 }
    );
  }
}
