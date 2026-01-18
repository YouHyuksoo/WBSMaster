/**
 * @file src/app/api/as-is-analysis/document-analyses/[id]/route.ts
 * @description
 * AS-IS 문서 구조 분석 개별 API 라우트입니다.
 * 문서 구조 분석 항목의 조회, 수정, 삭제를 처리합니다.
 *
 * 초보자 가이드:
 * - GET: 특정 문서 구조 분석 조회
 * - PATCH: 문서 구조 분석 수정
 * - DELETE: 문서 구조 분석 삭제
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/as-is-analysis/document-analyses/[id]
 * 특정 문서 구조 분석 조회
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    // 인증 확인
    const { error } = await requireAuth();
    if (error) return error;

    const { id } = await params;

    const item = await prisma.asIsDocumentAnalysis.findUnique({
      where: { id },
    });

    if (!item) {
      return NextResponse.json(
        { error: "문서 구조 분석을 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    return NextResponse.json(item);
  } catch (error) {
    console.error("문서 구조 분석 조회 오류:", error);
    return NextResponse.json(
      { error: "문서 구조 분석 조회에 실패했습니다." },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/as-is-analysis/document-analyses/[id]
 * 문서 구조 분석 수정
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    // 인증 확인
    const { error } = await requireAuth();
    if (error) return error;

    const { id } = await params;
    const body = await request.json();
    const {
      documentName,
      fieldName,
      dataType,
      sampleData,
      isMandatory,
      validationRule,
      remarks,
      order,
    } = body;

    // 존재 여부 확인
    const existing = await prisma.asIsDocumentAnalysis.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "문서 구조 분석을 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    // 업데이트
    const updated = await prisma.asIsDocumentAnalysis.update({
      where: { id },
      data: {
        ...(documentName !== undefined && { documentName }),
        ...(fieldName !== undefined && { fieldName }),
        ...(dataType !== undefined && { dataType }),
        ...(sampleData !== undefined && { sampleData }),
        ...(isMandatory !== undefined && { isMandatory }),
        ...(validationRule !== undefined && { validationRule }),
        ...(remarks !== undefined && { remarks }),
        ...(order !== undefined && { order }),
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("문서 구조 분석 수정 오류:", error);
    return NextResponse.json(
      { error: "문서 구조 분석 수정에 실패했습니다." },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/as-is-analysis/document-analyses/[id]
 * 문서 구조 분석 삭제
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    // 인증 확인
    const { error } = await requireAuth();
    if (error) return error;

    const { id } = await params;

    // 존재 여부 확인
    const existing = await prisma.asIsDocumentAnalysis.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "문서 구조 분석을 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    // 삭제
    await prisma.asIsDocumentAnalysis.delete({
      where: { id },
    });

    return NextResponse.json({ message: "문서 구조 분석이 삭제되었습니다." });
  } catch (error) {
    console.error("문서 구조 분석 삭제 오류:", error);
    return NextResponse.json(
      { error: "문서 구조 분석 삭제에 실패했습니다." },
      { status: 500 }
    );
  }
}
