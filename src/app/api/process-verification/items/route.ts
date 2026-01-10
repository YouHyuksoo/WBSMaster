/**
 * @file src/app/api/process-verification/items/route.ts
 * @description
 * 공정검증 항목 API 라우트입니다.
 * 항목 목록 조회(GET), 항목 생성(POST)을 처리합니다.
 *
 * 초보자 가이드:
 * 1. **GET /api/process-verification/items**: 항목 목록 조회
 *    - ?categoryId=xxx: 특정 카테고리의 항목만 조회
 *    - ?projectId=xxx: 프로젝트 전체 항목 조회
 *    - ?isApplied=true: 적용 항목만 필터링
 * 2. **POST /api/process-verification/items**: 새 항목 생성
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * 항목 목록 조회
 * GET /api/process-verification/items
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const categoryId = searchParams.get("categoryId");
    const projectId = searchParams.get("projectId");
    const isApplied = searchParams.get("isApplied");
    const search = searchParams.get("search");

    // 필터 조건 구성
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = {};

    if (categoryId) {
      where.categoryId = categoryId;
    }

    if (projectId) {
      where.categoryRef = { projectId };
    }

    if (isApplied === "true") {
      where.isApplied = true;
    } else if (isApplied === "false") {
      where.isApplied = false;
    }

    if (search) {
      where.OR = [
        { managementArea: { contains: search, mode: "insensitive" } },
        { detailItem: { contains: search, mode: "insensitive" } },
        { mesMapping: { contains: search, mode: "insensitive" } },
        { managementCode: { contains: search, mode: "insensitive" } },
        { verificationDetail: { contains: search, mode: "insensitive" } },
      ];
    }

    const items = await prisma.processVerificationItem.findMany({
      where,
      include: {
        categoryRef: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
      },
      orderBy: [
        { categoryRef: { order: "asc" } },
        { order: "asc" },
      ],
    });

    return NextResponse.json(items);
  } catch (error) {
    console.error("항목 목록 조회 실패:", error);
    return NextResponse.json(
      { error: "항목 목록을 조회할 수 없습니다." },
      { status: 500 }
    );
  }
}

/**
 * 항목 생성
 * POST /api/process-verification/items
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      categoryId,
      category,
      isApplied,
      managementArea,
      detailItem,
      mesMapping,
      verificationDetail,
      managementCode,
      acceptanceStatus,
      existingMes,
      customerRequest,
      order,
      remarks,
      status,
    } = body;

    // 필수 필드 검증
    if (!categoryId || !managementArea || !detailItem || !managementCode) {
      return NextResponse.json(
        { error: "카테고리 ID, 관리 영역, 세부 관리 항목, 관리코드는 필수입니다." },
        { status: 400 }
      );
    }

    // 카테고리 존재 확인
    const categoryRef = await prisma.processVerificationCategory.findUnique({
      where: { id: categoryId },
    });

    if (!categoryRef) {
      return NextResponse.json(
        { error: "카테고리를 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    const item = await prisma.processVerificationItem.create({
      data: {
        categoryId,
        category: category ?? categoryRef.name,
        isApplied: isApplied ?? false,
        managementArea,
        detailItem,
        mesMapping,
        verificationDetail,
        managementCode,
        acceptanceStatus,
        existingMes: existingMes ?? false,
        customerRequest,
        order: order ?? 0,
        remarks,
        status: status ?? "PENDING",
      },
      include: {
        categoryRef: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
      },
    });

    return NextResponse.json(item, { status: 201 });
  } catch (error) {
    console.error("항목 생성 실패:", error);
    return NextResponse.json(
      { error: "항목을 생성할 수 없습니다." },
      { status: 500 }
    );
  }
}
