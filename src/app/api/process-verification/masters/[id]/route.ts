/**
 * @file src/app/api/process-verification/masters/[id]/route.ts
 * @description
 * 공정검증 마스터 개별 항목 API
 *
 * 초보자 가이드:
 * 1. **GET**: 마스터 상세 조회
 * 2. **PATCH**: 마스터 수정
 * 3. **DELETE**: 마스터 삭제 (연결된 적용 행도 함께 삭제)
 * 4. 인증: requireAuth + assertProjectAccess (마스터 → 카테고리의 projectId 기준, 프로젝트 멤버 · ADMIN 만)
 *    - PATCH 로 categoryId 를 바꾸면 옮겨 갈 카테고리의 프로젝트 권한도 검사한다
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, assertProjectAccess } from "@/lib/auth";

/**
 * 마스터 상세 조회
 * GET /api/process-verification/masters/[id]
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user, error } = await requireAuth();
    if (error) return error;

    const { id } = await params;

    const master = await prisma.processVerificationMaster.findUnique({
      where: { id },
      include: {
        categoryRef: { select: { id: true, name: true, code: true, projectId: true } },
        businessUnitApplies: { orderBy: { businessUnit: "asc" } },
      },
    });

    if (!master) {
      return NextResponse.json(
        { error: "마스터를 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    const denied = await assertProjectAccess(master.categoryRef.projectId, user!);
    if (denied) return denied;

    return NextResponse.json(master);
  } catch (error) {
    console.error("마스터 조회 실패:", error);
    return NextResponse.json(
      { error: "마스터를 조회할 수 없습니다." },
      { status: 500 }
    );
  }
}

/**
 * 마스터 수정
 * PATCH /api/process-verification/masters/[id]
 *
 * Body: 수정할 필드들 (부분 업데이트)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user, error } = await requireAuth();
    if (error) return error;

    const { id } = await params;
    const body = await request.json();

    // 존재 확인
    const existing = await prisma.processVerificationMaster.findUnique({
      where: { id },
      include: { categoryRef: { select: { projectId: true } } },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "마스터를 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    const denied = await assertProjectAccess(existing.categoryRef.projectId, user!);
    if (denied) return denied;

    // 카테고리를 옮기면 대상 카테고리의 프로젝트 권한도 확인
    if (body.categoryId !== undefined && body.categoryId !== existing.categoryId) {
      const targetCategory = await prisma.processVerificationCategory.findUnique({
        where: { id: body.categoryId },
        select: { projectId: true },
      });
      if (!targetCategory) {
        return NextResponse.json(
          { error: "카테고리를 찾을 수 없습니다." },
          { status: 404 }
        );
      }
      const denied = await assertProjectAccess(targetCategory.projectId, user!);
      if (denied) return denied;
    }

    // 관리코드 또는 제품유형 변경 시 복합키 중복 확인
    const newManagementCode = body.managementCode ?? existing.managementCode;
    const newProductType = body.productType ?? existing.productType;

    if (
      newManagementCode !== existing.managementCode ||
      newProductType !== existing.productType
    ) {
      const duplicate = await prisma.processVerificationMaster.findUnique({
        where: {
          productType_managementCode: {
            productType: newProductType,
            managementCode: newManagementCode,
          },
        },
      });

      if (duplicate && duplicate.id !== id) {
        return NextResponse.json(
          {
            error: `${newProductType} 제품유형에 관리코드 "${newManagementCode}"가 이미 존재합니다.`,
          },
          { status: 409 }
        );
      }
    }

    // 업데이트 데이터 구성 (undefined 필드 제외)
    const {
      managementCode,
      productType,
      category,
      managementArea,
      detailItem,
      mesMapping,
      verificationDetail,
      acceptanceStatus,
      existingMes,
      customerRequest,
      asIsCode,
      toBeCode,
      order,
      remarks,
      categoryId,
    } = body;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updateData: any = {};

    if (managementCode !== undefined) updateData.managementCode = managementCode;
    if (productType !== undefined) updateData.productType = productType;
    if (category !== undefined) updateData.category = category;
    if (managementArea !== undefined) updateData.managementArea = managementArea;
    if (detailItem !== undefined) updateData.detailItem = detailItem;
    if (mesMapping !== undefined) updateData.mesMapping = mesMapping;
    if (verificationDetail !== undefined)
      updateData.verificationDetail = verificationDetail;
    if (acceptanceStatus !== undefined)
      updateData.acceptanceStatus = acceptanceStatus;
    if (existingMes !== undefined) updateData.existingMes = existingMes;
    if (customerRequest !== undefined)
      updateData.customerRequest = customerRequest;
    if (asIsCode !== undefined) updateData.asIsCode = asIsCode;
    if (toBeCode !== undefined) updateData.toBeCode = toBeCode;
    if (order !== undefined) updateData.order = order;
    if (remarks !== undefined) updateData.remarks = remarks;
    if (categoryId !== undefined) updateData.categoryId = categoryId;

    const updated = await prisma.processVerificationMaster.update({
      where: { id },
      data: updateData,
      include: {
        categoryRef: { select: { id: true, name: true, code: true } },
        businessUnitApplies: { orderBy: { businessUnit: "asc" } },
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("마스터 수정 실패:", error);
    return NextResponse.json(
      { error: "마스터를 수정할 수 없습니다." },
      { status: 500 }
    );
  }
}

/**
 * 마스터 삭제
 * DELETE /api/process-verification/masters/[id]
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user, error } = await requireAuth();
    if (error) return error;

    const { id } = await params;

    // 존재 확인
    const existing = await prisma.processVerificationMaster.findUnique({
      where: { id },
      include: { categoryRef: { select: { projectId: true } } },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "마스터를 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    const denied = await assertProjectAccess(existing.categoryRef.projectId, user!);
    if (denied) return denied;

    // 삭제 (Cascade로 businessUnitApplies도 함께 삭제됨)
    await prisma.processVerificationMaster.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("마스터 삭제 실패:", error);
    return NextResponse.json(
      { error: "마스터를 삭제할 수 없습니다." },
      { status: 500 }
    );
  }
}
