/**
 * @file src/app/api/wbs/schedule-stats/route.ts
 * @description
 * WBS 프로젝트 일정 통계 API입니다.
 * 총일수, 휴무일, 작업일, 진행일, 남은일 등 일정 관련 통계를 계산합니다.
 *
 * 초보자 가이드:
 * 1. **GET /api/wbs/schedule-stats**: 프로젝트 일정 통계 조회
 *    - ?projectId=xxx: 특정 프로젝트 (필수)
 *
 * 계산 방식 (엑셀 WBS 산식 기준):
 * - **계획 진척률**: 각 대분류(LEVEL1)별 (기간경과비율 × 가중치)의 합계
 * - **실적 진척률**: 각 대분류(LEVEL1)의 (가중치 × 평균진행률)의 합계
 * - **지연율**: 계획 - 실적 (양수면 지연, 음수면 선행)
 * - **달성률**: (실적 / 계획) × 100
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";

/**
 * 두 날짜 사이의 주말 수 계산 (토,일)
 */
function countWeekends(start: Date, end: Date): number {
  let count = 0;
  const current = new Date(start);
  current.setHours(0, 0, 0, 0);
  const endDate = new Date(end);
  endDate.setHours(0, 0, 0, 0);

  while (current <= endDate) {
    const day = current.getDay();
    if (day === 0 || day === 6) {
      count++;
    }
    current.setDate(current.getDate() + 1);
  }
  return count;
}

/**
 * 두 날짜 사이의 일수 계산 (양 끝 포함)
 */
function daysBetween(start: Date, end: Date): number {
  const startDate = new Date(start);
  startDate.setHours(0, 0, 0, 0);
  const endDate = new Date(end);
  endDate.setHours(0, 0, 0, 0);

  const diffTime = endDate.getTime() - startDate.getTime();
  return Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1;
}

/**
 * 작업일 계산 (주말 + 휴일 제외)
 */
function countWorkingDays(start: Date, end: Date, holidays: Date[]): number {
  let count = 0;
  const current = new Date(start);
  current.setHours(0, 0, 0, 0);
  const endDate = new Date(end);
  endDate.setHours(0, 0, 0, 0);

  const holidaySet = new Set(
    holidays.map((h) => {
      const d = new Date(h);
      d.setHours(0, 0, 0, 0);
      return d.getTime();
    })
  );

  while (current <= endDate) {
    const day = current.getDay();
    const isWeekend = day === 0 || day === 6;
    const isHoliday = holidaySet.has(current.getTime());

    if (!isWeekend && !isHoliday) {
      count++;
    }
    current.setDate(current.getDate() + 1);
  }
  return count;
}

/**
 * WBS 프로젝트 일정 통계 조회
 * GET /api/wbs/schedule-stats
 */
export async function GET(request: NextRequest) {
  try {
    // 인증 확인
    const { user, error } = await requireAuth();
    if (error) return error;

    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get("projectId");

    if (!projectId) {
      return NextResponse.json(
        { error: "프로젝트 ID가 필요합니다." },
        { status: 400 }
      );
    }

    // 프로젝트 조회
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: {
        id: true,
        name: true,
        startDate: true,
        endDate: true,
        progress: true,
      },
    });

    if (!project) {
      return NextResponse.json(
        { error: "프로젝트를 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    // 프로젝트 기간이 없으면 빈 통계 반환
    if (!project.startDate || !project.endDate) {
      return NextResponse.json({
        project: {
          id: project.id,
          name: project.name,
        },
        schedule: null,
        wbs: null,
        message: "프로젝트 시작일/종료일이 설정되지 않았습니다.",
      });
    }

    const startDate = new Date(project.startDate);
    const endDate = new Date(project.endDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // 휴일 조회 (프로젝트 기간 내)
    const holidays = await prisma.holiday.findMany({
      where: {
        projectId,
        date: {
          gte: startDate,
          lte: endDate,
        },
        type: {
          in: ["COMPANY_HOLIDAY", "TEAM_OFFSITE"],
        },
      },
      select: {
        date: true,
      },
    });

    const holidayDates = holidays.map((h) => h.date);

    // 일정 통계 계산
    const totalDays = daysBetween(startDate, endDate);
    const weekendDays = countWeekends(startDate, endDate);
    const holidayCount = holidayDates.length;
    const workingDays = countWorkingDays(startDate, endDate, holidayDates);

    // 진행일/남은일 계산
    let elapsedDays = 0;
    let remainingDays = 0;
    let elapsedWorkingDays = 0;
    let remainingWorkingDays = 0;

    if (today < startDate) {
      // 프로젝트 시작 전
      remainingDays = totalDays;
      remainingWorkingDays = workingDays;
    } else if (today > endDate) {
      // 프로젝트 종료 후
      elapsedDays = totalDays;
      elapsedWorkingDays = workingDays;
    } else {
      // 프로젝트 진행 중
      elapsedDays = daysBetween(startDate, today);
      remainingDays = totalDays - elapsedDays; // 오늘 중복 방지
      elapsedWorkingDays = countWorkingDays(startDate, today, holidayDates);
      remainingWorkingDays = workingDays - elapsedWorkingDays; // 오늘 중복 방지
    }

    // 일정 진행률 (기대 진행률)
    const expectedProgress = workingDays > 0
      ? Math.round((elapsedWorkingDays / workingDays) * 100)
      : 0;

    // ============================================
    // 엑셀 WBS 산식 기반 계획/실적 계산
    // ============================================

    // LEVEL1(대분류) 항목들 조회 (하위 항목 포함)
    const level1Items = await prisma.wbsItem.findMany({
      where: {
        projectId,
        level: "LEVEL1",
      },
      include: {
        children: {
          include: {
            children: {
              include: {
                children: true, // LEVEL4까지
              },
            },
          },
        },
      },
    });

    // 말단 노드만 수집하여 전체 통계 계산
    const leafItems: { status: string; progress: number; endDate: Date | null }[] = [];
    const collectLeafItems = (items: typeof level1Items) => {
      items.forEach((item) => {
        if (!item.children || item.children.length === 0) {
          leafItems.push({
            status: item.status,
            progress: item.progress,
            endDate: item.endDate,
          });
        } else {
          collectLeafItems(item.children as typeof level1Items);
        }
      });
    };
    collectLeafItems(level1Items);

    const totalWbs = leafItems.length;
    let completedWbs = 0;
    let inProgressWbs = 0;
    let delayedWbs = 0;

    leafItems.forEach((item) => {
      if (item.status === "COMPLETED") {
        completedWbs++;
      } else if (item.status === "IN_PROGRESS") {
        inProgressWbs++;
      }

      // 지연 체크
      if (item.endDate && item.status !== "COMPLETED" && item.status !== "CANCELLED") {
        const itemEndDate = new Date(item.endDate);
        itemEndDate.setHours(0, 0, 0, 0);
        if (itemEndDate < today) {
          delayedWbs++;
        }
      }
    });

    // ============================================
    // 계획 진척률 계산 (엑셀 산식)
    // 각 대분류별 (기간경과비율 × 가중치)의 합계
    // ============================================
    let plannedProgress = 0;
    let totalWeight = 0;

    // ============================================
    // 실적 진척률 계산 (엑셀 산식)
    // 각 대분류의 (가중치 × 평균진행률)의 합계
    // ============================================
    let actualProgress = 0;

    level1Items.forEach((level1) => {
      const weight = level1.weight || 0; // 가중치 (%)
      totalWeight += weight;

      // 대분류의 시작일/종료일
      const l1StartDate = level1.startDate ? new Date(level1.startDate) : null;
      const l1EndDate = level1.endDate ? new Date(level1.endDate) : null;

      // 해당 대분류의 하위 말단 항목들 수집
      const level1LeafItems: { progress: number }[] = [];
      const collectLevel1Leaves = (items: typeof level1Items) => {
        items.forEach((item) => {
          if (!item.children || item.children.length === 0) {
            level1LeafItems.push({ progress: item.progress });
          } else {
            collectLevel1Leaves(item.children as typeof level1Items);
          }
        });
      };
      collectLevel1Leaves([level1]);

      // 대분류 평균 진행률
      const avgProgressLevel1 = level1LeafItems.length > 0
        ? level1LeafItems.reduce((sum, i) => sum + i.progress, 0) / level1LeafItems.length
        : 0;

      // 실적 진척률: 가중치 × 평균진행률 / 100
      actualProgress += (weight * avgProgressLevel1) / 100;

      // 계획 진척률: 기간경과비율 × 가중치
      if (l1StartDate && l1EndDate) {
        l1StartDate.setHours(0, 0, 0, 0);
        l1EndDate.setHours(0, 0, 0, 0);

        let periodProgress = 0;
        if (today < l1StartDate) {
          // 아직 시작 전
          periodProgress = 0;
        } else if (today >= l1EndDate) {
          // 종료일 이후
          periodProgress = 100;
        } else {
          // 진행 중: 기간 경과 비율
          const totalPeriod = l1EndDate.getTime() - l1StartDate.getTime();
          const elapsedPeriod = today.getTime() - l1StartDate.getTime();
          periodProgress = totalPeriod > 0 ? (elapsedPeriod / totalPeriod) * 100 : 0;
        }

        // 계획 진척률: 기간경과비율 × 가중치 / 100
        plannedProgress += (periodProgress * weight) / 100;
      }
    });

    // 소수점 첫째자리까지 반올림
    plannedProgress = Math.round(plannedProgress * 10) / 10;
    actualProgress = Math.round(actualProgress * 10) / 10;

    // 지연율: 계획 - 실적 (양수면 지연, 음수면 선행)
    const delayRate = Math.round((plannedProgress - actualProgress) * 10) / 10;

    // 달성률: (실적 / 계획) × 100
    const achievementRate = plannedProgress > 0
      ? Math.round((actualProgress / plannedProgress) * 100)
      : actualProgress > 0 ? 100 : 0;

    return NextResponse.json({
      project: {
        id: project.id,
        name: project.name,
        startDate: project.startDate,
        endDate: project.endDate,
      },
      schedule: {
        totalDays,           // 총 일수
        weekendDays,         // 주말 일수
        holidayCount,        // 휴일 수
        workingDays,         // 작업일 수
        elapsedDays,         // 경과 일수 (총)
        remainingDays,       // 남은 일수 (총)
        elapsedWorkingDays,  // 경과 작업일
        remainingWorkingDays, // 남은 작업일
        expectedProgress,    // 기대 진행률 (일정 기준)
      },
      wbs: {
        total: totalWbs,
        completed: completedWbs,
        inProgress: inProgressWbs,
        delayed: delayedWbs,
        plannedProgress,     // 계획 진척률 (엑셀 산식: 대분류별 기간경과비율×가중치 합계)
        actualProgress,      // 실적 진척률 (엑셀 산식: 대분류별 가중치×평균진행률 합계)
        delayRate,           // 지연율 (계획 - 실적, 양수면 지연)
        achievementRate,     // 달성률 (실적 / 계획 × 100)
        totalWeight,         // 가중치 합계 (100이어야 정상)
      },
    });
  } catch (error) {
    console.error("WBS 일정 통계 조회 실패:", error);
    return NextResponse.json(
      { error: "WBS 일정 통계를 조회할 수 없습니다." },
      { status: 500 }
    );
  }
}
