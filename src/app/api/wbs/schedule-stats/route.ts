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
 * 계산 방식:
 * - 총일수: 프로젝트 시작일 ~ 종료일
 * - 휴무일: 해당 기간 내 휴일 + 주말 수
 * - 작업일: 총일수 - 휴무일
 * - 진행일: 시작일 ~ 오늘 (작업일 기준)
 * - 남은일: 오늘 ~ 종료일 (작업일 기준)
 * - 진행율: 완료 WBS / 전체 WBS
 * - 지연율: 지연 WBS / 전체 WBS
 * - 달성율: (진행일 대비 기대 진행률) vs (실제 진행률)
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
      remainingDays = daysBetween(today, endDate);
      elapsedWorkingDays = countWorkingDays(startDate, today, holidayDates);
      remainingWorkingDays = countWorkingDays(today, endDate, holidayDates);
    }

    // 일정 진행률 (기대 진행률)
    const expectedProgress = workingDays > 0
      ? Math.round((elapsedWorkingDays / workingDays) * 100)
      : 0;

    // WBS 통계 조회
    const wbsItems = await prisma.wbsItem.findMany({
      where: {
        projectId,
        // 말단 노드만 (실제 작업 단위)
        children: { none: {} },
      },
      select: {
        id: true,
        status: true,
        progress: true,
        startDate: true,
        endDate: true,
      },
    });

    const totalWbs = wbsItems.length;
    let completedWbs = 0;
    let inProgressWbs = 0;
    let delayedWbs = 0;
    let totalProgress = 0;

    // 각 항목별 예상 진행률 계산 (WBS 페이지와 동일한 방식)
    const expectedProgressList: number[] = [];

    wbsItems.forEach((item) => {
      totalProgress += item.progress;

      if (item.status === "COMPLETED") {
        completedWbs++;
      } else if (item.status === "IN_PROGRESS") {
        inProgressWbs++;
      }

      // 지연 체크: 종료일이 오늘보다 이전이고 완료되지 않은 경우
      if (item.endDate && item.status !== "COMPLETED") {
        const itemEndDate = new Date(item.endDate);
        itemEndDate.setHours(0, 0, 0, 0);
        if (itemEndDate < today) {
          delayedWbs++;
        }
      }

      // 각 항목별 예상 진행률 계산 (WBS 페이지 로직과 동일)
      if (!item.startDate || !item.endDate) {
        // 날짜 없으면 실제값 사용
        expectedProgressList.push(item.progress);
      } else {
        const itemStart = new Date(item.startDate);
        itemStart.setHours(0, 0, 0, 0);
        const itemEnd = new Date(item.endDate);
        itemEnd.setHours(0, 0, 0, 0);

        if (today < itemStart) {
          // 아직 시작 전
          expectedProgressList.push(0);
        } else if (today >= itemEnd) {
          // 종료 기한 지남 또는 당일
          expectedProgressList.push(100);
        } else {
          // 기간 대비 경과 비율
          const totalDaysItem = itemEnd.getTime() - itemStart.getTime();
          const elapsedDaysItem = today.getTime() - itemStart.getTime();
          const expectedProg = totalDaysItem > 0 ? Math.round((elapsedDaysItem / totalDaysItem) * 100) : 0;
          expectedProgressList.push(expectedProg);
        }
      }
    });

    // WBS 기반 진행률 계산
    const wbsProgressRate = totalWbs > 0 ? Math.round(totalProgress / totalWbs) : 0;
    const wbsCompletionRate = totalWbs > 0 ? Math.round((completedWbs / totalWbs) * 100) : 0;
    const wbsDelayRate = totalWbs > 0 ? Math.round((delayedWbs / totalWbs) * 100) : 0;

    // 각 항목별 예상 진행률 평균 계산
    const avgExpectedProgress = expectedProgressList.length > 0
      ? expectedProgressList.reduce((sum, p) => sum + p, 0) / expectedProgressList.length
      : 0;

    // 달성율: 실제 평균 진행률 / 예상 평균 진행률 × 100 (WBS 페이지와 동일한 방식)
    const achievementRate = avgExpectedProgress > 0
      ? Math.round((wbsProgressRate / avgExpectedProgress) * 100)
      : wbsProgressRate > 0 ? 100 : 0;

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
        progressRate: wbsProgressRate,     // 실제 진행률
        completionRate: wbsCompletionRate, // 완료율
        delayRate: wbsDelayRate,           // 지연율
        expectedProgressRate: Math.round(avgExpectedProgress), // 예상 진행률 (항목별 평균)
        achievementRate,                    // 달성율 (기대 대비 실제)
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
