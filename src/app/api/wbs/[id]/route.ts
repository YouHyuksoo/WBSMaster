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
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { WbsLevel, TaskStatus } from "@prisma/client";
import { requireAuth } from "@/lib/auth";

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
      weight,
      assigneeIds,
      order,
      deliverableName,
      deliverableLink,
    } = body;

    // 기존 항목 확인
    const existing = await prisma.wbsItem.findUnique({
      where: { id },
      include: { assignees: true },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "WBS 항목을 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    // 상태 검증
    if (status && !Object.values(TaskStatus).includes(status)) {
      return NextResponse.json(
        { error: "유효하지 않은 상태입니다." },
        { status: 400 }
      );
    }

    // 진행률 검증
    if (progress !== undefined && (progress < 0 || progress > 100)) {
      return NextResponse.json(
        { error: "진행률은 0~100 사이여야 합니다." },
        { status: 400 }
      );
    }

    // 담당자 업데이트 준비
    const assigneeUpdate = assigneeIds !== undefined
      ? {
          deleteMany: {},
          create: Array.isArray(assigneeIds)
            ? assigneeIds.map((userId: string) => ({ userId }))
            : [],
        }
      : undefined;

    // WBS 항목 업데이트
    const wbsItem = await prisma.wbsItem.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(description !== undefined && { description }),
        ...(status !== undefined && { status }),
        ...(progress !== undefined && { progress }),
        ...(startDate !== undefined && { startDate: startDate ? new Date(startDate) : null }),
        ...(endDate !== undefined && { endDate: endDate ? new Date(endDate) : null }),
        ...(weight !== undefined && { weight }),
        ...(order !== undefined && { order }),
        ...(deliverableName !== undefined && { deliverableName: deliverableName || null }),
        ...(deliverableLink !== undefined && { deliverableLink: deliverableLink || null }),
        ...(assigneeUpdate && { assignees: assigneeUpdate }),
      },
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
        _count: {
          select: { children: true },
        },
      },
    });

    // 부모 진행률 재계산 (자식의 가중 평균)
    if (existing.parentId) {
      await updateParentProgress(existing.parentId);
    }

    // 응답 형식 변환
    const transformedItem = {
      ...wbsItem,
      assignees: wbsItem.assignees.map((a) => a.user),
      hasChildren: wbsItem._count.children > 0,
      levelNumber: levelToNumber[wbsItem.level],
    };

    return NextResponse.json(transformedItem);
  } catch (error) {
    console.error("WBS 항목 수정 실패:", error);
    return NextResponse.json(
      { error: "WBS 항목을 수정할 수 없습니다." },
      { status: 500 }
    );
  }
}

/**
 * 부모 항목의 진행률을 자식들의 가중 평균으로 재계산
 */
async function updateParentProgress(parentId: string): Promise<void> {
  const children = await prisma.wbsItem.findMany({
    where: { parentId },
    select: { progress: true, weight: true },
  });

  if (children.length === 0) return;

  // 가중 평균 계산
  const totalWeight = children.reduce((sum, c) => sum + c.weight, 0);
  const weightedSum = children.reduce((sum, c) => sum + c.progress * c.weight, 0);
  const avgProgress = totalWeight > 0 ? Math.round(weightedSum / totalWeight) : 0;

  // 상태 결정
  let status: TaskStatus = "PENDING";
  if (avgProgress === 100) {
    status = "COMPLETED";
  } else if (avgProgress > 0) {
    status = "IN_PROGRESS";
  }

  // 부모 업데이트
  await prisma.wbsItem.update({
    where: { id: parentId },
    data: { progress: avgProgress, status },
  });

  // 재귀적으로 상위 부모도 업데이트
  const parent = await prisma.wbsItem.findUnique({
    where: { id: parentId },
    select: { parentId: true },
  });

  if (parent?.parentId) {
    await updateParentProgress(parent.parentId);
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
