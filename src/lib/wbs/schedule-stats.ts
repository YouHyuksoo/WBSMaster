/**
 * @file src/lib/wbs/schedule-stats.ts
 * @description
 * WBS 일정 통계(작업일, 계획·실적 진척률, 지연율, 달성률) 계산입니다. 화면(GET /api/wbs/schedule-stats)과
 * AI 채팅 도구(wbs_schedule_stats)가 같은 함수를 써서 같은 숫자를 냅니다.
 *
 * 초보자 가이드:
 * - computeScheduleStats(input): DB 없이 계산만 하는 순수 함수 (테스트 대상)
 * - loadWbsScheduleStats(db, projectId): 프로젝트·휴일·WBS 를 읽어 computeScheduleStats 를 부른다
 *   (db 는 prisma 를 넘긴다. 이 파일이 prisma 를 직접 import 하지 않아 테스트에서 DB 연결이 생기지 않는다)
 * - 산식 (말단 업무 기준 통일):
 *   계획 진척률 = Σ(LEVEL1 가중치 × 말단 평균 기간경과비율) / 100
 *   실적 진척률 = Σ(LEVEL1 가중치 × 말단 평균 진행률) / 100
 *   지연율 = 계획 - 실적 (양수면 지연), 달성률 = 실적 / 계획 × 100
 */

import type { prisma as PrismaInstance } from "@/lib/prisma";

type Db = Pick<typeof PrismaInstance, "project" | "holiday" | "wbsItem">;

export interface WbsNode {
  status: string;
  progress: number;
  weight: number;
  startDate: Date | null;
  endDate: Date | null;
  actualEndDate: Date | null;
  children?: WbsNode[];
}

export interface WbsScheduleStats {
  project: { id: string; name: string; startDate: Date; endDate: Date };
  schedule: {
    totalDays: number; weekendDays: number; holidayCount: number; workingDays: number;
    elapsedDays: number; remainingDays: number; elapsedWorkingDays: number; remainingWorkingDays: number;
    expectedProgress: number;
  };
  wbs: {
    total: number; completed: number; inProgress: number; delayed: number;
    plannedProgress: number; actualProgress: number; delayRate: number; achievementRate: number; totalWeight: number;
  };
}

export type WbsScheduleStatsResult =
  | WbsScheduleStats
  | { project: { id: string; name: string }; schedule: null; wbs: null; message: string };

const midnight = (v: Date) => {
  const x = new Date(v);
  x.setHours(0, 0, 0, 0);
  return x;
};

/** 두 날짜 사이의 일수 (양 끝 포함) */
function daysBetween(start: Date, end: Date): number {
  return Math.floor((midnight(end).getTime() - midnight(start).getTime()) / 86_400_000) + 1;
}

function countWeekends(start: Date, end: Date): number {
  let count = 0;
  for (const cur = midnight(start), last = midnight(end); cur <= last; cur.setDate(cur.getDate() + 1)) {
    if (cur.getDay() === 0 || cur.getDay() === 6) count++;
  }
  return count;
}

/** 작업일 (주말 + 휴일 제외) */
function countWorkingDays(start: Date, end: Date, holidays: Date[]): number {
  const holidaySet = new Set(holidays.map((h) => midnight(h).getTime()));
  let count = 0;
  for (const cur = midnight(start), last = midnight(end); cur <= last; cur.setDate(cur.getDate() + 1)) {
    const weekend = cur.getDay() === 0 || cur.getDay() === 6;
    if (!weekend && !holidaySet.has(cur.getTime())) count++;
  }
  return count;
}

function collectLeaves(items: WbsNode[], out: WbsNode[] = []): WbsNode[] {
  for (const item of items) {
    if (!item.children || item.children.length === 0) out.push(item);
    else collectLeaves(item.children, out);
  }
  return out;
}

/** 말단 업무의 기간경과비율 (0~100) */
function leafPeriodProgress(leaf: WbsNode, today: Date): number {
  if (!leaf.startDate || !leaf.endDate) return 0;
  const s = midnight(leaf.startDate);
  const e = midnight(leaf.endDate);
  if (today < s) return 0;
  if (today >= e) return 100;
  const total = e.getTime() - s.getTime();
  return total > 0 ? ((today.getTime() - s.getTime()) / total) * 100 : 0;
}

/** 지연 판정 (isDelayed() 기준과 같음) */
function isLeafDelayed(leaf: WbsNode, today: Date): boolean {
  if (!leaf.endDate || leaf.status === "CANCELLED") return false;
  const end = midnight(leaf.endDate);
  if (leaf.progress >= 100) return (leaf.actualEndDate ? midnight(leaf.actualEndDate) : today) > end;
  return end < today;
}

export function computeScheduleStats(input: {
  project: { id: string; name: string; startDate: Date; endDate: Date };
  holidays: Date[];
  level1Items: WbsNode[];
  today: Date;
}): WbsScheduleStats {
  const { project, holidays, level1Items } = input;
  const today = midnight(input.today);
  const startDate = new Date(project.startDate);
  const endDate = new Date(project.endDate);

  const totalDays = daysBetween(startDate, endDate);
  const workingDays = countWorkingDays(startDate, endDate, holidays);
  let elapsedDays = 0, remainingDays = 0, elapsedWorkingDays = 0, remainingWorkingDays = 0;
  if (today < startDate) {
    remainingDays = totalDays;
    remainingWorkingDays = workingDays;
  } else if (today > endDate) {
    elapsedDays = totalDays;
    elapsedWorkingDays = workingDays;
  } else {
    elapsedDays = daysBetween(startDate, today);
    remainingDays = totalDays - elapsedDays;
    elapsedWorkingDays = countWorkingDays(startDate, today, holidays);
    remainingWorkingDays = workingDays - elapsedWorkingDays;
  }

  const leaves = collectLeaves(level1Items);
  let planned = 0, actual = 0, totalWeight = 0;
  for (const l1 of level1Items) {
    const weight = l1.weight || 0;
    totalWeight += weight;
    const l1Leaves = collectLeaves([l1]);
    const n = l1Leaves.length;
    const avgProgress = n ? l1Leaves.reduce((s, i) => s + i.progress, 0) / n : 0;
    const avgPeriod = n ? l1Leaves.reduce((s, i) => s + leafPeriodProgress(i, today), 0) / n : 0;
    actual += (weight * avgProgress) / 100;
    planned += (weight * avgPeriod) / 100;
  }
  const plannedProgress = Math.round(planned * 10) / 10;
  const actualProgress = Math.round(actual * 10) / 10;

  return {
    project: { id: project.id, name: project.name, startDate: project.startDate, endDate: project.endDate },
    schedule: {
      totalDays,
      weekendDays: countWeekends(startDate, endDate),
      holidayCount: holidays.length,
      workingDays,
      elapsedDays,
      remainingDays,
      elapsedWorkingDays,
      remainingWorkingDays,
      expectedProgress: workingDays > 0 ? Math.round((elapsedWorkingDays / workingDays) * 100) : 0,
    },
    wbs: {
      total: leaves.length,
      completed: leaves.filter((l) => l.status === "COMPLETED").length,
      inProgress: leaves.filter((l) => l.status === "IN_PROGRESS").length,
      delayed: leaves.filter((l) => isLeafDelayed(l, today)).length,
      plannedProgress,
      actualProgress,
      delayRate: Math.round((plannedProgress - actualProgress) * 10) / 10,
      achievementRate: plannedProgress > 0 ? Math.round((actualProgress / plannedProgress) * 100) : actualProgress > 0 ? 100 : 0,
      totalWeight,
    },
  };
}

/** 프로젝트를 읽어 통계를 계산한다. 프로젝트가 없으면 null */
export async function loadWbsScheduleStats(db: Db, projectId: string, today: Date = new Date()): Promise<WbsScheduleStatsResult | null> {
  const project = await db.project.findUnique({
    where: { id: projectId },
    select: { id: true, name: true, startDate: true, endDate: true },
  });
  if (!project) return null;
  if (!project.startDate || !project.endDate) {
    return { project: { id: project.id, name: project.name }, schedule: null, wbs: null, message: "프로젝트 시작일/종료일이 설정되지 않았습니다." };
  }
  const holidays = await db.holiday.findMany({
    where: { projectId, date: { gte: project.startDate, lte: project.endDate }, type: { in: ["COMPANY_HOLIDAY", "TEAM_OFFSITE"] } },
    select: { date: true },
  });
  const level1Items = await db.wbsItem.findMany({
    where: { projectId, level: "LEVEL1" },
    include: { children: { include: { children: { include: { children: true } } } } },
  });
  return computeScheduleStats({
    project: { id: project.id, name: project.name, startDate: project.startDate, endDate: project.endDate },
    holidays: holidays.map((h) => h.date),
    level1Items: level1Items as unknown as WbsNode[],
    today,
  });
}
