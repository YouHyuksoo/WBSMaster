/**
 * @file src/app/api/pinpoints/route.ts
 * @description
 * 타임라인 핀포인트 API 라우트입니다.
 * 핀포인트 목록 조회(GET), 생성(POST)을 처리합니다.
 *
 * 초보자 가이드:
 * 1. **GET /api/pinpoints**: 프로젝트 또는 행별 핀포인트 목록 조회
 *    - ?projectId=xxx: 프로젝트의 모든 핀포인트
 *    - ?rowId=xxx: 특정 행의 핀포인트만
 * 2. **POST /api/pinpoints**: 새 핀포인트 생성
 *
 * 수정 방법:
 * - 정렬 변경: orderBy 조건 수정
 * - 필터링 추가: where 조건 추가
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * 핀포인트 목록 조회
 * GET /api/pinpoints?projectId=xxx&rowId=xxx
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get("projectId");
    const rowId = searchParams.get("rowId");

    // projectId 필수
    if (!projectId) {
      return NextResponse.json(
        { error: "projectId는 필수입니다." },
        { status: 400 }
      );
    }

    const where: any = { projectId };
    if (rowId) {
      where.rowId = rowId;
    }

    const pinpoints = await prisma.pinpoint.findMany({
      where,
      orderBy: { date: "asc" },
    });

    return NextResponse.json(pinpoints);
  } catch (error) {
    console.error("핀포인트 목록 조회 실패:", error);
    return NextResponse.json(
      { error: "핀포인트 목록을 조회할 수 없습니다." },
      { status: 500 }
    );
  }
}

/**
 * 핀포인트 생성
 * POST /api/pinpoints
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, date, color, description, projectId, rowId } = body;

    // 필수 필드 검증
    if (!name || !date || !projectId || !rowId) {
      return NextResponse.json(
        { error: "name, date, projectId, rowId는 필수입니다." },
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

    // 행 존재 확인
    const row = await prisma.timelineRow.findUnique({
      where: { id: rowId },
    });

    if (!row) {
      return NextResponse.json(
        { error: "타임라인 행을 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    // 행이 같은 프로젝트에 속하는지 확인
    if (row.projectId !== projectId) {
      return NextResponse.json(
        { error: "행이 프로젝트에 속하지 않습니다." },
        { status: 400 }
      );
    }

    // 핀포인트 생성
    const pinpoint = await prisma.pinpoint.create({
      data: {
        name,
        date: new Date(date),
        color: color || "#EF4444",
        description: description || null,
        projectId,
        rowId,
      },
    });

    return NextResponse.json(pinpoint, { status: 201 });
  } catch (error) {
    console.error("핀포인트 생성 실패:", error);
    return NextResponse.json(
      { error: "핀포인트를 생성할 수 없습니다." },
      { status: 500 }
    );
  }
}
