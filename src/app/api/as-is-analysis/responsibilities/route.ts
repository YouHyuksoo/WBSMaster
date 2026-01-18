/**
 * @file src/app/api/as-is-analysis/responsibilities/route.ts
 * @description
 * AS-IS R&R 정의(역할과 책임) API 라우트입니다.
 * 역할/담당자별 책임과 권한의 목록 조회 및 생성을 처리합니다.
 *
 * 초보자 가이드:
 * - GET: 단위업무 분석에 속한 R&R 목록 조회
 * - POST: 새 R&R 항목 생성
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";

/**
 * GET /api/as-is-analysis/responsibilities
 * R&R 목록 조회
 */
export async function GET(request: NextRequest) {
  try {
    // 인증 확인
    const { error } = await requireAuth();
    if (error) return error;

    // 쿼리 파라미터
    const { searchParams } = new URL(request.url);
    const unitAnalysisId = searchParams.get("unitAnalysisId");

    if (!unitAnalysisId) {
      return NextResponse.json(
        { error: "unitAnalysisId가 필요합니다." },
        { status: 400 }
      );
    }

    // R&R 목록 조회
    const responsibilities = await prisma.asIsResponsibility.findMany({
      where: { unitAnalysisId },
      orderBy: { order: "asc" },
    });

    return NextResponse.json(responsibilities);
  } catch (error) {
    console.error("R&R 조회 오류:", error);
    return NextResponse.json(
      { error: "R&R 조회에 실패했습니다." },
      { status: 500 }
    );
  }
}

/**
 * POST /api/as-is-analysis/responsibilities
 * 새 R&R 항목 생성
 */
export async function POST(request: NextRequest) {
  try {
    // 인증 확인
    const { error } = await requireAuth();
    if (error) return error;

    const body = await request.json();
    const {
      unitAnalysisId,
      role,
      department,
      responsibility,
      authority,
      remarks,
    } = body;

    // 필수 필드 확인
    if (!unitAnalysisId || !role || !responsibility) {
      return NextResponse.json(
        { error: "unitAnalysisId, role, responsibility는 필수입니다." },
        { status: 400 }
      );
    }

    // 단위업무 분석 존재 여부 확인
    const unitAnalysis = await prisma.asIsUnitAnalysis.findUnique({
      where: { id: unitAnalysisId },
    });

    if (!unitAnalysis) {
      return NextResponse.json(
        { error: "단위업무 분석을 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    // 다음 order 값 계산
    const maxOrder = await prisma.asIsResponsibility.aggregate({
      where: { unitAnalysisId },
      _max: { order: true },
    });
    const nextOrder = (maxOrder._max.order ?? -1) + 1;

    // 새 R&R 생성
    const newItem = await prisma.asIsResponsibility.create({
      data: {
        unitAnalysisId,
        role,
        department: department || null,
        responsibility,
        authority: authority || null,
        remarks: remarks || null,
        order: nextOrder,
      },
    });

    return NextResponse.json(newItem, { status: 201 });
  } catch (error) {
    console.error("R&R 생성 오류:", error);
    return NextResponse.json(
      { error: "R&R 생성에 실패했습니다." },
      { status: 500 }
    );
  }
}
