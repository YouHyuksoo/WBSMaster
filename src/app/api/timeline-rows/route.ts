/**
 * @file src/app/api/timeline-rows/route.ts
 * @description
 * 타임라인 행 API 라우트입니다.
 * 타임라인 행 목록 조회(GET), 행 생성(POST)을 처리합니다.
 *
 * 초보자 가이드:
 * 1. **GET /api/timeline-rows**: 프로젝트별 타임라인 행 목록 조회
 *    - ?projectId=xxx: 특정 프로젝트의 행만 조회 (필수)
 * 2. **POST /api/timeline-rows**: 새 행 생성
 *
 * 수정 방법:
 * - 정렬 변경: orderBy 조건 수정
 * - 필터링 추가: where 조건 추가
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * 타임라인 행 목록 조회
 * GET /api/timeline-rows?projectId=xxx
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get("projectId");

    // projectId 필수
    if (!projectId) {
      return NextResponse.json(
        { error: "projectId는 필수입니다." },
        { status: 400 }
      );
    }

    const rows = await prisma.timelineRow.findMany({
      where: { projectId },
      include: {
        milestones: {
          orderBy: { startDate: "asc" },
        },
      },
      orderBy: { order: "asc" },
    });

    return NextResponse.json(rows);
  } catch (error) {
    console.error("타임라인 행 목록 조회 실패:", error);
    return NextResponse.json(
      { error: "타임라인 행 목록을 조회할 수 없습니다." },
      { status: 500 }
    );
  }
}

/**
 * 타임라인 행 생성
 * POST /api/timeline-rows
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, color, projectId, isDefault, parentId } = body;

    // 필수 필드 검증
    if (!name || !projectId) {
      return NextResponse.json(
        { error: "name, projectId는 필수입니다." },
        { status: 400 }
      );
    }

    // 프로젝트 존재 확인
    const project = await prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      return NextResponse.json(
        { error: "프로젝트를 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    // parentId가 지정된 경우, 부모 행이 같은 프로젝트에 속하는지 확인
    if (parentId) {
      const parentRow = await prisma.timelineRow.findUnique({
        where: { id: parentId },
      });

      if (!parentRow || parentRow.projectId !== projectId) {
        return NextResponse.json(
          { error: "부모 행을 찾을 수 없습니다." },
          { status: 404 }
        );
      }
    }

    // 현재 최대 order 값 조회
    const maxOrderRow = await prisma.timelineRow.findFirst({
      where: { projectId },
      orderBy: { order: "desc" },
      select: { order: true },
    });

    const maxOrderValue = maxOrderRow?.order ?? -1;

    // 행 생성
    const row = await prisma.timelineRow.create({
      data: {
        name,
        color: color || "#94A3B8",
        order: maxOrderValue + 1,
        isDefault: isDefault || false,
        projectId,
        parentId: parentId || null,
      },
      include: {
        milestones: true,
      },
    });

    return NextResponse.json(row, { status: 201 });
  } catch (error) {
    console.error("타임라인 행 생성 실패:", error);
    return NextResponse.json(
      { error: "타임라인 행을 생성할 수 없습니다." },
      { status: 500 }
    );
  }
}
