/**
 * @file src/app/api/equipment/route.ts
 * @description
 * 설비 관리 API 라우트입니다.
 * 설비 목록 조회(GET), 설비 생성(POST)을 처리합니다.
 *
 * 초보자 가이드:
 * 1. **GET /api/equipment**: 프로젝트별 설비 목록 조회
 *    - ?projectId=xxx: 특정 프로젝트의 설비만 조회
 * 2. **POST /api/equipment**: 새 설비 생성 (코드 자동 생성)
 *
 * 수정 방법:
 * - 정렬 추가: orderBy 조건 수정
 * - 필터링 추가: where 조건 추가
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { EquipmentType, EquipmentStatus, Prisma } from "@prisma/client";

/**
 * 설비 목록 조회
 * GET /api/equipment
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get("projectId");
    const divisionCode = searchParams.get("divisionCode");
    const lineCode = searchParams.get("lineCode");

    // 필터 조건 구성
    const where: Prisma.EquipmentWhereInput = {};

    if (projectId) where.projectId = projectId;
    if (divisionCode && divisionCode !== "ALL") where.divisionCode = divisionCode;
    if (lineCode && lineCode !== "ALL") where.lineCode = lineCode;

    const equipments = await prisma.equipment.findMany({
      where,
      include: {
        project: {
          select: {
            id: true,
            name: true,
          },
        },
        // 동적 속성 포함
        properties: {
          orderBy: {
            order: "asc",
          },
        },
        // 연결 정보 포함 (from)
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
        // 연결 정보 포함 (to)
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
      orderBy: [
        { code: "asc" },
      ],
    });

    return NextResponse.json(equipments);
  } catch (error) {
    console.error("설비 목록 조회 실패:", error);
    return NextResponse.json(
      { error: "설비 목록을 조회할 수 없습니다." },
      { status: 500 }
    );
  }
}

/**
 * 설비 생성
 * POST /api/equipment
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      projectId,
      name,
      type,
      status,
      positionX,
      positionY,
      description,
      location,
      manufacturer,
      modelNumber,
      serialNumber,
      purchaseDate,
      warrantyEndDate,
    } = body;

    // 필수 필드 검증
    if (!name || !projectId || !type) {
      return NextResponse.json(
        { error: "설비명, 프로젝트 ID, 타입은 필수입니다." },
        { status: 400 }
      );
    }

    // 타입 유효성 검증
    if (!Object.values(EquipmentType).includes(type)) {
      return NextResponse.json(
        { error: "유효하지 않은 설비 타입입니다." },
        { status: 400 }
      );
    }

    // 프로젝트 존재 확인
    const project = await prisma.project.findUnique({ where: { id: projectId } });
    if (!project) {
      return NextResponse.json(
        { error: "프로젝트를 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    // 설비 코드 자동 생성 (EQ-001, EQ-002, ...)
    const lastEquipment = await prisma.equipment.findFirst({
      where: { projectId },
      orderBy: { createdAt: "desc" },
      select: { code: true },
    });
    const nextNumber = lastEquipment?.code
      ? parseInt(lastEquipment.code.replace("EQ-", "")) + 1
      : 1;
    const code = `EQ-${String(nextNumber).padStart(3, "0")}`;

    const equipment = await prisma.equipment.create({
      data: {
        code,
        name,
        type,
        status: status || EquipmentStatus.ACTIVE,
        positionX: positionX || 0,
        positionY: positionY || 0,
        description,
        location,
        manufacturer,
        modelNumber,
        serialNumber,
        purchaseDate: purchaseDate ? new Date(purchaseDate) : null,
        warrantyEndDate: warrantyEndDate ? new Date(warrantyEndDate) : null,
        projectId,
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

    return NextResponse.json(equipment, { status: 201 });
  } catch (error) {
    console.error("설비 생성 실패:", error);
    return NextResponse.json(
      { error: "설비를 생성할 수 없습니다." },
      { status: 500 }
    );
  }
}
