/**
 * @file src/app/api/projects/[id]/overview/route.ts
 * @description
 * 프로젝트 개요 정보(목적, 조직도, 성공지표, 미래 비전 등)를 수정하는 API입니다.
 *
 * 주요 기능:
 * - PUT: 프로젝트 개요 정보 업데이트
 * - GET: 프로젝트 개요 정보 조회
 *
 * @example
 * PUT /api/projects/{id}/overview
 * {
 *   "purpose": "프로젝트 목적",
 *   "organizationChart": [{ "id": "1", "role": "PM", "name": "홍길동", "department": "개발팀" }],
 *   "successIndicators": ["목표1", "목표2"],
 *   "futureVision": "미래 비전 설명",
 *   "visionImage": "https://example.com/vision.jpg"
 * }
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/projects/{id}/overview
 * 프로젝트 개요 정보를 조회합니다.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // 인증 확인
  const { user, error } = await requireAuth();
  if (error) return error;

  const { id } = await params;

  try {
    const project = await prisma.project.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        description: true,
        status: true,
        startDate: true,
        endDate: true,
        progress: true,
        purpose: true,
        organizationChart: true,
        successIndicators: true,
        futureVision: true,
        visionImage: true,
      },
    });

    if (!project) {
      return NextResponse.json(
        { error: "프로젝트를 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    return NextResponse.json(project);
  } catch (error) {
    console.error("[Project Overview GET] 조회 오류:", error);
    return NextResponse.json(
      { error: "프로젝트 개요 조회 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/projects/{id}/overview
 * 프로젝트 개요 정보를 수정합니다.
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // 인증 확인
  const { user, error } = await requireAuth();
  if (error) return error;

  const { id } = await params;

  try {
    const body = await request.json();
    const {
      purpose,
      organizationChart,
      successIndicators,
      futureVision,
      visionImage,
    } = body;

    // 프로젝트 존재 확인
    const existingProject = await prisma.project.findUnique({
      where: { id },
    });

    if (!existingProject) {
      return NextResponse.json(
        { error: "프로젝트를 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    // 프로젝트 개요 정보 업데이트
    const updatedProject = await prisma.project.update({
      where: { id },
      data: {
        purpose: purpose !== undefined ? purpose : existingProject.purpose,
        organizationChart:
          organizationChart !== undefined
            ? organizationChart
            : existingProject.organizationChart,
        successIndicators:
          successIndicators !== undefined
            ? successIndicators
            : existingProject.successIndicators,
        futureVision:
          futureVision !== undefined ? futureVision : existingProject.futureVision,
        visionImage:
          visionImage !== undefined ? visionImage : existingProject.visionImage,
      },
      select: {
        id: true,
        name: true,
        description: true,
        status: true,
        startDate: true,
        endDate: true,
        progress: true,
        purpose: true,
        organizationChart: true,
        successIndicators: true,
        futureVision: true,
        visionImage: true,
      },
    });

    return NextResponse.json(updatedProject);
  } catch (error) {
    console.error("[Project Overview PUT] 수정 오류:", error);
    return NextResponse.json(
      { error: "프로젝트 개요 수정 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
