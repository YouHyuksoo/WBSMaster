/**
 * @file src/app/api/wbs/[id]/level/route.ts
 * @description
 * WBS 항목 레벨 변경 API입니다.
 * 레벨 업(상위로 이동), 레벨 다운(하위로 이동) 기능을 제공합니다.
 *
 * 초보자 가이드:
 * 1. **레벨 업**: 현재 항목을 상위 레벨로 올림 (LEVEL4 → LEVEL3)
 *    - 부모의 형제가 됨 (조부모 아래로 이동)
 * 2. **레벨 다운**: 현재 항목을 하위 레벨로 내림 (LEVEL3 → LEVEL4)
 *    - 이전 형제의 자식이 됨
 *
 * @example
 * // 레벨 업 (LEVEL4 → LEVEL3)
 * PATCH /api/wbs/[id]/level
 * { "direction": "up" }
 *
 * // 레벨 다운 (LEVEL3 → LEVEL4)
 * PATCH /api/wbs/[id]/level
 * { "direction": "down" }
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { WbsLevel, TaskStatus } from "@prisma/client";
import { requireAuth } from "@/lib/auth";

/** 레벨 순서 (숫자가 클수록 하위) */
const levelOrder: WbsLevel[] = ["LEVEL1", "LEVEL2", "LEVEL3", "LEVEL4"];

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
 * WBS 항목 레벨 변경
 * PATCH /api/wbs/[id]/level
 * body: { direction: "up" | "down" }
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    // 인증 확인
    const { user, error } = await requireAuth();
    if (error) return error;

    const { id } = await params;
    const body = await request.json();
    const { direction } = body;

    // 방향 검증
    if (!direction || !["up", "down"].includes(direction)) {
      return NextResponse.json(
        { error: "direction은 'up' 또는 'down'이어야 합니다." },
        { status: 400 }
      );
    }

    // 현재 항목 조회
    const item = await prisma.wbsItem.findUnique({
      where: { id },
      include: {
        parent: {
          select: {
            id: true,
            parentId: true,
            level: true,
            code: true,
          },
        },
        children: {
          select: { id: true },
        },
      },
    });

    if (!item) {
      return NextResponse.json(
        { error: "WBS 항목을 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    const currentLevelIndex = levelOrder.indexOf(item.level);

    // ========================================
    // 레벨 업 (상위로 이동)
    // ========================================
    if (direction === "up") {
      // LEVEL1은 더 올라갈 수 없음
      if (currentLevelIndex === 0) {
        return NextResponse.json(
          { error: "최상위 레벨(대분류)은 더 올릴 수 없습니다." },
          { status: 400 }
        );
      }

      // 부모가 없으면 올릴 수 없음
      if (!item.parent) {
        return NextResponse.json(
          { error: "부모 항목이 없어 레벨을 올릴 수 없습니다." },
          { status: 400 }
        );
      }

      const newLevel = levelOrder[currentLevelIndex - 1];
      const newParentId = item.parent.parentId; // 조부모가 새 부모

      // 새 코드 생성
      const newCode = await generateNewCode(item.projectId, newParentId, newLevel);

      // 새 순서 계산 (형제들 중 마지막)
      const newOrder = await getNextOrder(item.projectId, newParentId);

      // 트랜잭션으로 업데이트
      const updatedItem = await prisma.$transaction(async (tx) => {
        // 1. 현재 항목 업데이트
        const updated = await tx.wbsItem.update({
          where: { id },
          data: {
            level: newLevel,
            parentId: newParentId,
            code: newCode,
            order: newOrder,
          },
        });

        // 2. 자식들의 코드 재생성
        await updateChildrenCodes(tx, id, newCode);

        // 3. 이전 부모의 진행률 재계산
        if (item.parentId) {
          await updateParentProgress(tx, item.parentId);
        }

        // 4. 새 부모의 진행률 재계산
        if (newParentId) {
          await updateParentProgress(tx, newParentId);
        }

        return updated;
      });

      return NextResponse.json({
        message: `레벨이 ${levelToNumber[item.level]}에서 ${levelToNumber[newLevel]}(으)로 변경되었습니다.`,
        item: {
          ...updatedItem,
          levelNumber: levelToNumber[updatedItem.level],
        },
      });
    }

    // ========================================
    // 레벨 다운 (하위로 이동)
    // ========================================
    if (direction === "down") {
      // LEVEL4는 더 내려갈 수 없음
      if (currentLevelIndex === levelOrder.length - 1) {
        return NextResponse.json(
          { error: "최하위 레벨(단위업무)은 더 내릴 수 없습니다." },
          { status: 400 }
        );
      }

      // 이전 형제 찾기 (같은 부모, 같은 레벨, order가 더 작은 것 중 가장 큰 것)
      const previousSibling = await prisma.wbsItem.findFirst({
        where: {
          projectId: item.projectId,
          parentId: item.parentId,
          level: item.level,
          order: { lt: item.order },
        },
        orderBy: { order: "desc" },
      });

      if (!previousSibling) {
        return NextResponse.json(
          { error: "이전 형제 항목이 없어 레벨을 내릴 수 없습니다. 다른 항목 아래로 이동하려면 해당 항목이 먼저 있어야 합니다." },
          { status: 400 }
        );
      }

      const newLevel = levelOrder[currentLevelIndex + 1];
      const newParentId = previousSibling.id; // 이전 형제가 새 부모

      // 새 코드 생성
      const newCode = await generateNewCode(item.projectId, newParentId, newLevel);

      // 새 순서 계산
      const newOrder = await getNextOrder(item.projectId, newParentId);

      // 트랜잭션으로 업데이트
      const updatedItem = await prisma.$transaction(async (tx) => {
        // 1. 현재 항목 업데이트
        const updated = await tx.wbsItem.update({
          where: { id },
          data: {
            level: newLevel,
            parentId: newParentId,
            code: newCode,
            order: newOrder,
          },
        });

        // 2. 자식들의 레벨과 코드 업데이트
        await updateChildrenLevels(tx, id, newCode, currentLevelIndex + 1);

        // 3. 이전 부모의 진행률 재계산
        if (item.parentId) {
          await updateParentProgress(tx, item.parentId);
        }

        // 4. 새 부모의 진행률 재계산
        await updateParentProgress(tx, newParentId);

        return updated;
      });

      return NextResponse.json({
        message: `레벨이 ${levelToNumber[item.level]}에서 ${levelToNumber[newLevel]}(으)로 변경되었습니다.`,
        item: {
          ...updatedItem,
          levelNumber: levelToNumber[updatedItem.level],
        },
      });
    }

    return NextResponse.json(
      { error: "알 수 없는 오류가 발생했습니다." },
      { status: 500 }
    );
  } catch (error) {
    console.error("WBS 레벨 변경 실패:", error);
    return NextResponse.json(
      { error: "WBS 레벨을 변경할 수 없습니다." },
      { status: 500 }
    );
  }
}

/**
 * 새 코드 생성
 */
async function generateNewCode(
  projectId: string,
  parentId: string | null,
  level: WbsLevel
): Promise<string> {
  if (!parentId) {
    // LEVEL1인 경우 - 단순히 순서 번호
    const count = await prisma.wbsItem.count({
      where: { projectId, parentId: null },
    });
    return String(count + 1);
  }

  // 부모 코드 가져오기
  const parent = await prisma.wbsItem.findUnique({
    where: { id: parentId },
    select: { code: true },
  });

  if (!parent) {
    return "1";
  }

  // 형제 수 계산
  const siblingCount = await prisma.wbsItem.count({
    where: { projectId, parentId },
  });

  return `${parent.code}.${siblingCount + 1}`;
}

/**
 * 다음 순서 번호 가져오기
 */
async function getNextOrder(
  projectId: string,
  parentId: string | null
): Promise<number> {
  const maxOrder = await prisma.wbsItem.aggregate({
    where: { projectId, parentId },
    _max: { order: true },
  });
  return (maxOrder._max.order ?? -1) + 1;
}

/**
 * 자식들의 코드 업데이트 (재귀)
 */
async function updateChildrenCodes(
  tx: any,
  parentId: string,
  parentCode: string
): Promise<void> {
  const children = await tx.wbsItem.findMany({
    where: { parentId },
    orderBy: { order: "asc" },
  });

  for (let i = 0; i < children.length; i++) {
    const child = children[i];
    const newCode = `${parentCode}.${i + 1}`;

    await tx.wbsItem.update({
      where: { id: child.id },
      data: { code: newCode },
    });

    // 재귀적으로 손자들도 업데이트
    await updateChildrenCodes(tx, child.id, newCode);
  }
}

/**
 * 자식들의 레벨과 코드 업데이트 (레벨 다운 시)
 */
async function updateChildrenLevels(
  tx: any,
  parentId: string,
  parentCode: string,
  parentLevelIndex: number
): Promise<void> {
  const children = await tx.wbsItem.findMany({
    where: { parentId },
    orderBy: { order: "asc" },
  });

  for (let i = 0; i < children.length; i++) {
    const child = children[i];
    const newCode = `${parentCode}.${i + 1}`;
    const newLevelIndex = Math.min(parentLevelIndex + 1, levelOrder.length - 1);
    const newLevel = levelOrder[newLevelIndex];

    await tx.wbsItem.update({
      where: { id: child.id },
      data: {
        code: newCode,
        level: newLevel,
      },
    });

    // 재귀적으로 손자들도 업데이트
    await updateChildrenLevels(tx, child.id, newCode, newLevelIndex);
  }
}

/**
 * 부모 항목의 진행률 재계산
 */
async function updateParentProgress(tx: any, parentId: string): Promise<void> {
  const children = await tx.wbsItem.findMany({
    where: { parentId },
    select: { progress: true, weight: true },
  });

  if (children.length === 0) return;

  const totalWeight = children.reduce((sum: number, c: any) => sum + c.weight, 0);
  const weightedSum = children.reduce(
    (sum: number, c: any) => sum + c.progress * c.weight,
    0
  );
  const avgProgress = totalWeight > 0 ? Math.round(weightedSum / totalWeight) : 0;

  let status: TaskStatus = "PENDING";
  if (avgProgress === 100) {
    status = "COMPLETED";
  } else if (avgProgress > 0) {
    status = "IN_PROGRESS";
  }

  await tx.wbsItem.update({
    where: { id: parentId },
    data: { progress: avgProgress, status },
  });

  // 상위 부모도 재귀적으로 업데이트
  const parent = await tx.wbsItem.findUnique({
    where: { id: parentId },
    select: { parentId: true },
  });

  if (parent?.parentId) {
    await updateParentProgress(tx, parent.parentId);
  }
}
