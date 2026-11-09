/**
 * @file src/app/api/equipment/filters/route.ts
 * @description
 * 설비 필터 목록 API - 프로젝트의 라인 코드 목록 조회
 *
 * 초보자 가이드:
 * - GET /api/equipment/filters?projectId=xxx → { lines: string[] }
 * - 사업부(구분코드) 단위 관리는 2026-11-09 제거됐다. 라인은 프로젝트 전체 기준이다.
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/equipment/filters
 * 프로젝트의 라인 코드 목록 (중복 제거)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get("projectId");

    if (!projectId) {
      return NextResponse.json(
        { error: "projectId가 필요합니다." },
        { status: 400 }
      );
    }

    const lines = await prisma.equipment.findMany({
      where: { projectId, lineCode: { not: null } },
      select: { lineCode: true },
      distinct: ["lineCode"],
    });

    return NextResponse.json({
      lines: lines.map((l) => l.lineCode).filter(Boolean),
    });
  } catch (error) {
    console.error("필터 목록 조회 실패:", error);
    return NextResponse.json(
      { error: "필터 목록을 조회할 수 없습니다." },
      { status: 500 }
    );
  }
}
