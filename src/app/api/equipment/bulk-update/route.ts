/**
 * @file src/app/api/equipment/bulk-update/route.ts
 * @description
 * 설비 일괄 업데이트 API
 * 여러 설비의 위치를 한 번에 업데이트합니다.
 *
 * 초보자 가이드:
 * 1. **POST /api/equipment/bulk-update**: 여러 설비 위치 일괄 업데이트
 *    - 캔버스에서 정렬/분배 후 저장 버튼 클릭 시 사용
 *    - 개별 API 호출 대신 한 번에 처리하여 성능 최적화
 *
 * 수정 방법:
 * - 업데이트 가능 필드 추가: updates 타입에 필드 추가
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/** 업데이트 항목 타입 */
interface EquipmentPositionUpdate {
  id: string;
  positionX: number;
  positionY: number;
}

/**
 * 설비 위치 일괄 업데이트
 * POST /api/equipment/bulk-update
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { updates } = body as { updates: EquipmentPositionUpdate[] };

    // 필수 필드 검증
    if (!updates || !Array.isArray(updates) || updates.length === 0) {
      return NextResponse.json(
        { error: "업데이트할 설비 목록이 필요합니다." },
        { status: 400 }
      );
    }

    // 각 항목 유효성 검증
    for (const update of updates) {
      if (!update.id || typeof update.positionX !== "number" || typeof update.positionY !== "number") {
        return NextResponse.json(
          { error: "각 항목에는 id, positionX, positionY가 필요합니다." },
          { status: 400 }
        );
      }
    }

    // 트랜잭션으로 일괄 업데이트 (Interactive transaction - 타임아웃 60초)
    const result = await prisma.$transaction(
      async (tx) => {
        const results = [];
        for (const update of updates) {
          const updated = await tx.equipment.update({
            where: { id: update.id },
            data: {
              positionX: update.positionX,
              positionY: update.positionY,
            },
          });
          results.push(updated);
        }
        return results;
      },
      {
        timeout: 60000, // 60초 타임아웃
      }
    );

    return NextResponse.json({
      success: true,
      updatedCount: result.length,
      message: `${result.length}개 설비의 위치가 업데이트되었습니다.`,
    });
  } catch (error) {
    console.error("설비 일괄 업데이트 실패:", error);
    return NextResponse.json(
      { error: "설비 위치를 일괄 업데이트할 수 없습니다." },
      { status: 500 }
    );
  }
}
