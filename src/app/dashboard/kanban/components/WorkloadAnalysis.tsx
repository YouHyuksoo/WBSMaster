/**
 * @file src/app/dashboard/kanban/components/WorkloadAnalysis.tsx
 * @description
 * 부하분석 컴포넌트입니다.
 * 멤버별/날짜별 작업 건수를 시각화합니다.
 *
 * 초보자 가이드:
 * 1. **상단 달력**: 날짜 범위를 선택하고 날짜별 헤더 표시
 * 2. **좌측 멤버**: 프로젝트에 등록된 멤버 리스트
 * 3. **셀**: 각 멤버의 날짜별 작업 건수 (대기중/진행중)
 * 4. **AI 분석**: 하단에서 LLM 기반 부하 분석 및 조언 제공
 *
 * 중요 로직:
 * - Task가 startDate ~ dueDate 기간 동안 배정되면 해당 기간의 각 날짜에 카운트
 * - 예: Task A가 1일~3일이면 1일, 2일, 3일 각각에 1건으로 카운트
 * - 🔥 마감일이 지난 진행중/대기/지연/보류 태스크는 오늘까지 연장하여 카운트
 * - 진행중, 지연(DELAYED), 보류(HOLDING) 상태는 모두 "진행" 카운트에 포함
 * - 완료(COMPLETED), 취소(CANCELLED) 상태는 부하 계산에서 제외
 * - AI 분석은 대기중/진행중 태스크만 분석 (완료 제외)
 */

"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import { Icon, Button } from "@/components/ui";
import ReactMarkdown from "react-markdown";
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

/** Task 정보 (툴팁용) */
interface TaskInfo {
  id: string;
  title: string;
  status: string;
  isDelayed: boolean; // 🔥 해당 날짜 기준 지연 여부
}

/** 날짜별 작업 건수 */
interface DailyCount {
  pending: number;
  inProgress: number;
  delayed: number; // 🔥 마감일 지난 미완료 태스크
  completed: number;
  total: number;
  tasks: TaskInfo[];
}

/** 분석 메타데이터 타입 */
interface AnalysisMetadata {
  id: string;
  memberCount: number;
  dateRange: {
    start: string;
    end: string;
  };
  analyzedAt: string;
  analyzedBy?: string;
}

/** Props */
interface WorkloadAnalysisProps {
  tasks: Task[];
  members: Member[];
  projectId?: string;
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
export function WorkloadAnalysis({ tasks, members, projectId, projectName }: WorkloadAnalysisProps) {
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
        data[member.userId][dateKey] = { pending: 0, inProgress: 0, delayed: 0, completed: 0, total: 0, tasks: [] };
      });
    });

    // 미배정 작업을 위한 항목 추가
    data["unassigned"] = {};
    dateRange.forEach((date) => {
      const dateKey = formatDateKey(date);
      data["unassigned"][dateKey] = { pending: 0, inProgress: 0, delayed: 0, completed: 0, total: 0, tasks: [] };
    });

    // 각 Task에 대해 날짜별 카운트
    const todayDate = new Date();
    todayDate.setHours(0, 0, 0, 0);

    tasks.forEach((task) => {
      // startDate와 dueDate가 있어야 함
      if (!task.startDate && !task.dueDate) return;

      const taskStart = task.startDate ? new Date(task.startDate) : new Date(task.dueDate!);
      let taskEnd = task.dueDate ? new Date(task.dueDate) : new Date(task.startDate!);
      taskStart.setHours(0, 0, 0, 0);
      taskEnd.setHours(0, 0, 0, 0);

      // 🔥 진행중/지연/대기 상태인데 마감일이 오늘 이전이면 → 오늘까지 연장
      // 완료되지 않은 태스크는 마감일이 지나도 부하에 포함되어야 함
      const isActiveTask = task.status === "PENDING" || task.status === "IN_PROGRESS" || task.status === "DELAYED" || task.status === "HOLDING";
      if (isActiveTask && taskEnd < todayDate) {
        taskEnd = todayDate;
      }

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

      // 🔥 마감일이 오늘 이전이면 지연 태스크로 판단
      const originalDueDate = task.dueDate ? new Date(task.dueDate) : null;
      if (originalDueDate) originalDueDate.setHours(0, 0, 0, 0);
      const isTaskDelayed = originalDueDate && originalDueDate < todayDate;

      // 각 담당자에 대해 날짜별 카운트
      assigneeIds.forEach((userId) => {
        if (!data[userId]) return;

        // 완료/취소 상태는 제외
        if (task.status === "COMPLETED" || task.status === "CANCELLED") return;

        if (isTaskDelayed) {
          // 🔥 지연된 태스크는 마감일 날짜에만 카운트
          const dueDateKey = formatDateKey(originalDueDate!);
          if (data[userId][dueDateKey]) {
            data[userId][dueDateKey].delayed++;
            data[userId][dueDateKey].total++;
            data[userId][dueDateKey].tasks.push({
              id: task.id,
              title: task.title,
              status: task.status,
              isDelayed: true,
            });
          }
        } else {
          // 정상 태스크는 기간 내 모든 날짜에 카운트
          taskDates.forEach((date) => {
            const dateKey = formatDateKey(date);
            if (!data[userId][dateKey]) return;

            if (task.status === "PENDING") {
              data[userId][dateKey].pending++;
            } else if (task.status === "IN_PROGRESS" || task.status === "DELAYED" || task.status === "HOLDING") {
              data[userId][dateKey].inProgress++;
            }
            data[userId][dateKey].total++;
            data[userId][dateKey].tasks.push({
              id: task.id,
              title: task.title,
              status: task.status,
              isDelayed: false,
            });
          });
        }
      });
    });

    return data;
  }, [tasks, members, dateRange]);

  // 날짜별 전체 합계
  const dailyTotals = useMemo(() => {
    const totals: Record<string, DailyCount> = {};
    dateRange.forEach((date) => {
      const dateKey = formatDateKey(date);
      totals[dateKey] = { pending: 0, inProgress: 0, delayed: 0, completed: 0, total: 0, tasks: [] };

      Object.values(workloadData).forEach((memberData) => {
        if (memberData[dateKey]) {
          totals[dateKey].pending += memberData[dateKey].pending;
          totals[dateKey].inProgress += memberData[dateKey].inProgress;
          totals[dateKey].delayed += memberData[dateKey].delayed;
          totals[dateKey].completed += memberData[dateKey].completed;
          totals[dateKey].total += memberData[dateKey].total;
          totals[dateKey].tasks.push(...memberData[dateKey].tasks);
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

  // AI 분석 상태
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isLoadingLast, setIsLoadingLast] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<string | null>(null);
  const [analysisMetadata, setAnalysisMetadata] = useState<AnalysisMetadata | null>(null);
  const [analysisError, setAnalysisError] = useState<string | null>(null);

  /**
   * 마지막 분석 결과 불러오기
   * - 컴포넌트 마운트 또는 projectId 변경 시 호출
   */
  useEffect(() => {
    const fetchLastAnalysis = async () => {
      if (!projectId) return;

      setIsLoadingLast(true);
      try {
        const response = await fetch(`/api/workload-analysis?projectId=${projectId}`);
        if (!response.ok) throw new Error("조회 실패");

        const data = await response.json();
        if (data.analysis) {
          setAnalysisResult(data.analysis);
          setAnalysisMetadata(data.metadata);
        }
      } catch (error) {
        console.error("마지막 분석 결과 조회 오류:", error);
        // 에러는 무시 (분석 결과가 없을 수도 있음)
      } finally {
        setIsLoadingLast(false);
      }
    };

    fetchLastAnalysis();
  }, [projectId]);

  /**
   * AI 부하분석 요청
   * - 멤버별 대기중/진행중 태스크를 집계하여 API로 전송
   * - 하루 8시간 근무 기준으로 부하 분석
   */
  const handleAnalysisRequest = useCallback(async () => {
    setIsAnalyzing(true);
    setAnalysisError(null);

    try {
      // 멤버별 태스크 집계 (대기중 + 진행중만)
      const memberWorkloads = members.map((member) => {
        const memberTasks = tasks.filter((task) => {
          // 담당자 확인
          const isAssigned =
            task.assigneeId === member.userId ||
            task.assignees?.some((a) => a.id === member.userId);
          // 상태 확인 (대기중 또는 진행중)
          const isActiveStatus = task.status === "PENDING" || task.status === "IN_PROGRESS";
          return isAssigned && isActiveStatus;
        });

        return {
          memberId: member.userId,
          memberName: member.user?.name || "알 수 없음",
          pendingTasks: memberTasks.filter((t) => t.status === "PENDING").length,
          inProgressTasks: memberTasks.filter((t) => t.status === "IN_PROGRESS").length,
          totalTasks: memberTasks.length,
          taskDetails: memberTasks.slice(0, 10).map((t) => ({
            title: t.title,
            status: t.status,
            priority: t.priority,
            startDate: t.startDate,
            dueDate: t.dueDate,
          })),
        };
      });

      // API 호출 (projectId 포함)
      const response = await fetch("/api/workload-analysis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId,
          members: memberWorkloads,
          dateRange: {
            start: formatDateKey(startDate),
            end: formatDateKey(endDate),
          },
          projectName,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "분석 요청에 실패했습니다.");
      }

      const data = await response.json();
      setAnalysisResult(data.analysis);
      setAnalysisMetadata(data.metadata);
    } catch (error) {
      console.error("AI 분석 오류:", error);
      setAnalysisError(error instanceof Error ? error.message : "분석 중 오류가 발생했습니다.");
    } finally {
      setIsAnalyzing(false);
    }
  }, [members, tasks, startDate, endDate, projectId, projectName]);

  // 셀 색상 결정 (지연 태스크가 있으면 더 강조)
  const getCellColor = (count: DailyCount) => {
    if (count.total === 0) return "bg-transparent";
    // 지연 태스크가 있으면 붉은 배경
    if (count.delayed > 0) return "bg-red-500/15";
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
            <div className="size-3 rounded bg-blue-500" />
            <span className="text-text-secondary">진행</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="size-3 rounded bg-red-500" />
            <span className="text-text-secondary">지연</span>
          </div>
        </div>
      </div>

      {/* 부하분석 테이블 */}
      <div className="bg-background-white dark:bg-surface-dark border border-border dark:border-border-dark rounded-xl relative">
        <div className="overflow-x-auto pt-2">
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
              {members.map((member, memberIndex) => {
                const memberData = workloadData[member.userId] || {};
                // 🔥 상단 2개 행은 툴팁을 아래로 표시 (overflow 잘림 방지)
                const isTopRow = memberIndex < 2;
                const memberTotal = Object.values(memberData).reduce(
                  (acc, d) => ({
                    pending: acc.pending + d.pending,
                    inProgress: acc.inProgress + d.inProgress,
                    delayed: acc.delayed + d.delayed,
                    completed: acc.completed + d.completed,
                    total: acc.total + d.total,
                  }),
                  { pending: 0, inProgress: 0, delayed: 0, completed: 0, total: 0 }
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
                      const count = memberData[dateKey] || { pending: 0, inProgress: 0, delayed: 0, completed: 0, total: 0, tasks: [] };
                      const { isWeekend } = formatDateDisplay(date);
                      const isToday = dateKey === formatDateKey(today);

                      return (
                        <td
                          key={dateKey}
                          className={`relative border-b border-border dark:border-border-dark p-1 text-center ${
                            isWeekend ? "bg-slate-50 dark:bg-slate-800/30" : ""
                          } ${isToday ? "bg-primary/5" : ""} ${getCellColor(count)}`}
                        >
                          {count.total > 0 ? (
                            <div className="relative group/cell">
                              <div className="flex flex-col items-center gap-0.5 cursor-pointer">
                                <div className="flex items-center justify-center gap-0.5 flex-wrap">
                                  {count.pending > 0 && (
                                    <span className="text-[10px] font-bold text-slate-500 bg-slate-200 dark:bg-slate-600 px-1 rounded">
                                      {count.pending}
                                    </span>
                                  )}
                                  {count.inProgress > 0 && (
                                    <span className="text-[10px] font-bold text-blue-600 bg-blue-200 dark:bg-blue-800 px-1 rounded">
                                      {count.inProgress}
                                    </span>
                                  )}
                                  {count.delayed > 0 && (
                                    <span className="text-[10px] font-bold text-red-600 bg-red-200 dark:bg-red-900 px-1 rounded">
                                      {count.delayed}
                                    </span>
                                  )}
                                </div>
                              </div>
                              {/* CSS 기반 툴팁 - 상단 행은 아래로, 나머지는 위로 표시 */}
                              {count.tasks.length > 0 && (
                                <div className={`absolute left-1/2 -translate-x-1/2 z-50 pointer-events-none opacity-0 group-hover/cell:opacity-100 transition-opacity ${
                                  isTopRow ? "top-full mt-2" : "bottom-full mb-2"
                                }`}>
                                  <div className="bg-slate-900 dark:bg-slate-800 text-white rounded-lg shadow-xl border border-slate-700 p-3 min-w-[200px] max-w-[300px]">
                                    <div className="flex items-center gap-2 mb-2">
                                      <span className="text-xs text-slate-400">작업 목록 ({count.total}건)</span>
                                    </div>
                                    <div className="space-y-1.5 max-h-[200px] overflow-y-auto">
                                      {count.tasks.map((t, idx) => {
                                        // 🔥 지연 여부에 따라 배지 스타일 결정
                                        let badgeClass = "";
                                        let badgeText = "";

                                        if (t.isDelayed) {
                                          // 마감일 지난 태스크는 지연으로 표시
                                          badgeClass = "bg-red-600 text-red-100";
                                          badgeText = "지연";
                                        } else if (t.status === "PENDING") {
                                          badgeClass = "bg-slate-600 text-slate-200";
                                          badgeText = "대기";
                                        } else if (t.status === "IN_PROGRESS") {
                                          badgeClass = "bg-blue-600 text-blue-100";
                                          badgeText = "진행";
                                        } else if (t.status === "DELAYED") {
                                          badgeClass = "bg-red-600 text-red-100";
                                          badgeText = "지연";
                                        } else if (t.status === "HOLDING") {
                                          badgeClass = "bg-orange-600 text-orange-100";
                                          badgeText = "보류";
                                        } else {
                                          badgeClass = "bg-green-600 text-green-100";
                                          badgeText = "완료";
                                        }

                                        return (
                                          <div key={idx} className="flex items-start gap-2">
                                            <span className={`text-xs px-1.5 py-0.5 rounded shrink-0 ${badgeClass}`}>
                                              {badgeText}
                                            </span>
                                            <span className="text-sm text-white/90 line-clamp-2">{t.title}</span>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  </div>
                                  {/* 화살표: 상단행은 위쪽, 나머지는 아래쪽 */}
                                  <div className={`absolute left-1/2 -translate-x-1/2 w-2 h-2 bg-slate-900 dark:bg-slate-800 rotate-45 border-slate-700 ${
                                    isTopRow ? "-top-1 border-l border-t" : "-bottom-1 border-r border-b"
                                  }`} />
                                </div>
                              )}
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
                          <span className="text-blue-500">{memberTotal.inProgress}</span>
                          {memberTotal.delayed > 0 && (
                            <>
                              <span className="text-text-secondary">/</span>
                              <span className="text-red-500">{memberTotal.delayed}</span>
                            </>
                          )}
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
                  const total = dailyTotals[dateKey] || { pending: 0, inProgress: 0, delayed: 0, completed: 0, total: 0 };
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
                          <span className="text-blue-500">{total.inProgress}</span>
                          {total.delayed > 0 && (
                            <>
                              <span className="text-text-secondary">/</span>
                              <span className="text-red-500">{total.delayed}</span>
                            </>
                          )}
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

      {/* AI 부하분석 섹션 */}
      {members.length > 0 && (
        <div className="bg-background-white dark:bg-surface-dark border border-border dark:border-border-dark rounded-xl overflow-hidden">
          {/* 헤더 */}
          <div className="flex items-center justify-between p-4 border-b border-border dark:border-border-dark bg-gradient-to-r from-purple-500/10 to-blue-500/10">
            <div className="flex items-center gap-3">
              <div className="size-10 rounded-lg bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center shadow-lg">
                <Icon name="psychology" size="sm" className="text-white" />
              </div>
              <div>
                <h3 className="text-base font-bold text-text dark:text-white flex items-center gap-2">
                  AI 부하분석
                  <span className="text-xs font-normal px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-400">
                    Beta
                  </span>
                </h3>
                <p className="text-xs text-text-secondary">
                  하루 8시간 근무 기준으로 멤버별 업무 부하를 분석합니다
                </p>
              </div>
            </div>
            <Button
              variant="primary"
              size="sm"
              onClick={handleAnalysisRequest}
              disabled={isAnalyzing}
              className="bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600"
            >
              {isAnalyzing ? (
                <>
                  <Icon name="progress_activity" size="sm" className="animate-spin" />
                  <span>분석 중...</span>
                </>
              ) : (
                <>
                  <Icon name="auto_awesome" size="sm" />
                  <span>분석요청</span>
                </>
              )}
            </Button>
          </div>

          {/* 분석 결과 영역 */}
          <div className="p-4">
            {/* 로딩 상태 */}
            {isAnalyzing && (
              <div className="flex flex-col items-center justify-center py-12">
                <div className="size-16 rounded-full bg-gradient-to-br from-purple-500/20 to-blue-500/20 flex items-center justify-center mb-4 animate-pulse">
                  <Icon name="psychology" size="lg" className="text-purple-400" />
                </div>
                <p className="text-sm text-text-secondary animate-pulse">
                  AI가 업무 부하를 분석하고 있습니다...
                </p>
                <p className="text-xs text-text-secondary/60 mt-1">
                  멤버별 태스크 현황을 기반으로 조언을 생성합니다
                </p>
              </div>
            )}

            {/* 에러 상태 */}
            {analysisError && !isAnalyzing && (
              <div className="flex items-center gap-3 p-4 rounded-lg bg-error/10 border border-error/20">
                <Icon name="error" size="sm" className="text-error shrink-0" />
                <div>
                  <p className="text-sm font-medium text-error">분석 실패</p>
                  <p className="text-xs text-error/80">{analysisError}</p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleAnalysisRequest}
                  className="ml-auto text-error border-error/30 hover:bg-error/10"
                >
                  다시 시도
                </Button>
              </div>
            )}

            {/* 마지막 분석 결과 로딩 중 */}
            {isLoadingLast && !isAnalyzing && (
              <div className="flex flex-col items-center justify-center py-8">
                <div className="size-10 rounded-full bg-surface dark:bg-background-dark flex items-center justify-center mb-3 animate-pulse">
                  <Icon name="history" size="sm" className="text-text-secondary" />
                </div>
                <p className="text-sm text-text-secondary animate-pulse">
                  이전 분석 결과를 불러오는 중...
                </p>
              </div>
            )}

            {/* 분석 결과 */}
            {analysisResult && !isAnalyzing && !isLoadingLast && (
              <div className="space-y-4">
                {/* 메타데이터 표시 */}
                {analysisMetadata && (
                  <div className="flex flex-wrap items-center gap-4 p-3 rounded-lg bg-surface/50 dark:bg-background-dark/50 border border-border/50 dark:border-border-dark/50">
                    <div className="flex items-center gap-2 text-xs text-text-secondary">
                      <Icon name="schedule" size="xs" className="text-primary" />
                      <span>
                        분석일시: {new Date(analysisMetadata.analyzedAt).toLocaleString("ko-KR")}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-text-secondary">
                      <Icon name="date_range" size="xs" className="text-blue-500" />
                      <span>
                        분석기간: {analysisMetadata.dateRange.start} ~ {analysisMetadata.dateRange.end}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-text-secondary">
                      <Icon name="group" size="xs" className="text-success" />
                      <span>분석대상: {analysisMetadata.memberCount}명</span>
                    </div>
                    {analysisMetadata.analyzedBy && (
                      <div className="flex items-center gap-2 text-xs text-text-secondary">
                        <Icon name="person" size="xs" className="text-warning" />
                        <span>분석자: {analysisMetadata.analyzedBy}</span>
                      </div>
                    )}
                  </div>
                )}

                {/* 마크다운 결과 */}
                <div className="prose prose-sm dark:prose-invert max-w-none">
                  <ReactMarkdown
                    components={{
                      // 마크다운 스타일 커스터마이징
                      h3: ({ children }) => (
                        <h3 className="text-lg font-bold text-text dark:text-white mt-4 mb-2 flex items-center gap-2">
                          {children}
                        </h3>
                      ),
                      h4: ({ children }) => (
                        <h4 className="text-base font-semibold text-text dark:text-white mt-3 mb-1">
                          {children}
                        </h4>
                      ),
                      p: ({ children }) => (
                        <p className="text-sm text-text-secondary dark:text-slate-300 mb-2 leading-relaxed">
                          {children}
                        </p>
                      ),
                      ul: ({ children }) => (
                        <ul className="list-disc list-inside space-y-1 text-sm text-text-secondary dark:text-slate-300 mb-3">
                          {children}
                        </ul>
                      ),
                      li: ({ children }) => (
                        <li className="text-sm text-text-secondary dark:text-slate-300">
                          {children}
                        </li>
                      ),
                      strong: ({ children }) => (
                        <strong className="font-semibold text-text dark:text-white">
                          {children}
                        </strong>
                      ),
                    }}
                  >
                    {analysisResult}
                  </ReactMarkdown>
                </div>
              </div>
            )}

            {/* 초기 상태 (분석 전) */}
            {!analysisResult && !analysisError && !isAnalyzing && !isLoadingLast && (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="size-16 rounded-full bg-surface dark:bg-background-dark flex items-center justify-center mb-4">
                  <Icon name="analytics" size="lg" className="text-text-secondary" />
                </div>
                <p className="text-sm text-text-secondary mb-1">
                  아직 분석 결과가 없습니다
                </p>
                <p className="text-xs text-text-secondary/60">
                  &ldquo;분석요청&rdquo; 버튼을 클릭하면 AI가 멤버별 업무 부하를 분석합니다
                </p>
                <div className="flex flex-wrap items-center justify-center gap-4 mt-4 text-xs text-text-secondary/60">
                  <div className="flex items-center gap-1">
                    <Icon name="check_circle" size="xs" className="text-success" />
                    <span>대기중/진행중 태스크 분석</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Icon name="check_circle" size="xs" className="text-success" />
                    <span>하루 8시간 근무 기준</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Icon name="check_circle" size="xs" className="text-success" />
                    <span>업무 재분배 제안</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

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
