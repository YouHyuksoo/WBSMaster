/**
 * @file src/app/api/process-verification/masters/[id]/apply/route.ts
 * @description
 * 마스터 항목의 사업부별 적용 상태 토글 API
 *
 * 초보자 가이드:
 * 1. **PATCH**: 특정 사업부의 적용 상태(isApplied) 또는 검증 상태(status) 변경
 * 2. upsert 사용: 해당 사업부 적용 데이터가 없으면 생성, 있으면 업데이트
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * 사업부별 적용 상태 토글
 * PATCH /api/process-verification/masters/[id]/apply
 *
 * Body:
 * - businessUnit: 사업부 코드 (필수)
 * - isApplied: 적용 여부 (선택)
 * - status: 검증 상태 (선택)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: masterId } = await params;
    const body = await request.json();
    const { businessUnit, isApplied, status } = body;

    // 필수 필드 검증
    if (!businessUnit) {
      return NextResponse.json(
        { error: "사업부(businessUnit)는 필수입니다." },
        { status: 400 }
      );
    }

    // 마스터 존재 확인
    const master = await prisma.processVerificationMaster.findUnique({
      where: { id: masterId },
    });

    if (!master) {
      return NextResponse.json(
        { error: "마스터를 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    // 업데이트 데이터 구성
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updateData: any = {};
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const createData: any = {
      masterId,
      businessUnit,
      isApplied: false,
      status: "PENDING",
    };

    if (isApplied !== undefined) {
      updateData.isApplied = isApplied;
      createData.isApplied = isApplied;
    }

    if (status !== undefined) {
      updateData.status = status;
      createData.status = status;
    }

    // upsert: 있으면 업데이트, 없으면 생성
    const result = await prisma.processVerificationBusinessUnit.upsert({
      where: {
        masterId_businessUnit: { masterId, businessUnit },
      },
      update: updateData,
      create: createData,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("적용 상태 변경 실패:", error);
    return NextResponse.json(
      { error: "적용 상태를 변경할 수 없습니다." },
      { status: 500 }
    );
  }
}

/**
 * 특정 사업부의 적용 상태 조회
 * GET /api/process-verification/masters/[id]/apply?businessUnit=V_IVI
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: masterId } = await params;
    const { searchParams } = new URL(request.url);
    const businessUnit = searchParams.get("businessUnit");

    // businessUnit 지정 시 해당 사업부만 조회
    if (businessUnit) {
      const apply = await prisma.processVerificationBusinessUnit.findUnique({
        where: {
          masterId_businessUnit: { masterId, businessUnit },
        },
      });

      if (!apply) {
        return NextResponse.json(
          { error: "해당 사업부 적용 정보를 찾을 수 없습니다." },
          { status: 404 }
        );
      }

      return NextResponse.json(apply);
    }

    // businessUnit 미지정 시 모든 사업부 적용 현황 조회
    const applies = await prisma.processVerificationBusinessUnit.findMany({
      where: { masterId },
      orderBy: { businessUnit: "asc" },
    });

    return NextResponse.json(applies);
  } catch (error) {
    console.error("적용 상태 조회 실패:", error);
    return NextResponse.json(
      { error: "적용 상태를 조회할 수 없습니다." },
      { status: 500 }
    );
  }
}
