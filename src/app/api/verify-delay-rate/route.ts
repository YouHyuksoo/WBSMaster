/**
 * @file src/app/api/verify-delay-rate/route.ts
 * @description
 * WBS 지연율 검증 API 엔드포인트입니다.
 * 실제 데이터를 조회하여 지연율을 계산하고 상세 정보를 반환합니다.
 *
 * 사용 방법:
 * GET http://localhost:3000/api/verify-delay-rate
 */

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * 지연 여부 판단
 * - 달성율 < 100%: 계획종료일이 오늘보다 이전이면 지연
 * - 달성율 = 100%: 실제종료일이 계획종료일보다 늦으면 지연
 */
function isDelayed(endDate: Date | null, status: string, progress: number = 0, actualEndDate?: Date | null): boolean {
  if (!endDate) return false;
  if (status === "CANCELLED") return false;

  const end = new Date(endDate);
  end.setHours(0, 0, 0, 0);

  if (progress >= 100) {
    if (!actualEndDate) return false;
    const actual = new Date(actualEndDate);
    actual.setHours(0, 0, 0, 0);
    return actual > end;
  } else {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return end < today;
  }
}

/**
 * 지연 일수 계산
 * - 달성율 < 100%: 오늘 - 계획종료일
 * - 달성율 = 100%: 실제종료일 - 계획종료일
 */
function getDelayDays(endDate: Date | null, progress: number = 0, actualEndDate?: Date | null): number {
  if (!endDate) return 0;

  const end = new Date(endDate);
  end.setHours(0, 0, 0, 0);

  if (progress >= 100) {
    if (!actualEndDate) return 0;
    const actual = new Date(actualEndDate);
    actual.setHours(0, 0, 0, 0);
    if (actual <= end) return 0;
    return Math.ceil((actual.getTime() - end.getTime()) / (1000 * 60 * 60 * 24));
  } else {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (end >= today) return 0;
    return Math.ceil((today.getTime() - end.getTime()) / (1000 * 60 * 60 * 24));
  }
}

export async function GET() {
  try {
    // 모든 프로젝트 조회
    const projects = await prisma.project.findMany({
      select: {
        id: true,
        name: true,
      },
    });

    const results = [];

    for (const project of projects) {
      // 해당 프로젝트의 모든 WBS 항목 조회 (자식 항목 포함 여부 확인 위해)
      const allItems = await prisma.wbsItem.findMany({
        where: {
          projectId: project.id,
        },
        select: {
          id: true,
          code: true,
          name: true,
          level: true,
          status: true,
          startDate: true,
          endDate: true,
          actualEndDate: true,
          progress: true,
          parentId: true,
        },
        orderBy: {
          code: "asc",
        },
      });

      if (allItems.length === 0) continue;

      // 말단 항목만 필터링 (자식이 없는 항목)
      const parentIds = new Set(allItems.map(item => item.parentId).filter(Boolean));
      const wbsItems = allItems.filter(item => !parentIds.has(item.id));

      // 통계 계산
      const total = wbsItems.length;
      const completed = wbsItems.filter(i => i.status === "COMPLETED").length;
      const cancelled = wbsItems.filter(i => i.status === "CANCELLED").length;
      const activeItems = wbsItems.filter(i =>
        i.status !== "COMPLETED" && i.status !== "CANCELLED"
      );
      const delayed = wbsItems.filter(i =>
        isDelayed(i.endDate, i.status, i.progress, i.actualEndDate)
      );

      const delayedRate = activeItems.length > 0
        ? Math.round((delayed.length / activeItems.length) * 100)
        : 0;

      // 지연 항목 상세
      const delayedDetails = delayed.map(item => {
        const delayDays = getDelayDays(item.endDate, item.progress, item.actualEndDate);
        return {
          code: item.code,
          name: item.name,
          status: item.status,
          endDate: item.endDate?.toISOString().split('T')[0] || null,
          delayDays,
          progress: item.progress,
        };
      });

      // 활성 항목 (지연 아닌 항목)
      const activeNotDelayed = activeItems.filter(i => !isDelayed(i.endDate, i.status));
      const activeNotDelayedDetails = activeNotDelayed.map(item => ({
        code: item.code,
        name: item.name,
        status: item.status,
        endDate: item.endDate?.toISOString().split('T')[0] || null,
        progress: item.progress,
      }));

      results.push({
        project: {
          id: project.id,
          name: project.name,
        },
        stats: {
          total,
          completed,
          cancelled,
          activeCount: activeItems.length,
          delayedCount: delayed.length,
          delayedRate,
          calculation: {
            formula: "(지연 항목 / 활성 항목) × 100",
            raw: activeItems.length > 0
              ? ((delayed.length / activeItems.length) * 100).toFixed(2)
              : "0.00",
            rounded: delayedRate,
          },
        },
        delayedItems: delayedDetails,
        activeNotDelayedItems: activeNotDelayedDetails,
      });
    }

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      results,
    });

  } catch (error: any) {
    console.error("지연율 검증 오류:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message,
      },
      { status: 500 }
    );
  }
}
