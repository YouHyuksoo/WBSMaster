/**
 * @file src/app/api/process-verification/masters/route.ts
 * @description
 * 공정검증 마스터 API
 * 관리코드 기준 단일 마스터 데이터 CRUD
 *
 * 초보자 가이드:
 * 1. **GET**: 마스터 목록 조회 (사업부별 적용 현황 포함)
 * 2. **POST**: 새 마스터 생성 (+ 모든 사업부 적용 데이터 자동 생성)
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * 제품유형별 사업부 매핑
 * - SMD: V_IVI, V_DISP, V_PCBA (동일 마스터 공유)
 * - HANES: V_HMS (별도 마스터)
 */
const PRODUCT_TYPE_BUSINESS_UNITS: Record<string, string[]> = {
  SMD: ["V_IVI", "V_DISP", "V_PCBA"],
  HANES: ["V_HMS"],
};

/**
 * 마스터 목록 조회
 * GET /api/process-verification/masters
 *
 * Query params:
 * - projectId: 프로젝트 ID (필수)
 * - categoryId: 카테고리 필터 (선택)
 * - productType: 제품유형 필터 (선택)
 * - search: 검색어 (선택)
 * - businessUnit: 특정 사업부 적용 필터 (선택)
 * - isApplied: 해당 사업부 적용 여부 필터 (선택)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get("projectId");
    const categoryId = searchParams.get("categoryId");
    const productType = searchParams.get("productType");
    const search = searchParams.get("search");
    const businessUnit = searchParams.get("businessUnit");
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

    // 특정 사업부 적용 여부로 필터링
    if (businessUnit && isApplied !== null) {
      where.businessUnitApplies = {
        some: {
          businessUnit,
          isApplied: isApplied === "true",
        },
      };
    }

    const masters = await prisma.processVerificationMaster.findMany({
      where,
      include: {
        categoryRef: {
          select: { id: true, name: true, code: true },
        },
        businessUnitApplies: {
          orderBy: { businessUnit: "asc" },
        },
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
 * - businessUnits: 사업부별 적용 설정 (선택)
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
      businessUnits = [], // { businessUnit: string, isApplied: boolean, status?: string }[]
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

    // 트랜잭션으로 마스터 + 사업부 적용 일괄 생성
    const master = await prisma.$transaction(async (tx) => {
      // 1. 마스터 생성
      const newMaster = await tx.processVerificationMaster.create({
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
        },
      });

      // 2. 사업부 적용 데이터 생성 (제품유형에 맞는 사업부만)
      const targetBusinessUnits = PRODUCT_TYPE_BUSINESS_UNITS[productType] || [];

      if (businessUnits.length > 0) {
        // 전달된 사업부별 설정 사용 (해당 제품유형 사업부만 필터링)
        const filteredBUs = businessUnits.filter(
          (bu: { businessUnit: string }) => targetBusinessUnits.includes(bu.businessUnit)
        );
        await tx.processVerificationBusinessUnit.createMany({
          data: filteredBUs.map(
            (bu: {
              businessUnit: string;
              isApplied?: boolean;
              status?: string;
            }) => ({
              masterId: newMaster.id,
              businessUnit: bu.businessUnit,
              isApplied: bu.isApplied ?? false,
              status: (bu.status as "PENDING" | "IN_PROGRESS" | "VERIFIED" | "NOT_APPLICABLE") ?? "PENDING",
            })
          ),
        });
      } else {
        // 전달 안 된 경우 해당 제품유형의 사업부에 대해 기본값(미적용)으로 생성
        await tx.processVerificationBusinessUnit.createMany({
          data: targetBusinessUnits.map((unit) => ({
            masterId: newMaster.id,
            businessUnit: unit,
            isApplied: false,
            status: "PENDING" as const,
          })),
        });
      }

      return newMaster;
    });

    // 생성된 마스터 + 사업부 적용 조회하여 반환
    const result = await prisma.processVerificationMaster.findUnique({
      where: { id: master.id },
      include: {
        categoryRef: { select: { id: true, name: true, code: true } },
        businessUnitApplies: { orderBy: { businessUnit: "asc" } },
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
