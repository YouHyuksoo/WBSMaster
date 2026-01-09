/**
 * @file src/app/dashboard/components/TaskStatsSection.tsx
 * @description
 * TASK 현황 섹션 컴포넌트입니다.
 * React.memo로 감싸서 props가 변경되지 않으면 리렌더링하지 않습니다.
 */

"use client";

import React, { memo, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/ui";

/**
 * Task 타입 (필요한 필드만)
 */
interface TaskData {
  id: string;
  status: string;
  dueDate?: string | null;
  assignee?: {
    id: string;
    name?: string;
    avatar?: string;
  } | null;
  assignees?: Array<{
    id?: string;
    userId?: string;
    name?: string;
    avatar?: string;
  }>;
}

interface TaskStatsSectionProps {
  /** 태스크 목록 */
  tasks: TaskData[];
}

/**
 * TASK 현황 섹션 컴포넌트
 */
const TaskStatsSection = memo(function TaskStatsSection({
  tasks,
}: TaskStatsSectionProps) {
  const router = useRouter();

  /** 담당자별 TASK 통계 계산 */
  const { assigneeStats, totals } = useMemo(() => {
    const assigneeMap = new Map<string, {
      id: string;
      name: string;
      avatar?: string;
      pending: number;
      inProgress: number;
      completed: number;
      delayed: number;
    }>();

    tasks.forEach((task) => {
      const primaryAssignee = task.assignee || (task.assignees && task.assignees.length > 0 ? task.assignees[0] : null);
      const assigneeId = primaryAssignee?.id || "unassigned";
      const assigneeName = primaryAssignee?.name || "미할당";
      const assigneeAvatar = primaryAssignee?.avatar;

      if (!assigneeMap.has(assigneeId)) {
        assigneeMap.set(assigneeId, {
          id: assigneeId,
          name: assigneeName,
          avatar: assigneeAvatar,
          pending: 0,
          inProgress: 0,
          completed: 0,
          delayed: 0,
        });
      }

      const assignee = assigneeMap.get(assigneeId)!;

      if (task.status === "PENDING") assignee.pending++;
      else if (task.status === "IN_PROGRESS") assignee.inProgress++;
      else if (task.status === "COMPLETED") assignee.completed++;
      else if (task.status === "DELAYED") assignee.delayed++;

      // 마감일 지났는데 완료 안된 경우 추가 지연 체크
      if (task.status !== "DELAYED" && task.dueDate && new Date(task.dueDate) < new Date() && task.status !== "COMPLETED") {
        assignee.delayed++;
      }
    });

    const totals = {
      pending: tasks.filter((t) => t.status === "PENDING").length,
      inProgress: tasks.filter((t) => t.status === "IN_PROGRESS").length,
      completed: tasks.filter((t) => t.status === "COMPLETED").length,
      delayed: tasks.filter((t) => t.status === "DELAYED" || (t.dueDate && new Date(t.dueDate) < new Date() && t.status !== "COMPLETED")).length,
    };

    return {
      assigneeStats: Array.from(assigneeMap.values()),
      totals,
    };
  }, [tasks]);

  return (
    <div
      onClick={() => router.push("/dashboard/kanban")}
      className="bg-background-white dark:bg-surface-dark border border-border dark:border-border-dark rounded-xl p-4 cursor-pointer group/task hover:border-primary/50 hover:shadow-lg hover:shadow-primary/10 hover:scale-[1.01] transition-all duration-300"
    >
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-bold text-text dark:text-white group-hover/task:text-primary transition-colors">TASK 현황</h3>
        <span className="text-xs text-primary group-hover/task:text-primary-hover flex items-center gap-1">
          전체보기
          <Icon name="arrow_forward" size="xs" className="group-hover/task:translate-x-0.5 transition-transform" />
        </span>
      </div>

      {/* 테이블 헤더 */}
      <div className="grid grid-cols-5 gap-2 text-[10px] font-semibold text-text-secondary uppercase tracking-wider mb-2 pb-2 border-b border-border dark:border-border-dark">
        <div>담당자</div>
        <div className="text-center">대기</div>
        <div className="text-center">진행</div>
        <div className="text-center">완료</div>
        <div className="text-center">지연</div>
      </div>

      {/* 담당자별 목록 */}
      <div className="space-y-1.5 max-h-[280px] overflow-y-auto">
        {assigneeStats.length === 0 ? (
          <div className="text-center py-6 text-text-secondary text-xs">
            등록된 TASK가 없습니다
          </div>
        ) : (
          assigneeStats.map((assignee) => (
            <div
              key={assignee.id}
              className="grid grid-cols-5 gap-2 items-center py-1.5 hover:bg-surface dark:hover:bg-background-dark rounded-lg px-1 transition-colors"
            >
              {/* 담당자 */}
              <div className="flex items-center gap-2 min-w-0">
                {assignee.avatar ? (
                  <img
                    src={assignee.avatar}
                    alt={assignee.name}
                    className="size-5 rounded-full object-cover shrink-0"
                  />
                ) : (
                  <div className="size-5 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                    <span className="text-[9px] font-bold text-primary">
                      {assignee.id === "unassigned" ? "?" : assignee.name.charAt(0)}
                    </span>
                  </div>
                )}
                <span className="text-xs text-text dark:text-white truncate font-medium">
                  {assignee.name}
                </span>
              </div>

              {/* 대기 */}
              <div className="text-center">
                <span className={`text-xs font-bold ${assignee.pending > 0 ? "text-slate-500" : "text-slate-300 dark:text-slate-600"}`}>
                  {assignee.pending}
                </span>
              </div>

              {/* 진행 */}
              <div className="text-center">
                <span className={`text-xs font-bold ${assignee.inProgress > 0 ? "text-sky-500" : "text-slate-300 dark:text-slate-600"}`}>
                  {assignee.inProgress}
                </span>
              </div>

              {/* 완료 */}
              <div className="text-center">
                <span className={`text-xs font-bold ${assignee.completed > 0 ? "text-emerald-500" : "text-slate-300 dark:text-slate-600"}`}>
                  {assignee.completed}
                </span>
              </div>

              {/* 지연 */}
              <div className="text-center">
                <span className={`text-xs font-bold ${assignee.delayed > 0 ? "text-rose-500" : "text-slate-300 dark:text-slate-600"}`}>
                  {assignee.delayed}
                </span>
              </div>
            </div>
          ))
        )}
      </div>

      {/* 합계 */}
      <div className="grid grid-cols-5 gap-2 items-center mt-2 pt-2 border-t border-border dark:border-border-dark">
        <div className="text-xs font-bold text-text dark:text-white">합계</div>
        <div className="text-center text-xs font-bold text-slate-500">{totals.pending}</div>
        <div className="text-center text-xs font-bold text-sky-500">{totals.inProgress}</div>
        <div className="text-center text-xs font-bold text-emerald-500">{totals.completed}</div>
        <div className="text-center text-xs font-bold text-rose-500">{totals.delayed}</div>
      </div>
    </div>
  );
});

export default TaskStatsSection;
