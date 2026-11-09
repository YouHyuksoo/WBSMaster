/**
 * @file src/app/api/wbs/[id]/route.ts
 * @description
 * 개별 WBS 항목 API 라우트입니다.
 * 특정 WBS 항목의 조회(GET), 수정(PATCH), 삭제(DELETE)를 처리합니다.
 *
 * 초보자 가이드:
 * 1. **GET /api/wbs/[id]**: 특정 WBS 항목 상세 조회
 * 2. **PATCH /api/wbs/[id]**: WBS 항목 수정
 * 3. **DELETE /api/wbs/[id]**: WBS 항목 삭제 (자식도 함께 삭제됨)
 * 4. 인증: requireAuth + assertProjectAccess (WBS 항목의 projectId 기준, 프로젝트 멤버 · ADMIN 만)
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { WbsLevel } from "@prisma/client";
import { requireAuth, assertProjectAccess } from "@/lib/auth";
import { updateWbsItem, updateParentProgress } from "@/lib/services/wbsService";

/** WBS 레벨별 숫자 매핑 */
const levelToNumber: Record<WbsLevel, number> = {
  LEVEL1: 1,
  LEVEL2: 2,
  LEVEL3: 3,
  LEVEL4: 4,
};

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * WBS 항목 상세 조회
 * GET /api/wbs/[id]
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { user, error } = await requireAuth();
    if (error) return error;

    const { id } = await params;

    const wbsItem = await prisma.wbsItem.findUnique({
      where: { id },
      include: {
        parent: {
          select: {
            id: true,
            code: true,
            name: true,
            level: true,
          },
        },
        children: {
          include: {
            assignees: {
              include: {
                user: {
                  select: {
                    id: true,
                    name: true,
                    avatar: true,
                  },
                },
              },
            },
          },
          orderBy: { order: "asc" },
        },
        assignees: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                avatar: true,
              },
            },
          },
        },
        project: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!wbsItem) {
      return NextResponse.json(
        { error: "WBS 항목을 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    const denied = await assertProjectAccess(wbsItem.projectId, user!);
    if (denied) return denied;

    // 응답 형식 변환
    const transformedItem = {
      ...wbsItem,
      assignees: wbsItem.assignees.map((a) => a.user),
      children: wbsItem.children.map((child) => ({
        ...child,
        assignees: child.assignees.map((a) => a.user),
        levelNumber: levelToNumber[child.level],
      })),
      levelNumber: levelToNumber[wbsItem.level],
    };

    return NextResponse.json(transformedItem);
  } catch (error) {
    console.error("WBS 항목 조회 실패:", error);
    return NextResponse.json(
      { error: "WBS 항목을 조회할 수 없습니다." },
      { status: 500 }
    );
  }
}

/**
 * WBS 항목 수정
 * PATCH /api/wbs/[id]
 * (인증 필요)
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    // 인증 확인
    const { user, error } = await requireAuth();
    if (error) return error;

    const { id } = await params;
    const body = await request.json();
    const {
      name,
      description,
      status,
      progress,
      startDate,
      endDate,
      actualStartDate,
      actualEndDate,
      weight,
      assigneeIds,
      order,
      deliverableName,
      deliverableLink,
    } = body;

    // 기존 항목 확인 (권한 확인용)
    const existing = await prisma.wbsItem.findUnique({ where: { id }, select: { projectId: true } });
    if (!existing) {
      return NextResponse.json(
        { error: "WBS 항목을 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    const denied = await assertProjectAccess(existing.projectId, user!);
    if (denied) return denied;

    // 상태 자동 · 담당자 교체 · 상위 진행률 재계산은 서비스에서 (AI 채팅 확인 카드와 같은 함수)
    const result = await updateWbsItem(id, existing.projectId, {
      name, description, status, progress, startDate, endDate, actualStartDate, actualEndDate,
      weight, assigneeIds, order, deliverableName, deliverableLink,
    });
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    return NextResponse.json(result.data);
  } catch (error) {
    console.error("WBS 항목 수정 실패:", error);
    return NextResponse.json(
      { error: "WBS 항목을 수정할 수 없습니다." },
      { status: 500 }
    );
  }
}

/**
 * WBS 항목 삭제
 * DELETE /api/wbs/[id]
 * (인증 필요)
 * 주의: 자식 항목도 함께 삭제됩니다 (CASCADE)
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    // 인증 확인
    const { user, error } = await requireAuth();
    if (error) return error;

    const { id } = await params;

    // 기존 항목 확인
    const existing = await prisma.wbsItem.findUnique({
      where: { id },
      include: {
        _count: { select: { children: true } },
      },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "WBS 항목을 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    const denied = await assertProjectAccess(existing.projectId, user!);
    if (denied) return denied;

    const parentId = existing.parentId;

    // 삭제 (CASCADE로 자식도 함께 삭제됨)
    await prisma.wbsItem.delete({
      where: { id },
    });

    // 부모 진행률 재계산
    if (parentId) {
      await updateParentProgress(parentId);
    }

    return NextResponse.json({
      message: "WBS 항목이 삭제되었습니다.",
      deletedId: id,
      childrenDeleted: existing._count.children,
    });
  } catch (error) {
    console.error("WBS 항목 삭제 실패:", error);
    return NextResponse.json(
      { error: "WBS 항목을 삭제할 수 없습니다." },
      { status: 500 }
    );
  }
}
