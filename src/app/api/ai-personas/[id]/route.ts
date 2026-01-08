/**
 * @file src/app/api/ai-personas/[id]/route.ts
 * @description
 * 개별 AI 페르소나 API 라우트입니다.
 * 페르소나 조회, 수정, 삭제를 처리합니다.
 *
 * 초보자 가이드:
 * 1. **GET /api/ai-personas/[id]**: 특정 페르소나 조회
 * 2. **PATCH /api/ai-personas/[id]**: 페르소나 수정
 * 3. **DELETE /api/ai-personas/[id]**: 페르소나 삭제
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";

type RouteParams = { params: Promise<{ id: string }> };

/**
 * 페르소나 상세 조회
 * GET /api/ai-personas/[id]
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { user, error } = await requireAuth();
    if (error) return error;

    const { id } = await params;

    const persona = await prisma.aiPersona.findFirst({
      where: { id, userId: user!.id },
    });

    if (!persona) {
      return NextResponse.json(
        { error: "페르소나를 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    return NextResponse.json(persona);
  } catch (error) {
    console.error("페르소나 조회 실패:", error);
    return NextResponse.json(
      { error: "페르소나를 조회할 수 없습니다." },
      { status: 500 }
    );
  }
}

/**
 * 페르소나 수정
 * PATCH /api/ai-personas/[id]
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { user, error } = await requireAuth();
    if (error) return error;

    const { id } = await params;
    const body = await request.json();
    const { name, description, icon, systemPrompt, isActive } = body;

    // 해당 페르소나가 사용자의 것인지 확인
    const existing = await prisma.aiPersona.findFirst({
      where: { id, userId: user!.id },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "페르소나를 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    // 업데이트 데이터 구성
    const updateData: {
      name?: string;
      description?: string | null;
      icon?: string;
      systemPrompt?: string;
      isActive?: boolean;
    } = {};

    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (icon !== undefined) updateData.icon = icon;
    if (systemPrompt !== undefined) updateData.systemPrompt = systemPrompt;
    if (isActive !== undefined) updateData.isActive = isActive;

    const persona = await prisma.aiPersona.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json(persona);
  } catch (error) {
    console.error("페르소나 수정 실패:", error);
    return NextResponse.json(
      { error: "페르소나를 수정할 수 없습니다." },
      { status: 500 }
    );
  }
}

/**
 * 페르소나 삭제
 * DELETE /api/ai-personas/[id]
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { user, error } = await requireAuth();
    if (error) return error;

    const { id } = await params;

    // 해당 페르소나가 사용자의 것인지 확인
    const existing = await prisma.aiPersona.findFirst({
      where: { id, userId: user!.id },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "페르소나를 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    // 기본 페르소나는 삭제 불가
    if (existing.isDefault) {
      return NextResponse.json(
        { error: "기본 페르소나는 삭제할 수 없습니다." },
        { status: 400 }
      );
    }

    await prisma.aiPersona.delete({ where: { id } });

    return NextResponse.json({ message: "페르소나가 삭제되었습니다." });
  } catch (error) {
    console.error("페르소나 삭제 실패:", error);
    return NextResponse.json(
      { error: "페르소나를 삭제할 수 없습니다." },
      { status: 500 }
    );
  }
}
