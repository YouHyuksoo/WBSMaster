/**
 * @file src/app/api/process-verification/masters/[id]/apply/route.ts
 * @description
 * 마스터 항목의 적용 여부·검증 상태 변경 API
 *
 * 초보자 가이드:
 * 1. **PATCH**: 적용 여부(isApplied) 또는 검증 상태(status) 변경
 * 2. upsert 사용: 적용 행이 없으면 생성, 있으면 업데이트
 * 3. 적용 행은 마스터당 하나(businessUnit = DEFAULT_BUSINESS_UNIT)다. 요청의 businessUnit 은 받지 않는다.
 *    (2026-11-09 화면에서 사업부 구분 제거)
 * 4. 인증: requireAuth + assertProjectAccess (마스터 → 카테고리의 projectId 기준, 프로젝트 멤버 · ADMIN 만)
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, assertProjectAccess } from "@/lib/auth";
import { DEFAULT_BUSINESS_UNIT } from "@/constants/business-units";

/**
 * 적용 여부·검증 상태 변경
 * PATCH /api/process-verification/masters/[id]/apply
 *
 * Body:
 * - isApplied: 적용 여부 (선택)
 * - status: 검증 상태 (선택)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user, error } = await requireAuth();
    if (error) return error;

    const { id: masterId } = await params;
    const body = await request.json();
    const { isApplied, status } = body;
    const businessUnit = DEFAULT_BUSINESS_UNIT;

    // 마스터 존재 · 프로젝트 권한 확인
    const master = await prisma.processVerificationMaster.findUnique({
      where: { id: masterId },
      select: { categoryRef: { select: { projectId: true } } },
    });

    if (!master) {
      return NextResponse.json(
        { error: "마스터를 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    const denied = await assertProjectAccess(master.categoryRef.projectId, user!);
    if (denied) return denied;

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
 * 적용 행 조회
 * GET /api/process-verification/masters/[id]/apply
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user, error } = await requireAuth();
    if (error) return error;

    const { id: masterId } = await params;
    const { searchParams } = new URL(request.url);
    const businessUnit = DEFAULT_BUSINESS_UNIT;

    // 마스터 존재 · 프로젝트 권한 확인
    const master = await prisma.processVerificationMaster.findUnique({
      where: { id: masterId },
      select: { categoryRef: { select: { projectId: true } } },
    });

    if (!master) {
      return NextResponse.json(
        { error: "마스터를 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    const denied = await assertProjectAccess(master.categoryRef.projectId, user!);
    if (denied) return denied;

    const apply = await prisma.processVerificationBusinessUnit.findUnique({
      where: {
        masterId_businessUnit: { masterId, businessUnit },
      },
    });

    if (!apply) {
      return NextResponse.json(
        { error: "적용 정보를 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    return NextResponse.json(apply);
  } catch (error) {
    console.error("적용 상태 조회 실패:", error);
    return NextResponse.json(
      { error: "적용 상태를 조회할 수 없습니다." },
      { status: 500 }
    );
  }
}
