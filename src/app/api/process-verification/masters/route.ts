/**
 * @file src/app/api/process-verification/masters/route.ts
 * @description
 * 공정검증 마스터 API
 * 관리코드 기준 단일 마스터 데이터 CRUD
 *
 * 초보자 가이드:
 * 1. **GET**: 마스터 목록 조회 (적용 행 포함)
 * 2. **POST**: 새 마스터 생성 (+ 적용 행 1건 자동 생성)
 * 3. 적용 행은 마스터당 하나이며 businessUnit 은 항상 DEFAULT_BUSINESS_UNIT 이다.
 *    (2026-11-09 화면에서 사업부 구분 제거)
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { DEFAULT_BUSINESS_UNIT } from "@/constants/business-units";

/** 검증 상태 값 */
type VerificationStatus = "PENDING" | "IN_PROGRESS" | "VERIFIED" | "NOT_APPLICABLE";

/** 응답에 포함할 적용 행 (고정 값 행만) */
const APPLY_INCLUDE = {
  where: { businessUnit: DEFAULT_BUSINESS_UNIT },
} as const;

/**
 * 마스터 목록 조회
 * GET /api/process-verification/masters
 *
 * Query params:
 * - projectId: 프로젝트 ID (필수)
 * - categoryId: 카테고리 필터 (선택)
 * - productType: 제품유형 필터 (선택)
 * - search: 검색어 (선택)
 * - isApplied: 적용 여부 필터 (선택, "true" | "false")
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get("projectId");
    const categoryId = searchParams.get("categoryId");
    const productType = searchParams.get("productType");
    const search = searchParams.get("search");
    const isApplied = searchParams.get("isApplied");

    if (!projectId) {
      return NextResponse.json(
        { error: "프로젝트 ID는 필수입니다." },
        { status: 400 }
      );
    }

    // 필터 조건 구성
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = {
      categoryRef: { projectId },
    };

    if (categoryId) {
      where.categoryId = categoryId;
    }

    if (productType) {
      where.productType = productType;
    }

    if (search) {
      where.OR = [
        { managementCode: { contains: search, mode: "insensitive" } },
        { managementArea: { contains: search, mode: "insensitive" } },
        { detailItem: { contains: search, mode: "insensitive" } },
        { mesMapping: { contains: search, mode: "insensitive" } },
        { verificationDetail: { contains: search, mode: "insensitive" } },
      ];
    }

    // 적용 여부 필터 (적용 행이 없는 마스터는 미적용으로 본다)
    if (isApplied === "true") {
      where.businessUnitApplies = {
        some: { businessUnit: DEFAULT_BUSINESS_UNIT, isApplied: true },
      };
    } else if (isApplied === "false") {
      where.businessUnitApplies = {
        none: { businessUnit: DEFAULT_BUSINESS_UNIT, isApplied: true },
      };
    }

    const masters = await prisma.processVerificationMaster.findMany({
      where,
      include: {
        categoryRef: {
          select: { id: true, name: true, code: true },
        },
        businessUnitApplies: APPLY_INCLUDE,
      },
      orderBy: [{ categoryRef: { order: "asc" } }, { order: "asc" }],
    });

    return NextResponse.json(masters);
  } catch (error) {
    console.error("마스터 목록 조회 실패:", error);
    return NextResponse.json(
      { error: "마스터 목록을 조회할 수 없습니다.", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

/**
 * 마스터 생성
 * POST /api/process-verification/masters
 *
 * Body:
 * - categoryId: 카테고리 ID (필수)
 * - managementCode: 관리코드 (필수)
 * - productType: 제품유형 (기본: SMD)
 * - ... 기타 마스터 필드
 * - isApplied: 적용 여부 (선택, 기본 false)
 * - status: 검증 상태 (선택, 기본 PENDING)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      categoryId,
      managementCode,
      productType = "SMD",
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
      isApplied,
      status,
    } = body;

    // 필수 필드 검증
    if (!categoryId || !managementArea || !detailItem || !managementCode) {
      return NextResponse.json(
        {
          error: "카테고리 ID, 관리코드, 관리 영역, 세부 항목은 필수입니다.",
        },
        { status: 400 }
      );
    }

    // 제품유형 + 관리코드 중복 확인
    const existing = await prisma.processVerificationMaster.findUnique({
      where: {
        productType_managementCode: { productType, managementCode }
      },
    });

    if (existing) {
      return NextResponse.json(
        { error: `${productType} 제품유형에 관리코드 "${managementCode}"가 이미 존재합니다.` },
        { status: 409 }
      );
    }

    // 마스터 + 적용 행 1건을 함께 생성
    const master = await prisma.processVerificationMaster.create({
      data: {
        categoryId,
        managementCode,
        productType,
        category: category || "",
        managementArea,
        detailItem,
        mesMapping,
        verificationDetail,
        acceptanceStatus,
        existingMes: existingMes ?? false,
        customerRequest,
        asIsCode,
        toBeCode,
        order: order ?? 0,
        remarks,
        businessUnitApplies: {
          create: {
            // businessUnit 은 DB 기본값(POLE)
            isApplied: isApplied === true,
            status: (status as VerificationStatus | undefined) ?? "PENDING",
          },
        },
      },
    });

    // 생성된 마스터 + 적용 행 조회하여 반환
    const result = await prisma.processVerificationMaster.findUnique({
      where: { id: master.id },
      include: {
        categoryRef: { select: { id: true, name: true, code: true } },
        businessUnitApplies: APPLY_INCLUDE,
      },
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error("마스터 생성 실패:", error);
    return NextResponse.json(
      { error: "마스터를 생성할 수 없습니다." },
      { status: 500 }
    );
  }
}
