/**
 * @file src/app/api/process-verification/categories/route.ts
 * @description
 * 공정검증 카테고리 API 라우트입니다.
 * 카테고리 목록 조회(GET), 카테고리 생성(POST)을 처리합니다.
 *
 * 초보자 가이드:
 * 1. **GET /api/process-verification/categories**: 카테고리 목록 조회
 *    - ?projectId=xxx: 프로젝트별 카테고리 조회 (필수)
 * 2. **POST /api/process-verification/categories**: 새 카테고리 생성
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * 카테고리 목록 조회
 * GET /api/process-verification/categories?projectId=xxx
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get("projectId");

    if (!projectId) {
      return NextResponse.json(
        { error: "프로젝트 ID는 필수입니다." },
        { status: 400 }
      );
    }

    const categories = await prisma.processVerificationCategory.findMany({
      where: { projectId },
      include: {
        _count: {
          select: { items: true },
        },
      },
      orderBy: { order: "asc" },
    });

    return NextResponse.json(categories);
  } catch (error) {
    console.error("카테고리 목록 조회 실패:", error);
    return NextResponse.json(
      { error: "카테고리 목록을 조회할 수 없습니다." },
      { status: 500 }
    );
  }
}

/**
 * 카테고리 생성
 * POST /api/process-verification/categories
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { projectId, name, code, order, description } = body;

    // 필수 필드 검증
    if (!projectId || !name || !code) {
      return NextResponse.json(
        { error: "프로젝트 ID, 이름, 코드는 필수입니다." },
        { status: 400 }
      );
    }

    // 중복 코드 체크
    const existing = await prisma.processVerificationCategory.findUnique({
      where: { projectId_code: { projectId, code } },
    });

    if (existing) {
      return NextResponse.json(
        { error: "이미 존재하는 카테고리 코드입니다." },
        { status: 409 }
      );
    }

    const category = await prisma.processVerificationCategory.create({
      data: {
        projectId,
        name,
        code,
        order: order ?? 0,
        description,
      },
    });

    return NextResponse.json(category, { status: 201 });
  } catch (error) {
    console.error("카테고리 생성 실패:", error);
    return NextResponse.json(
      { error: "카테고리를 생성할 수 없습니다." },
      { status: 500 }
    );
  }
}
