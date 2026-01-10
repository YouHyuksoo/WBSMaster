/**
 * @file src/app/api/milestones/route.ts
 * @description
 * 마일스톤 관리 API 라우트입니다.
 * 마일스톤 목록 조회(GET), 마일스톤 생성(POST)을 처리합니다.
 *
 * 초보자 가이드:
 * 1. **GET /api/milestones**: 프로젝트별 마일스톤 목록 조회
 *    - ?projectId=xxx: 특정 프로젝트의 마일스톤만 조회 (필수)
 *    - ?rowId=xxx: 특정 행의 마일스톤만 조회 (선택)
 * 2. **POST /api/milestones**: 새 마일스톤 생성
 *
 * 수정 방법:
 * - 정렬 변경: orderBy 조건 수정
 * - 필터링 추가: where 조건 추가
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { MilestoneStatus, Prisma } from "@prisma/client";

/**
 * 마일스톤 목록 조회
 * GET /api/milestones?projectId=xxx&rowId=xxx
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get("projectId");
    const rowId = searchParams.get("rowId");
    const status = searchParams.get("status") as MilestoneStatus | null;

    // projectId 필수
    if (!projectId) {
      return NextResponse.json(
        { error: "projectId는 필수입니다." },
        { status: 400 }
      );
    }

    // 필터 조건 구성
    const where: Prisma.MilestoneWhereInput = {
      projectId,
    };

    // 행 필터링
    if (rowId) {
      where.rowId = rowId;
    }

    // 상태 필터링
    if (status && Object.values(MilestoneStatus).includes(status)) {
      where.status = status;
    }

    const milestones = await prisma.milestone.findMany({
      where,
      include: {
        project: {
          select: {
            id: true,
            name: true,
            startDate: true,
            endDate: true,
          },
        },
        row: {
          select: {
            id: true,
            name: true,
            color: true,
          },
        },
      },
      orderBy: [
        { startDate: "asc" },
        { order: "asc" },
      ],
    });

    return NextResponse.json(milestones);
  } catch (error) {
    console.error("마일스톤 목록 조회 실패:", error);
    return NextResponse.json(
      { error: "마일스톤 목록을 조회할 수 없습니다." },
      { status: 500 }
    );
  }
}

/**
 * 마일스톤 생성
 * POST /api/milestones
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, description, startDate, endDate, status, color, order, projectId, rowId } = body;

    // 필수 필드 검증
    if (!name || !startDate || !endDate || !projectId) {
      return NextResponse.json(
        { error: "name, startDate, endDate, projectId는 필수입니다." },
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

    // rowId가 제공된 경우 행 존재 확인
    if (rowId) {
      const row = await prisma.timelineRow.findUnique({
        where: { id: rowId },
      });

      if (!row) {
        return NextResponse.json(
          { error: "타임라인 행을 찾을 수 없습니다." },
          { status: 404 }
        );
      }
    }

    // 마일스톤 생성
    const milestone = await prisma.milestone.create({
      data: {
        name,
        description: description || null,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        status: status || "PENDING",
        color: color || "#3B82F6",
        order: order || 0,
        projectId,
        rowId: rowId || null,
      },
      include: {
        project: {
          select: {
            id: true,
            name: true,
          },
        },
        row: {
          select: {
            id: true,
            name: true,
            color: true,
          },
        },
      },
    });

    return NextResponse.json(milestone, { status: 201 });
  } catch (error) {
    console.error("마일스톤 생성 실패:", error);
    return NextResponse.json(
      { error: "마일스톤을 생성할 수 없습니다." },
      { status: 500 }
    );
  }
}
