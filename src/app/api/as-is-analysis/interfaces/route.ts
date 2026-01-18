/**
 * @file src/app/api/as-is-analysis/interfaces/route.ts
 * @description
 * AS-IS 인터페이스 목록 API 라우트입니다.
 * 시스템 간 인터페이스 정보의 목록 조회 및 생성을 처리합니다.
 *
 * 초보자 가이드:
 * - GET: 단위업무 분석에 속한 인터페이스 목록 조회
 * - POST: 새 인터페이스 항목 생성
 * - 조건: currentMethod가 SYSTEM일 때 사용
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";

/**
 * GET /api/as-is-analysis/interfaces
 * 인터페이스 목록 조회
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

    // 인터페이스 목록 조회
    const interfaces = await prisma.asIsInterface.findMany({
      where: { unitAnalysisId },
      orderBy: { order: "asc" },
    });

    return NextResponse.json(interfaces);
  } catch (error) {
    console.error("인터페이스 조회 오류:", error);
    return NextResponse.json(
      { error: "인터페이스 조회에 실패했습니다." },
      { status: 500 }
    );
  }
}

/**
 * POST /api/as-is-analysis/interfaces
 * 새 인터페이스 항목 생성
 */
export async function POST(request: NextRequest) {
  try {
    // 인증 확인
    const { error } = await requireAuth();
    if (error) return error;

    const body = await request.json();
    const {
      unitAnalysisId,
      interfaceId,
      interfaceName,
      description,
      sourceSystem,
      targetSystem,
      interfaceType,
      protocol,
      frequency,
      dataVolume,
      remarks,
    } = body;

    // 필수 필드 확인
    if (!unitAnalysisId || !interfaceName) {
      return NextResponse.json(
        { error: "unitAnalysisId, interfaceName은 필수입니다." },
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
    const maxOrder = await prisma.asIsInterface.aggregate({
      where: { unitAnalysisId },
      _max: { order: true },
    });
    const nextOrder = (maxOrder._max.order ?? -1) + 1;

    // 새 인터페이스 생성
    const newItem = await prisma.asIsInterface.create({
      data: {
        unitAnalysisId,
        interfaceId: interfaceId || null,
        interfaceName,
        description: description || null,
        sourceSystem: sourceSystem || null,
        targetSystem: targetSystem || null,
        interfaceType: interfaceType || null,
        protocol: protocol || null,
        frequency: frequency || null,
        dataVolume: dataVolume || null,
        remarks: remarks || null,
        order: nextOrder,
      },
    });

    return NextResponse.json(newItem, { status: 201 });
  } catch (error) {
    console.error("인터페이스 생성 오류:", error);
    return NextResponse.json(
      { error: "인터페이스 생성에 실패했습니다." },
      { status: 500 }
    );
  }
}
