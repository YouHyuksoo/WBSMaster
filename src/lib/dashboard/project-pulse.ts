/**
 * @file src/lib/dashboard/project-pulse.ts
 * @description
 * 대시보드 상단 "프로젝트 한눈에" 패널용 집계: 오늘 등록 · 누적 · 미결 건수, 긴급 항목, 최근 14일 등록 추이.
 *
 * 초보자 가이드:
 * 1. getProjectPulse(projectId, now): 프로젝트 하나에 대한 모든 집계를 병렬로 모은다 (count 위주, 목록은 최대 8건)
 * 2. 긴급 항목: 지연된 WBS(종료일 지남 · 미완료), 긴급 · 높음 이슈(미해결), 높음 협의요청(미종료), 목표일 지난 현업이슈, 7일 안 마일스톤
 * 3. 날짜는 서버 현지 시각의 자정 기준 (today-stats 와 같다)
 * 4. buildTrend: 생성일 목록 → 최근 N일 일자별 건수 (테스트 가능하게 분리)
 */

import { prisma } from "@/lib/prisma";

const DAY = 86400000;

export interface PulseCounts {
  tasks: number;
  customerRequirements: number;
  fieldIssues: number;
  discussionItems: number;
  issues: number;
  interviews: number;
  meetingMinutes: number;
}

export interface PulseUrgentItem {
  kind: "WBS" | "ISSUE" | "DISCUSSION" | "FIELD_ISSUE" | "MILESTONE";
  title: string;
  code: string | null;
  /** 기한 (ISO) */
  due: string | null;
  /** 기한까지 남은 날 (음수면 지남) */
  daysLeft: number | null;
  href: string;
}

export interface ProjectPulse {
  today: PulseCounts;
  totals: PulseCounts;
  open: { fieldIssues: number; discussionItems: number; issues: number; customerRequirements: number; tasks: number };
  urgent: PulseUrgentItem[];
  urgentCount: number;
  trend: Array<{ date: string; count: number }>;
  todaySchedules: Array<{ title: string; type: string }>;
}

function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function dateKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** 생성일 목록 → 최근 days 일(오늘 포함) 일자별 건수 */
export function buildTrend(dates: Date[], now: Date, days = 14): Array<{ date: string; count: number }> {
  const today = startOfDay(now);
  const keys = Array.from({ length: days }, (_, i) => dateKey(new Date(today.getTime() - (days - 1 - i) * DAY)));
  const counts = new Map(keys.map((k) => [k, 0]));
  for (const d of dates) {
    const k = dateKey(new Date(d));
    if (counts.has(k)) counts.set(k, counts.get(k)! + 1);
  }
  return keys.map((date) => ({ date, count: counts.get(date)! }));
}

export function daysBetween(from: Date, to: Date | null): number | null {
  if (!to) return null;
  return Math.round((startOfDay(to).getTime() - startOfDay(from).getTime()) / DAY);
}

export async function getProjectPulse(projectId: string, now = new Date()): Promise<ProjectPulse> {
  const today = startOfDay(now);
  const tomorrow = new Date(today.getTime() + DAY);
  const since = new Date(today.getTime() - 13 * DAY);
  const week = new Date(today.getTime() + 8 * DAY);
  const p = { projectId };
  const created = { createdAt: { gte: today, lt: tomorrow } };

  const [
    tTasks, tReq, tField, tDisc, tIssue, tInterview, tMinute,
    aTasks, aReq, aField, aDisc, aIssue, aInterview, aMinute,
    oField, oDisc, oIssue, oReq, oTasks,
    delayedWbs, urgentIssues, urgentDisc, overdueField, nearMilestones,
    trendRows, schedules,
  ] = await Promise.all([
    prisma.task.count({ where: { ...p, ...created } }),
    prisma.customerRequirement.count({ where: { ...p, ...created } }),
    prisma.fieldIssue.count({ where: { ...p, ...created } }),
    prisma.discussionItem.count({ where: { ...p, ...created } }),
    prisma.issue.count({ where: { ...p, ...created } }),
    prisma.interview.count({ where: { ...p, ...created } }),
    prisma.meetingMinute.count({ where: { ...p, ...created } }),
    prisma.task.count({ where: p }),
    prisma.customerRequirement.count({ where: p }),
    prisma.fieldIssue.count({ where: p }),
    prisma.discussionItem.count({ where: p }),
    prisma.issue.count({ where: p }),
    prisma.interview.count({ where: p }),
    prisma.meetingMinute.count({ where: p }),
    prisma.fieldIssue.count({ where: { ...p, status: { in: ["OPEN", "IN_PROGRESS", "PENDING"] } } }),
    prisma.discussionItem.count({ where: { ...p, status: { in: ["DISCUSSING", "BLOCKED"] } } }),
    prisma.issue.count({ where: { ...p, status: { in: ["OPEN", "IN_PROGRESS"] } } }),
    prisma.customerRequirement.count({ where: { ...p, applyStatus: { in: ["REVIEWING", "APPROVED", "IN_DEVELOPMENT"] } } }),
    prisma.task.count({ where: { ...p, status: { notIn: ["COMPLETED", "CANCELLED"] } } }),
    prisma.wbsItem.findMany({
      where: { ...p, endDate: { lt: today }, status: { notIn: ["COMPLETED", "CANCELLED"] } },
      orderBy: { endDate: "asc" }, take: 8, select: { code: true, name: true, endDate: true },
    }),
    prisma.issue.findMany({
      where: { ...p, priority: { in: ["CRITICAL", "HIGH"] }, status: { in: ["OPEN", "IN_PROGRESS"] } },
      orderBy: [{ priority: "asc" }, { dueDate: "asc" }], take: 8, select: { code: true, title: true, dueDate: true },
    }),
    prisma.discussionItem.findMany({
      where: { ...p, priority: "HIGH", status: { in: ["DISCUSSING", "BLOCKED"] } },
      orderBy: { dueDate: "asc" }, take: 8, select: { code: true, title: true, dueDate: true },
    }),
    prisma.fieldIssue.findMany({
      where: { ...p, targetDate: { lt: today }, status: { in: ["OPEN", "IN_PROGRESS", "PENDING"] } },
      orderBy: { targetDate: "asc" }, take: 8, select: { code: true, title: true, targetDate: true },
    }),
    prisma.milestone.findMany({
      where: { ...p, endDate: { gte: today, lt: week }, status: { not: "COMPLETED" } },
      orderBy: { endDate: "asc" }, take: 8, select: { name: true, endDate: true },
    }),
    Promise.all([
      prisma.task.findMany({ where: { ...p, createdAt: { gte: since } }, select: { createdAt: true } }),
      prisma.customerRequirement.findMany({ where: { ...p, createdAt: { gte: since } }, select: { createdAt: true } }),
      prisma.fieldIssue.findMany({ where: { ...p, createdAt: { gte: since } }, select: { createdAt: true } }),
      prisma.discussionItem.findMany({ where: { ...p, createdAt: { gte: since } }, select: { createdAt: true } }),
      prisma.issue.findMany({ where: { ...p, createdAt: { gte: since } }, select: { createdAt: true } }),
    ]),
    prisma.holiday.findMany({
      where: { ...p, date: { lt: tomorrow }, OR: [{ endDate: { gte: today } }, { endDate: null, date: { gte: today } }] },
      orderBy: { date: "asc" }, take: 6, select: { title: true, type: true },
    }),
  ]);

  const urgent: PulseUrgentItem[] = [
    ...delayedWbs.map((w) => ({ kind: "WBS" as const, title: w.name, code: w.code, due: w.endDate?.toISOString() ?? null, daysLeft: daysBetween(now, w.endDate), href: "/dashboard/wbs" })),
    ...overdueField.map((f) => ({ kind: "FIELD_ISSUE" as const, title: f.title, code: f.code, due: f.targetDate?.toISOString() ?? null, daysLeft: daysBetween(now, f.targetDate), href: "/dashboard/field-issues" })),
    ...urgentIssues.map((i) => ({ kind: "ISSUE" as const, title: i.title, code: i.code, due: i.dueDate?.toISOString() ?? null, daysLeft: daysBetween(now, i.dueDate), href: "/dashboard/issues" })),
    ...urgentDisc.map((d) => ({ kind: "DISCUSSION" as const, title: d.title, code: d.code, due: d.dueDate?.toISOString() ?? null, daysLeft: daysBetween(now, d.dueDate), href: "/dashboard/discussion-items" })),
    ...nearMilestones.map((m) => ({ kind: "MILESTONE" as const, title: m.name, code: null, due: m.endDate.toISOString(), daysLeft: daysBetween(now, m.endDate), href: "/dashboard/milestones" })),
  ];

  return {
    today: { tasks: tTasks, customerRequirements: tReq, fieldIssues: tField, discussionItems: tDisc, issues: tIssue, interviews: tInterview, meetingMinutes: tMinute },
    totals: { tasks: aTasks, customerRequirements: aReq, fieldIssues: aField, discussionItems: aDisc, issues: aIssue, interviews: aInterview, meetingMinutes: aMinute },
    open: { fieldIssues: oField, discussionItems: oDisc, issues: oIssue, customerRequirements: oReq, tasks: oTasks },
    urgent: urgent.slice(0, 12),
    urgentCount: urgent.length,
    trend: buildTrend(trendRows.flat().map((r) => r.createdAt), now),
    todaySchedules: schedules,
  };
}
