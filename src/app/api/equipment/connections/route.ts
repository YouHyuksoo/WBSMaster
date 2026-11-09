/**
 * @file src/app/api/equipment/connections/route.ts
 * @description
 * 설비 연결 API 라우트입니다.
 * 연결 목록 조회(GET), 연결 생성(POST)을 처리합니다.
 *
 * 초보자 가이드:
 * 1. **GET /api/equipment/connections**: 프로젝트별 연결 목록 조회
 *    - ?projectId=xxx: 특정 프로젝트의 연결만 조회
 * 2. **POST /api/equipment/connections**: 새 연결 생성
 * - 인증: requireAuth + assertProjectAccess (프로젝트 멤버 · ADMIN 만, projectId 없는 전체 조회는 ADMIN 만)
 *
 * 수정 방법:
 * - 정렬 추가: orderBy 조건 수정
 * - 필터링 추가: where 조건 추가
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, assertProjectAccess } from "@/lib/auth";
import { ConnectionType, Prisma } from "@prisma/client";

/**
 * 연결 목록 조회
 * GET /api/equipment/connections
 */
export async function GET(request: NextRequest) {
  try {
    const { user, error: authError } = await requireAuth();
    if (authError) return authError;
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get("projectId");

    // projectId 없는 전체 조회는 ADMIN 만 (화면은 항상 projectId 를 보낸다)
    if (!projectId && user!.role !== "ADMIN") {
      return NextResponse.json({ error: "projectId 가 필요합니다." }, { status: 400 });
    }
    if (projectId) {
      const accessError = await assertProjectAccess(projectId, user!);
      if (accessError) return accessError;
    }

    // 필터 조건 구성
    const where: Prisma.EquipmentConnectionWhereInput = {};

    if (projectId) {
      where.fromEquipment = { projectId };
    }

    const connections = await prisma.equipmentConnection.findMany({
      where,
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
      orderBy: {
        order: "asc",
      },
    });

    return NextResponse.json(connections);
  } catch (error) {
    console.error("연결 목록 조회 실패:", error);
    return NextResponse.json(
      { error: "연결 목록을 조회할 수 없습니다." },
      { status: 500 }
    );
  }
}

/**
 * 연결 생성
 * POST /api/equipment/connections
 */
export async function POST(request: NextRequest) {
  try {
    const { user, error: authError } = await requireAuth();
    if (authError) return authError;
    const body = await request.json();
    const {
      fromEquipmentId,
      toEquipmentId,
      label,
      type,
      color,
      animated,
      order,
      sourceHandle,
      targetHandle,
    } = body;

    // 디버깅: 받은 데이터 확인
    console.log("=== 연결 생성 요청 ===");
    console.log("fromEquipmentId:", fromEquipmentId);
    console.log("toEquipmentId:", toEquipmentId);
    console.log("sourceHandle:", sourceHandle);
    console.log("targetHandle:", targetHandle);

    // 필수 필드 검증
    if (!fromEquipmentId || !toEquipmentId) {
      return NextResponse.json(
        { error: "출발 설비와 도착 설비는 필수입니다." },
        { status: 400 }
      );
    }

    // 자기 자신과의 연결 방지
    if (fromEquipmentId === toEquipmentId) {
      return NextResponse.json(
        { error: "같은 설비끼리는 연결할 수 없습니다." },
        { status: 400 }
      );
    }

    // 설비 존재 확인
    const fromEquipment = await prisma.equipment.findUnique({ where: { id: fromEquipmentId } });
    const toEquipment = await prisma.equipment.findUnique({ where: { id: toEquipmentId } });

    if (!fromEquipment || !toEquipment) {
      return NextResponse.json(
        { error: "설비를 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    // 권한 확인: 두 설비는 같은 프로젝트여야 하고, 그 프로젝트에 접근 가능해야 한다
    if (fromEquipment.projectId !== toEquipment.projectId) {
      return NextResponse.json(
        { error: "다른 프로젝트의 설비끼리는 연결할 수 없습니다." },
        { status: 400 }
      );
    }
    const accessError = await assertProjectAccess(fromEquipment.projectId, user!);
    if (accessError) return accessError;

    // 중복 연결 확인 (같은 설비 + 같은 핸들 조합만 중복으로 간주)
    const checkSourceHandle = sourceHandle || "right";
    const checkTargetHandle = targetHandle || "left";

    console.log("중복 확인 조건:", {
      fromEquipmentId,
      toEquipmentId,
      sourceHandle: checkSourceHandle,
      targetHandle: checkTargetHandle,
    });

    const existingConnection = await prisma.equipmentConnection.findFirst({
      where: {
        fromEquipmentId,
        toEquipmentId,
        sourceHandle: checkSourceHandle,
        targetHandle: checkTargetHandle,
      },
    });

    console.log("기존 연결 발견:", existingConnection ? "있음" : "없음");

    if (existingConnection) {
      return NextResponse.json(
        { error: "이미 같은 방향으로 연결된 설비입니다." },
        { status: 400 }
      );
    }

    // 타입 유효성 검증
    if (type && !Object.values(ConnectionType).includes(type)) {
      return NextResponse.json(
        { error: "유효하지 않은 연결 타입입니다." },
        { status: 400 }
      );
    }

    const connection = await prisma.equipmentConnection.create({
      data: {
        fromEquipmentId,
        toEquipmentId,
        label: label || null,
        type: type || ConnectionType.FLOW,
        color: color || "#94A3B8",
        animated: animated || false,
        order: order || 0,
        sourceHandle: sourceHandle || "right",
        targetHandle: targetHandle || "left",
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

    console.log("연결 생성 성공:", connection.id);
    return NextResponse.json(connection, { status: 201 });
  } catch (error) {
    console.error("=== 연결 생성 실패 ===");
    console.error("에러 타입:", error instanceof Error ? error.constructor.name : typeof error);
    console.error("에러 메시지:", error instanceof Error ? error.message : error);
    console.error("전체 에러:", error);

    return NextResponse.json(
      { error: error instanceof Error ? error.message : "연결을 생성할 수 없습니다." },
      { status: 500 }
    );
  }
}
