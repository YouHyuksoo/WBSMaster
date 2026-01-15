/**
 * @file src/app/dashboard/kanban/components/TaskListPanel.tsx
 * @description
 * 좌측 태스크 목록 패널 컴포넌트
 * 대기 및 진행중 태스크 목록을 표시하고 캔버스로 드래그할 수 있습니다.
 *
 * 초보자 가이드:
 * 1. **태스크 목록**: 대기/진행중 상태의 태스크만 표시
 * 2. **드래그**: 태스크를 캔버스로 드래그하여 배치
 * 3. **클릭**: 태스크 클릭 시 캔버스에서 선택 또는 상세 보기
 */

"use client";

import { useMemo, useRef, useEffect, useState } from "react";
import { Task } from "@/lib/api";

/** 필터 타입 */
type FilterType = "ALL" | "PENDING" | "IN_PROGRESS";

/** 상태별 스타일 설정 */
const STATUS_CONFIG: Record<string, { label: string; icon: string; color: string; bgColor: string }> = {
  PENDING: { label: "대기", icon: "pending", color: "text-slate-500", bgColor: "bg-slate-100 dark:bg-slate-700" },
  IN_PROGRESS: { label: "진행", icon: "play_circle", color: "text-blue-500", bgColor: "bg-blue-100 dark:bg-blue-900/50" },
  HOLDING: { label: "보류", icon: "pause_circle", color: "text-amber-500", bgColor: "bg-amber-100 dark:bg-amber-900/50" },
  DELAYED: { label: "지연", icon: "warning", color: "text-orange-500", bgColor: "bg-orange-100 dark:bg-orange-900/50" },
  COMPLETED: { label: "완료", icon: "check_circle", color: "text-emerald-500", bgColor: "bg-emerald-100 dark:bg-emerald-900/50" },
  CANCELLED: { label: "취소", icon: "cancel", color: "text-red-500", bgColor: "bg-red-100 dark:bg-red-900/50" },
};

/** 우선순위별 스타일 설정 */
const PRIORITY_CONFIG: Record<string, { label: string; color: string; bgColor: string }> = {
  LOW: { label: "낮음", color: "text-slate-400", bgColor: "bg-slate-50 dark:bg-slate-800" },
  MEDIUM: { label: "보통", color: "text-blue-400", bgColor: "bg-blue-50 dark:bg-blue-900/30" },
  HIGH: { label: "높음", color: "text-red-400", bgColor: "bg-red-50 dark:bg-red-900/30" },
};

/** Props 타입 */
interface TaskListPanelProps {
  tasks: Task[];
  selectedId: string | null;
  onSelectTask: (id: string) => void;
  onClose?: () => void;
}

/**
 * 태스크 목록 패널 컴포넌트
 */
export function TaskListPanel({
  tasks,
  selectedId,
  onSelectTask,
  onClose,
}: TaskListPanelProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const [filter, setFilter] = useState<FilterType>("ALL");

  // 외부 클릭 감지
  useEffect(() => {
    if (!onClose) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    const timer = setTimeout(() => {
      document.addEventListener("mousedown", handleClickOutside);
    }, 100);

    return () => {
      clearTimeout(timer);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [onClose]);

  // 상태별 통계 (필터 적용 전 전체 기준)
  const stats = useMemo(() => {
    const counts = {
      ALL: 0,
      PENDING: 0,
      IN_PROGRESS: 0,
    };

    tasks.forEach((task) => {
      if (task.status === "PENDING") {
        counts.PENDING++;
        counts.ALL++;
      }
      if (task.status === "IN_PROGRESS") {
        counts.IN_PROGRESS++;
        counts.ALL++;
      }
    });

    return counts;
  }, [tasks]);

  // 필터 + 우선순위순 정렬
  const filteredTasks = useMemo(() => {
    const priorityOrder = { HIGH: 0, MEDIUM: 1, LOW: 2 };
    return tasks
      .filter((task) => {
        // 필터에 따라 분기
        if (filter === "ALL") {
          return task.status === "PENDING" || task.status === "IN_PROGRESS";
        }
        return task.status === filter;
      })
      .sort((a, b) => {
        const aPriority = priorityOrder[a.priority as keyof typeof priorityOrder] ?? 1;
        const bPriority = priorityOrder[b.priority as keyof typeof priorityOrder] ?? 1;
        return aPriority - bPriority;
      });
  }, [tasks, filter]);

  return (
    <div
      ref={panelRef}
      className="w-80 border-r border-border dark:border-border-dark bg-background-white dark:bg-surface-dark flex flex-col h-full"
    >
      {/* 헤더 */}
      <div className="p-4 border-b border-border dark:border-border-dark">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-text dark:text-white">태스크 목록</h2>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="text-text-secondary hover:text-text dark:hover:text-white transition-colors"
              title="패널 닫기"
            >
              <span className="material-symbols-outlined" style={{ fontSize: 20 }}>
                chevron_left
              </span>
            </button>
          )}
        </div>

        {/* 필터 버튼 */}
        <div className="flex items-center gap-1 p-1 bg-surface dark:bg-background-dark rounded-lg">
          <button
            onClick={() => setFilter("ALL")}
            className={`flex-1 flex items-center justify-center gap-1 px-2 py-1.5 rounded-md text-xs font-medium transition-colors ${
              filter === "ALL"
                ? "bg-background-white dark:bg-surface-dark text-primary shadow-sm"
                : "text-text-secondary hover:text-text dark:hover:text-white"
            }`}
          >
            <span>전체</span>
            <span className={`px-1.5 py-0.5 rounded text-[10px] ${
              filter === "ALL" ? "bg-primary/10 text-primary" : "bg-surface dark:bg-background-dark"
            }`}>
              {stats.ALL}
            </span>
          </button>
          <button
            onClick={() => setFilter("PENDING")}
            className={`flex-1 flex items-center justify-center gap-1 px-2 py-1.5 rounded-md text-xs font-medium transition-colors ${
              filter === "PENDING"
                ? "bg-background-white dark:bg-surface-dark text-slate-500 shadow-sm"
                : "text-text-secondary hover:text-text dark:hover:text-white"
            }`}
          >
            <span>대기</span>
            <span className={`px-1.5 py-0.5 rounded text-[10px] ${
              filter === "PENDING" ? "bg-slate-100 dark:bg-slate-700 text-slate-500" : "bg-surface dark:bg-background-dark"
            }`}>
              {stats.PENDING}
            </span>
          </button>
          <button
            onClick={() => setFilter("IN_PROGRESS")}
            className={`flex-1 flex items-center justify-center gap-1 px-2 py-1.5 rounded-md text-xs font-medium transition-colors ${
              filter === "IN_PROGRESS"
                ? "bg-background-white dark:bg-surface-dark text-blue-500 shadow-sm"
                : "text-text-secondary hover:text-text dark:hover:text-white"
            }`}
          >
            <span>진행</span>
            <span className={`px-1.5 py-0.5 rounded text-[10px] ${
              filter === "IN_PROGRESS" ? "bg-blue-100 dark:bg-blue-900/50 text-blue-500" : "bg-surface dark:bg-background-dark"
            }`}>
              {stats.IN_PROGRESS}
            </span>
          </button>
        </div>

        <p className="text-xs text-text-secondary mt-2">
          태스크를 캔버스로 드래그하세요
        </p>
      </div>

      {/* 태스크 목록 */}
      <div className="flex-1 overflow-y-auto">
        {filteredTasks.length === 0 ? (
          <div className="p-8 text-center">
            <span className="material-symbols-outlined text-text-secondary mb-2" style={{ fontSize: 48 }}>
              task_alt
            </span>
            <p className="text-sm text-text-secondary">
              {filter === "ALL" && "대기/진행중 태스크가 없습니다."}
              {filter === "PENDING" && "대기중인 태스크가 없습니다."}
              {filter === "IN_PROGRESS" && "진행중인 태스크가 없습니다."}
            </p>
          </div>
        ) : (
          <div className="p-2 space-y-2">
            {filteredTasks.map((task) => {
              const statusInfo = STATUS_CONFIG[task.status] || STATUS_CONFIG.PENDING;
              const priorityInfo = PRIORITY_CONFIG[task.priority] || PRIORITY_CONFIG.MEDIUM;
              const isSelected = selectedId === task.id;
              const isOnCanvas = task.flowX !== 0 || task.flowY !== 0;

              return (
                <button
                  key={task.id}
                  draggable={!isOnCanvas}
                  onDragStart={(e) => {
                    if (isOnCanvas) {
                      e.preventDefault();
                      return;
                    }
                    e.dataTransfer.setData("application/task", task.id);
                    e.dataTransfer.effectAllowed = "move";
                  }}
                  onClick={() => onSelectTask(task.id)}
                  className={`
                    w-full text-left p-3 rounded-lg border-2 transition-all
                    ${isOnCanvas ? "cursor-pointer" : "cursor-grab active:cursor-grabbing"}
                    ${isSelected
                      ? "border-primary bg-primary/10 shadow-md"
                      : isOnCanvas
                        ? "border-success/50 bg-success/5 hover:bg-success/10"
                        : "border-border dark:border-border-dark hover:border-primary/50 hover:bg-surface dark:hover:bg-background-dark"
                    }
                  `}
                >
                  {/* 상단: 상태 + 우선순위 */}
                  <div className="flex items-center justify-between mb-2">
                    <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full ${statusInfo.bgColor}`}>
                      <span className="material-symbols-outlined" style={{ fontSize: 12 }}>
                        {statusInfo.icon}
                      </span>
                      <span className={`text-[10px] font-bold ${statusInfo.color}`}>
                        {statusInfo.label}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      {isOnCanvas && (
                        <div className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-success/10">
                          <span className="material-symbols-outlined text-success" style={{ fontSize: 10 }}>
                            check
                          </span>
                          <span className="text-[9px] font-medium text-success">배치됨</span>
                        </div>
                      )}
                      <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full ${priorityInfo.bgColor}`}>
                        <span className="material-symbols-outlined" style={{ fontSize: 10 }}>
                          flag
                        </span>
                        <span className={`text-[10px] font-medium ${priorityInfo.color}`}>
                          {priorityInfo.label}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* 태스크 제목 */}
                  <h3 className="text-sm font-semibold text-text dark:text-white mb-2 line-clamp-2">
                    {task.title}
                  </h3>

                  {/* 담당자 */}
                  {task.assignee && (
                    <div className="flex items-center gap-2 text-xs text-text-secondary">
                      {task.assignee.avatar ? (
                        <img
                          src={task.assignee.avatar}
                          alt={task.assignee.name || ""}
                          className="size-5 rounded-full object-cover"
                        />
                      ) : (
                        <div className="size-5 rounded-full bg-primary/80 flex items-center justify-center text-[10px] font-bold text-white">
                          {task.assignee.name?.charAt(0) || "?"}
                        </div>
                      )}
                      <span className="truncate">{task.assignee.name || "알 수 없음"}</span>
                    </div>
                  )}

                  {/* 기간 */}
                  {(task.startDate || task.dueDate) && (
                    <div className="flex items-center gap-1 mt-2 text-xs text-text-secondary">
                      <span className="material-symbols-outlined" style={{ fontSize: 14 }}>
                        calendar_month
                      </span>
                      <span>
                        {task.startDate && new Date(task.startDate).toLocaleDateString("ko-KR", { month: "short", day: "numeric" })}
                        {task.startDate && task.dueDate && " ~ "}
                        {task.dueDate && new Date(task.dueDate).toLocaleDateString("ko-KR", { month: "short", day: "numeric" })}
                      </span>
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* 하단 통계 */}
      <div className="p-3 border-t border-border dark:border-border-dark">
        <div className="flex items-center justify-between text-xs text-text-secondary">
          <div className="flex items-center gap-1">
            <span className="material-symbols-outlined" style={{ fontSize: 14 }}>
              filter_list
            </span>
            <span>
              {filter === "ALL" && "전체"}
              {filter === "PENDING" && "대기중"}
              {filter === "IN_PROGRESS" && "진행중"}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span>표시: {filteredTasks.length}개</span>
            <span className="text-success">
              배치됨: {filteredTasks.filter(t => t.flowX !== 0 || t.flowY !== 0).length}개
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
