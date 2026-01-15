/**
 * @file src/app/dashboard/kanban/components/WorkloadAnalysis.tsx
 * @description
 * 부하분석 컴포넌트입니다.
 * 멤버별/날짜별 작업 건수를 시각화합니다.
 *
 * 초보자 가이드:
 * 1. **상단 달력**: 날짜 범위를 선택하고 날짜별 헤더 표시
 * 2. **좌측 멤버**: 프로젝트에 등록된 멤버 리스트
 * 3. **셀**: 각 멤버의 날짜별 작업 건수 (대기중/진행중/완료)
 *
 * 중요 로직:
 * - Task가 startDate ~ dueDate 기간 동안 배정되면 해당 기간의 각 날짜에 카운트
 * - 예: Task A가 1일~3일이면 1일, 2일, 3일 각각에 1건으로 카운트
 */

"use client";

import { useState, useMemo } from "react";
import { Icon, Button } from "@/components/ui";
import type { Task } from "@/lib/api";

/** 멤버 타입 (TeamMember와 호환) */
interface Member {
  id: string;
  userId: string;
  user?: {
    id: string;
    name?: string;
    email?: string;
    avatar?: string;
  };
}

/** 날짜별 작업 건수 */
interface DailyCount {
  pending: number;
  inProgress: number;
  completed: number;
  total: number;
}

/** Props */
interface WorkloadAnalysisProps {
  tasks: Task[];
  members: Member[];
  projectName?: string;
}

/**
 * 두 날짜 사이의 모든 날짜를 반환
 */
function getDatesBetween(startDate: Date, endDate: Date): Date[] {
  const dates: Date[] = [];
  const current = new Date(startDate);
  current.setHours(0, 0, 0, 0);
  const end = new Date(endDate);
  end.setHours(0, 0, 0, 0);

  while (current <= end) {
    dates.push(new Date(current));
    current.setDate(current.getDate() + 1);
  }
  return dates;
}

/**
 * 날짜를 YYYY-MM-DD 형식으로 변환
 */
function formatDateKey(date: Date): string {
  return date.toISOString().split("T")[0];
}

/**
 * 날짜를 요일과 함께 표시
 */
function formatDateDisplay(date: Date): { day: string; weekday: string; isWeekend: boolean } {
  const day = date.getDate().toString();
  const weekdays = ["일", "월", "화", "수", "목", "금", "토"];
  const weekday = weekdays[date.getDay()];
  const isWeekend = date.getDay() === 0 || date.getDay() === 6;
  return { day, weekday, isWeekend };
}

/**
 * 부하분석 컴포넌트
 */
export function WorkloadAnalysis({ tasks, members, projectName }: WorkloadAnalysisProps) {
  // 날짜 범위 상태 (기본: 이번 주 월요일 ~ 다음주 일요일, 2주)
  const today = new Date();
  const defaultStartDate = new Date(today);
  defaultStartDate.setDate(today.getDate() - today.getDay() + 1); // 이번 주 월요일
  if (today.getDay() === 0) defaultStartDate.setDate(defaultStartDate.getDate() - 7);

  const defaultEndDate = new Date(defaultStartDate);
  defaultEndDate.setDate(defaultStartDate.getDate() + 13); // 2주

  const [startDate, setStartDate] = useState<Date>(defaultStartDate);
  const [endDate, setEndDate] = useState<Date>(defaultEndDate);

  // 날짜 범위 내의 모든 날짜
  const dateRange = useMemo(() => {
    return getDatesBetween(startDate, endDate);
  }, [startDate, endDate]);

  // 멤버별/날짜별 작업 건수 계산
  const workloadData = useMemo(() => {
    const data: Record<string, Record<string, DailyCount>> = {};

    // 모든 멤버 초기화
    members.forEach((member) => {
      data[member.userId] = {};
      dateRange.forEach((date) => {
        const dateKey = formatDateKey(date);
        data[member.userId][dateKey] = { pending: 0, inProgress: 0, completed: 0, total: 0 };
      });
    });

    // 미배정 작업을 위한 항목 추가
    data["unassigned"] = {};
    dateRange.forEach((date) => {
      const dateKey = formatDateKey(date);
      data["unassigned"][dateKey] = { pending: 0, inProgress: 0, completed: 0, total: 0 };
    });

    // 각 Task에 대해 날짜별 카운트
    tasks.forEach((task) => {
      // startDate와 dueDate가 있어야 함
      if (!task.startDate && !task.dueDate) return;

      const taskStart = task.startDate ? new Date(task.startDate) : new Date(task.dueDate!);
      const taskEnd = task.dueDate ? new Date(task.dueDate) : new Date(task.startDate!);
      taskStart.setHours(0, 0, 0, 0);
      taskEnd.setHours(0, 0, 0, 0);

      // Task 기간 내의 날짜들
      const taskDates = getDatesBetween(taskStart, taskEnd);

      // 담당자들 (주 담당자 + 부 담당자)
      const assigneeIds: string[] = [];
      if (task.assigneeId) assigneeIds.push(task.assigneeId);
      if (task.assignees) {
        task.assignees.forEach((a) => {
          if (a.id && !assigneeIds.includes(a.id)) {
            assigneeIds.push(a.id);
          }
        });
      }

      // 담당자가 없으면 미배정
      if (assigneeIds.length === 0) {
        assigneeIds.push("unassigned");
      }

      // 각 담당자에 대해 날짜별 카운트
      assigneeIds.forEach((userId) => {
        if (!data[userId]) return;

        taskDates.forEach((date) => {
          const dateKey = formatDateKey(date);
          if (!data[userId][dateKey]) return;

          // 상태별 카운트
          if (task.status === "PENDING") {
            data[userId][dateKey].pending++;
          } else if (task.status === "IN_PROGRESS") {
            data[userId][dateKey].inProgress++;
          } else if (task.status === "COMPLETED") {
            data[userId][dateKey].completed++;
          }
          data[userId][dateKey].total++;
        });
      });
    });

    return data;
  }, [tasks, members, dateRange]);

  // 날짜별 전체 합계
  const dailyTotals = useMemo(() => {
    const totals: Record<string, DailyCount> = {};
    dateRange.forEach((date) => {
      const dateKey = formatDateKey(date);
      totals[dateKey] = { pending: 0, inProgress: 0, completed: 0, total: 0 };

      Object.values(workloadData).forEach((memberData) => {
        if (memberData[dateKey]) {
          totals[dateKey].pending += memberData[dateKey].pending;
          totals[dateKey].inProgress += memberData[dateKey].inProgress;
          totals[dateKey].completed += memberData[dateKey].completed;
          totals[dateKey].total += memberData[dateKey].total;
        }
      });
    });
    return totals;
  }, [workloadData, dateRange]);

  // 이전/다음 주 이동
  const handlePrevWeek = () => {
    const newStart = new Date(startDate);
    newStart.setDate(newStart.getDate() - 7);
    const newEnd = new Date(endDate);
    newEnd.setDate(newEnd.getDate() - 7);
    setStartDate(newStart);
    setEndDate(newEnd);
  };

  const handleNextWeek = () => {
    const newStart = new Date(startDate);
    newStart.setDate(newStart.getDate() + 7);
    const newEnd = new Date(endDate);
    newEnd.setDate(newEnd.getDate() + 7);
    setStartDate(newStart);
    setEndDate(newEnd);
  };

  const handleToday = () => {
    const newStart = new Date(today);
    newStart.setDate(today.getDate() - today.getDay() + 1);
    if (today.getDay() === 0) newStart.setDate(newStart.getDate() - 7);
    const newEnd = new Date(newStart);
    newEnd.setDate(newStart.getDate() + 13);
    setStartDate(newStart);
    setEndDate(newEnd);
  };

  // 셀 색상 결정
  const getCellColor = (count: DailyCount) => {
    if (count.total === 0) return "bg-transparent";
    if (count.total >= 5) return "bg-error/20";
    if (count.total >= 3) return "bg-warning/20";
    return "bg-primary/10";
  };

  return (
    <div className="space-y-4">
      {/* 상단 컨트롤 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handlePrevWeek}>
            <Icon name="chevron_left" size="sm" />
          </Button>
          <Button variant="outline" size="sm" onClick={handleToday}>
            오늘
          </Button>
          <Button variant="outline" size="sm" onClick={handleNextWeek}>
            <Icon name="chevron_right" size="sm" />
          </Button>
          <span className="text-sm text-text-secondary ml-2">
            {startDate.toLocaleDateString("ko-KR", { year: "numeric", month: "long", day: "numeric" })}
            {" ~ "}
            {endDate.toLocaleDateString("ko-KR", { year: "numeric", month: "long", day: "numeric" })}
          </span>
        </div>
        <div className="flex items-center gap-4 text-xs">
          <div className="flex items-center gap-1">
            <div className="size-3 rounded bg-slate-400" />
            <span className="text-text-secondary">대기</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="size-3 rounded bg-sky-500" />
            <span className="text-text-secondary">진행</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="size-3 rounded bg-emerald-500" />
            <span className="text-text-secondary">완료</span>
          </div>
        </div>
      </div>

      {/* 부하분석 테이블 */}
      <div className="bg-background-white dark:bg-surface-dark border border-border dark:border-border-dark rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse min-w-[800px]">
            {/* 헤더: 날짜 */}
            <thead>
              <tr className="bg-surface dark:bg-background-dark">
                <th className="sticky left-0 z-10 bg-surface dark:bg-background-dark border-b border-r border-border dark:border-border-dark p-2 text-left min-w-[150px]">
                  <span className="text-sm font-semibold text-text dark:text-white">담당자</span>
                </th>
                {dateRange.map((date) => {
                  const { day, weekday, isWeekend } = formatDateDisplay(date);
                  const isToday = formatDateKey(date) === formatDateKey(today);
                  return (
                    <th
                      key={formatDateKey(date)}
                      className={`border-b border-border dark:border-border-dark p-1 text-center min-w-[60px] ${
                        isWeekend ? "bg-slate-100 dark:bg-slate-800/50" : ""
                      } ${isToday ? "bg-primary/10" : ""}`}
                    >
                      <div className="flex flex-col items-center">
                        <span className={`text-[10px] ${isWeekend ? "text-error" : "text-text-secondary"}`}>
                          {weekday}
                        </span>
                        <span className={`text-sm font-bold ${isToday ? "text-primary" : "text-text dark:text-white"}`}>
                          {day}
                        </span>
                      </div>
                    </th>
                  );
                })}
                <th className="border-b border-l border-border dark:border-border-dark p-2 text-center min-w-[80px] bg-surface dark:bg-background-dark">
                  <span className="text-xs font-semibold text-text-secondary">합계</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {/* 멤버별 행 */}
              {members.map((member) => {
                const memberData = workloadData[member.userId] || {};
                const memberTotal = Object.values(memberData).reduce(
                  (acc, d) => ({
                    pending: acc.pending + d.pending,
                    inProgress: acc.inProgress + d.inProgress,
                    completed: acc.completed + d.completed,
                    total: acc.total + d.total,
                  }),
                  { pending: 0, inProgress: 0, completed: 0, total: 0 }
                );

                return (
                  <tr key={member.userId} className="hover:bg-surface/50 dark:hover:bg-background-dark/50">
                    {/* 멤버 정보 */}
                    <td className="sticky left-0 z-10 bg-background-white dark:bg-surface-dark border-b border-r border-border dark:border-border-dark p-2">
                      <div className="flex items-center gap-2">
                        {member.user?.avatar ? (
                          <img
                            src={member.user.avatar}
                            alt={member.user?.name || ""}
                            className="size-7 rounded-full object-cover"
                          />
                        ) : (
                          <div className="size-7 rounded-full bg-primary/80 flex items-center justify-center text-xs font-bold text-white">
                            {member.user?.name?.charAt(0) || "?"}
                          </div>
                        )}
                        <span className="text-sm font-medium text-text dark:text-white truncate max-w-[100px]">
                          {member.user?.name || "알 수 없음"}
                        </span>
                      </div>
                    </td>
                    {/* 날짜별 셀 */}
                    {dateRange.map((date) => {
                      const dateKey = formatDateKey(date);
                      const count = memberData[dateKey] || { pending: 0, inProgress: 0, completed: 0, total: 0 };
                      const { isWeekend } = formatDateDisplay(date);
                      const isToday = dateKey === formatDateKey(today);

                      return (
                        <td
                          key={dateKey}
                          className={`border-b border-border dark:border-border-dark p-1 text-center ${
                            isWeekend ? "bg-slate-50 dark:bg-slate-800/30" : ""
                          } ${isToday ? "bg-primary/5" : ""} ${getCellColor(count)}`}
                        >
                          {count.total > 0 ? (
                            <div className="flex flex-col items-center gap-0.5">
                              <div className="flex items-center justify-center gap-0.5">
                                {count.pending > 0 && (
                                  <span className="text-[10px] font-bold text-slate-500 bg-slate-200 dark:bg-slate-600 px-1 rounded">
                                    {count.pending}
                                  </span>
                                )}
                                {count.inProgress > 0 && (
                                  <span className="text-[10px] font-bold text-sky-600 bg-sky-200 dark:bg-sky-800 px-1 rounded">
                                    {count.inProgress}
                                  </span>
                                )}
                                {count.completed > 0 && (
                                  <span className="text-[10px] font-bold text-emerald-600 bg-emerald-200 dark:bg-emerald-800 px-1 rounded">
                                    {count.completed}
                                  </span>
                                )}
                              </div>
                            </div>
                          ) : (
                            <span className="text-text-secondary/30">-</span>
                          )}
                        </td>
                      );
                    })}
                    {/* 멤버 합계 */}
                    <td className="border-b border-l border-border dark:border-border-dark p-1 text-center bg-surface/50 dark:bg-background-dark/50">
                      <div className="flex flex-col items-center gap-0.5">
                        <span className="text-sm font-bold text-text dark:text-white">{memberTotal.total}</span>
                        <div className="flex items-center gap-0.5 text-[9px]">
                          <span className="text-slate-500">{memberTotal.pending}</span>
                          <span className="text-text-secondary">/</span>
                          <span className="text-sky-500">{memberTotal.inProgress}</span>
                          <span className="text-text-secondary">/</span>
                          <span className="text-emerald-500">{memberTotal.completed}</span>
                        </div>
                      </div>
                    </td>
                  </tr>
                );
              })}

              {/* 미배정 행 */}
              {workloadData["unassigned"] && Object.values(workloadData["unassigned"]).some((d) => d.total > 0) && (
                <tr className="hover:bg-surface/50 dark:hover:bg-background-dark/50 bg-warning/5">
                  <td className="sticky left-0 z-10 bg-warning/10 dark:bg-warning/20 border-b border-r border-border dark:border-border-dark p-2">
                    <div className="flex items-center gap-2">
                      <div className="size-7 rounded-full bg-warning/80 flex items-center justify-center">
                        <Icon name="person_off" size="xs" className="text-white" />
                      </div>
                      <span className="text-sm font-medium text-warning">미배정</span>
                    </div>
                  </td>
                  {dateRange.map((date) => {
                    const dateKey = formatDateKey(date);
                    const count = workloadData["unassigned"][dateKey] || { pending: 0, inProgress: 0, completed: 0, total: 0 };
                    const { isWeekend } = formatDateDisplay(date);

                    return (
                      <td
                        key={dateKey}
                        className={`border-b border-border dark:border-border-dark p-1 text-center ${
                          isWeekend ? "bg-slate-50 dark:bg-slate-800/30" : ""
                        } ${count.total > 0 ? "bg-warning/10" : ""}`}
                      >
                        {count.total > 0 ? (
                          <span className="text-xs font-bold text-warning">{count.total}</span>
                        ) : (
                          <span className="text-text-secondary/30">-</span>
                        )}
                      </td>
                    );
                  })}
                  <td className="border-b border-l border-border dark:border-border-dark p-1 text-center bg-warning/10">
                    <span className="text-sm font-bold text-warning">
                      {Object.values(workloadData["unassigned"]).reduce((acc, d) => acc + d.total, 0)}
                    </span>
                  </td>
                </tr>
              )}

              {/* 날짜별 합계 행 */}
              <tr className="bg-surface dark:bg-background-dark font-semibold">
                <td className="sticky left-0 z-10 bg-surface dark:bg-background-dark border-r border-border dark:border-border-dark p-2">
                  <span className="text-sm text-text-secondary">일별 합계</span>
                </td>
                {dateRange.map((date) => {
                  const dateKey = formatDateKey(date);
                  const total = dailyTotals[dateKey] || { pending: 0, inProgress: 0, completed: 0, total: 0 };
                  const { isWeekend } = formatDateDisplay(date);
                  const isToday = dateKey === formatDateKey(today);

                  return (
                    <td
                      key={dateKey}
                      className={`border-border dark:border-border-dark p-1 text-center ${
                        isWeekend ? "bg-slate-100 dark:bg-slate-800/50" : ""
                      } ${isToday ? "bg-primary/10" : ""}`}
                    >
                      <div className="flex flex-col items-center">
                        <span className="text-sm font-bold text-text dark:text-white">{total.total}</span>
                        <div className="flex items-center gap-0.5 text-[9px]">
                          <span className="text-slate-500">{total.pending}</span>
                          <span className="text-text-secondary">/</span>
                          <span className="text-sky-500">{total.inProgress}</span>
                          <span className="text-text-secondary">/</span>
                          <span className="text-emerald-500">{total.completed}</span>
                        </div>
                      </div>
                    </td>
                  );
                })}
                <td className="border-l border-border dark:border-border-dark p-1 text-center">
                  <span className="text-sm font-bold text-primary">
                    {Object.values(dailyTotals).reduce((acc, d) => acc + d.total, 0)}
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* 멤버가 없을 때 */}
      {members.length === 0 && (
        <div className="text-center py-12 text-text-secondary">
          <Icon name="group_off" size="xl" className="mb-4 opacity-50" />
          <p>등록된 멤버가 없습니다.</p>
          <p className="text-sm">프로젝트 설정에서 멤버를 추가해주세요.</p>
        </div>
      )}
    </div>
  );
}
