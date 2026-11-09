/**
 * @file src/app/api/as-is-analysis/overview/route.ts
 * @description
 * AS-IS 총괄(Overview) API 라우트입니다.
 * 프로젝트별 현행 분석 총괄 정보를 조회하고 생성합니다.
 *
 * 초보자 가이드:
 * - GET: 프로젝트의 AS-IS 총괄 조회 (항목 목록 포함)
 * - POST: 새 AS-IS 총괄 생성 (프로젝트당 1개만 허용)
 * - 사업부 구분은 쓰지 않는다. DB 의 businessUnit 컬럼은 요청 값과 무관하게
 *   항상 DEFAULT_BUSINESS_UNIT("POLE")으로 조회·저장한다.
 * - 인증: requireAuth + assertProjectAccess (프로젝트 멤버 · ADMIN 만)
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, assertProjectAccess } from "@/lib/auth";
import { DEFAULT_BUSINESS_UNIT } from "@/constants/business-units";

/**
 * GET /api/as-is-analysis/overview
 * 프로젝트별 AS-IS 총괄 조회
 */
export async function GET(request: NextRequest) {
  try {
    // 인증 확인
    const { user, error } = await requireAuth();
    if (error) return error;

    // 쿼리 파라미터
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get("projectId");
    const businessUnit = DEFAULT_BUSINESS_UNIT;

    if (!projectId) {
      return NextResponse.json(
        { error: "projectId가 필요합니다." },
        { status: 400 }
      );
    }

    const accessError = await assertProjectAccess(projectId, user!);
    if (accessError) return accessError;

    // AS-IS 총괄 조회 (항목 포함)
    const overview = await prisma.asIsOverview.findUnique({
      where: {
        projectId_businessUnit: {
          projectId,
          businessUnit,
        },
      },
      include: {
        project: {
          select: {
            id: true,
            name: true,
          },
        },
        items: {
          orderBy: [
            { asIsManagementNo: "asc" }, // 관리번호 기준 정렬
          ],
          include: {
            unitAnalysis: {
              select: {
                id: true,
              },
            },
          },
        },
      },
    });

    return NextResponse.json(overview);
  } catch (error) {
    console.error("AS-IS 총괄 조회 오류:", error);
    return NextResponse.json(
      { error: "AS-IS 총괄 조회에 실패했습니다." },
      { status: 500 }
    );
  }
}

/**
 * POST /api/as-is-analysis/overview
 * 새 AS-IS 총괄 생성
 */
export async function POST(request: NextRequest) {
  try {
    // 인증 확인
    const { user, error } = await requireAuth();
    if (error) return error;

    const body = await request.json();
    const { projectId, customerName, author } = body;
    const businessUnit = DEFAULT_BUSINESS_UNIT;

    if (!projectId) {
      return NextResponse.json(
        { error: "projectId가 필요합니다." },
        { status: 400 }
      );
    }

    const accessError = await assertProjectAccess(projectId, user!);
    if (accessError) return accessError;

    // 이미 존재하는지 확인 (프로젝트당 1개)
    const existing = await prisma.asIsOverview.findUnique({
      where: {
        projectId_businessUnit: {
          projectId,
          businessUnit,
        },
      },
    });

    if (existing) {
      return NextResponse.json(
        { error: "이미 이 프로젝트의 AS-IS 분석이 존재합니다." },
        { status: 400 }
      );
    }

    // 새 AS-IS 총괄 생성
    const overview = await prisma.asIsOverview.create({
      data: {
        projectId, // businessUnit 은 DB 기본값(POLE)
        customerName: customerName || null,
        author: author || user?.name || user?.email || "Unknown",
        createdDate: new Date(),
      },
      include: {
        project: {
          select: {
            id: true,
            name: true,
          },
        },
        items: true,
      },
    });

    return NextResponse.json(overview, { status: 201 });
  } catch (error) {
    console.error("AS-IS 총괄 생성 오류:", error);
    return NextResponse.json(
      { error: "AS-IS 총괄 생성에 실패했습니다." },
      { status: 500 }
    );
  }
}
