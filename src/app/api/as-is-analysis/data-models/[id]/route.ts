/**
 * @file src/app/api/as-is-analysis/data-models/[id]/route.ts
 * @description
 * AS-IS 데이터 모델 개별 API 라우트입니다.
 * 데이터 모델 항목의 조회, 수정, 삭제를 처리합니다.
 *
 * 초보자 가이드:
 * - GET: 특정 데이터 모델 조회
 * - PATCH: 데이터 모델 수정
 * - DELETE: 데이터 모델 삭제
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/as-is-analysis/data-models/[id]
 * 특정 데이터 모델 조회
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    // 인증 확인
    const { error } = await requireAuth();
    if (error) return error;

    const { id } = await params;

    const item = await prisma.asIsDataModel.findUnique({
      where: { id },
    });

    if (!item) {
      return NextResponse.json(
        { error: "데이터 모델을 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    return NextResponse.json(item);
  } catch (error) {
    console.error("데이터 모델 조회 오류:", error);
    return NextResponse.json(
      { error: "데이터 모델 조회에 실패했습니다." },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/as-is-analysis/data-models/[id]
 * 데이터 모델 수정
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    // 인증 확인
    const { error } = await requireAuth();
    if (error) return error;

    const { id } = await params;
    const body = await request.json();
    const {
      tableName,
      tableNameKr,
      description,
      columnName,
      columnNameKr,
      dataType,
      length,
      isPrimaryKey,
      isForeignKey,
      isNullable,
      defaultValue,
      remarks,
      order,
    } = body;

    // 존재 여부 확인
    const existing = await prisma.asIsDataModel.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "데이터 모델을 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    // 업데이트
    const updated = await prisma.asIsDataModel.update({
      where: { id },
      data: {
        ...(tableName !== undefined && { tableName }),
        ...(tableNameKr !== undefined && { tableNameKr }),
        ...(description !== undefined && { description }),
        ...(columnName !== undefined && { columnName }),
        ...(columnNameKr !== undefined && { columnNameKr }),
        ...(dataType !== undefined && { dataType }),
        ...(length !== undefined && { length }),
        ...(isPrimaryKey !== undefined && { isPrimaryKey }),
        ...(isForeignKey !== undefined && { isForeignKey }),
        ...(isNullable !== undefined && { isNullable }),
        ...(defaultValue !== undefined && { defaultValue }),
        ...(remarks !== undefined && { remarks }),
        ...(order !== undefined && { order }),
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("데이터 모델 수정 오류:", error);
    return NextResponse.json(
      { error: "데이터 모델 수정에 실패했습니다." },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/as-is-analysis/data-models/[id]
 * 데이터 모델 삭제
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    // 인증 확인
    const { error } = await requireAuth();
    if (error) return error;

    const { id } = await params;

    // 존재 여부 확인
    const existing = await prisma.asIsDataModel.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "데이터 모델을 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    // 삭제
    await prisma.asIsDataModel.delete({
      where: { id },
    });

    return NextResponse.json({ message: "데이터 모델이 삭제되었습니다." });
  } catch (error) {
    console.error("데이터 모델 삭제 오류:", error);
    return NextResponse.json(
      { error: "데이터 모델 삭제에 실패했습니다." },
      { status: 500 }
    );
  }
}
