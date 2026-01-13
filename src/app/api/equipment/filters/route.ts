/**
 * @file src/app/api/equipment/filters/route.ts
 * @description
 * 설비 필터 목록 API - 사업부/라인 코드 목록 조회
 *
 * 사용법:
 * - 사업부 목록: GET /api/equipment/filters?projectId=xxx
 * - 라인 목록: GET /api/equipment/filters?projectId=xxx&divisionCode=V_PCBA
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/equipment/filters
 * - divisionCode 없으면: 사업부 목록만 반환
 * - divisionCode 있으면: 해당 사업부의 라인 목록 반환
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get("projectId");
    const divisionCode = searchParams.get("divisionCode");

    if (!projectId) {
      return NextResponse.json(
        { error: "projectId가 필요합니다." },
        { status: 400 }
      );
    }

    // divisionCode가 없으면 사업부 목록만 반환
    if (!divisionCode) {
      const divisions = await prisma.equipment.findMany({
        where: { projectId, divisionCode: { not: null } },
        select: { divisionCode: true },
        distinct: ["divisionCode"],
      });

      return NextResponse.json({
        divisions: divisions.map((d) => d.divisionCode).filter(Boolean),
        lines: [], // 라인은 사업부 선택 후 별도 요청
      });
    }

    // divisionCode가 있으면 해당 사업부의 라인 목록 반환
    const lines = await prisma.equipment.findMany({
      where: {
        projectId,
        divisionCode: divisionCode === "ALL" ? undefined : divisionCode,
        lineCode: { not: null }
      },
      select: { lineCode: true },
      distinct: ["lineCode"],
    });

    return NextResponse.json({
      divisions: [], // 이미 사업부는 알고 있으므로 빈 배열
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
