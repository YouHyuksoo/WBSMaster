/**
 * @file src/app/dashboard/kanban/components/TaskNode.tsx
 * @description
 * React Flow 커스텀 노드 컴포넌트 (태스크용)
 * 태스크 노드를 렌더링하고 연결 핸들을 제공합니다.
 *
 * 초보자 가이드:
 * 1. **Handle**: React Flow의 연결 포인트 (source: 출발, target: 도착)
 * 2. **data.task**: 태스크 정보 (제목, 상태, 우선순위, 담당자)
 * 3. **data.isSelected**: 선택 상태 (부모에서 전달)
 */

import { memo, useState } from "react";
import { Handle, Position, NodeProps } from "reactflow";
import { Task } from "@/lib/api";

/** 상태별 스타일 설정 */
const STATUS_CONFIG: Record<string, { label: string; color: string; bgColor: string; borderColor: string }> = {
  PENDING: { label: "대기", color: "text-slate-500", bgColor: "bg-slate-100 dark:bg-slate-700", borderColor: "border-slate-300 dark:border-slate-600" },
  IN_PROGRESS: { label: "진행", color: "text-blue-500", bgColor: "bg-blue-100 dark:bg-blue-900/50", borderColor: "border-blue-400 dark:border-blue-600" },
  HOLDING: { label: "보류", color: "text-amber-500", bgColor: "bg-amber-100 dark:bg-amber-900/50", borderColor: "border-amber-400 dark:border-amber-600" },
  DELAYED: { label: "지연", color: "text-orange-500", bgColor: "bg-orange-100 dark:bg-orange-900/50", borderColor: "border-orange-400 dark:border-orange-600" },
  COMPLETED: { label: "완료", color: "text-emerald-500", bgColor: "bg-emerald-100 dark:bg-emerald-900/50", borderColor: "border-emerald-400 dark:border-emerald-600" },
  CANCELLED: { label: "취소", color: "text-red-500", bgColor: "bg-red-100 dark:bg-red-900/50", borderColor: "border-red-400 dark:border-red-600" },
};

/** 우선순위별 스타일 설정 */
const PRIORITY_CONFIG: Record<string, { label: string; color: string; bgColor: string }> = {
  LOW: { label: "낮음", color: "text-slate-400", bgColor: "bg-slate-50 dark:bg-slate-800" },
  MEDIUM: { label: "보통", color: "text-blue-400", bgColor: "bg-blue-50 dark:bg-blue-900/30" },
  HIGH: { label: "높음", color: "text-red-400", bgColor: "bg-red-50 dark:bg-red-900/30" },
};

/** 노드 데이터 타입 */
interface TaskNodeData {
  task: Task;
  isSelected: boolean;
  onRemove?: (nodeId: string) => void;
  onOpenSidebar?: (nodeId: string) => void;
}

/**
 * 태스크 커스텀 노드 컴포넌트
 */
export const TaskNode = memo(({ data }: NodeProps<TaskNodeData>) => {
  const { task, isSelected, onRemove, onOpenSidebar } = data;
  const statusInfo = STATUS_CONFIG[task.status] || STATUS_CONFIG.PENDING;
  const priorityInfo = PRIORITY_CONFIG[task.priority] || PRIORITY_CONFIG.MEDIUM;
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div
      className={`
        px-4 py-3 rounded-xl border-2 shadow-lg min-w-[280px] max-w-[320px]
        bg-white dark:bg-surface-dark cursor-pointer relative
        ${isSelected ? "ring-2 ring-primary animate-pulse-subtle" : "hover:shadow-xl"}
        ${statusInfo.borderColor}
      `}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onContextMenu={(e) => e.preventDefault()}
    >
      {/* 호버 시 액션 버튼 */}
      {isHovered && (
        <div className="absolute -top-3 -right-3 flex gap-1 z-10">
          {/* 속성보기 버튼 */}
          {onOpenSidebar && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onOpenSidebar(task.id);
              }}
              className="size-7 rounded-full bg-primary hover:bg-primary-hover text-white flex items-center justify-center shadow-lg transition-all hover:scale-110"
              title="속성 보기"
            >
              <span className="material-symbols-outlined" style={{ fontSize: 16 }}>
                edit
              </span>
            </button>
          )}
          {/* 캔버스에서 제거 버튼 */}
          {onRemove && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onRemove(task.id);
              }}
              className="size-7 rounded-full bg-error hover:bg-error/90 text-white flex items-center justify-center shadow-lg transition-all hover:scale-110"
              title="캔버스에서 제거"
            >
              <span className="material-symbols-outlined" style={{ fontSize: 16 }}>
                close
              </span>
            </button>
          )}
        </div>
      )}

      {/* 연결 핸들들 - 각 방향마다 하나씩 */}
      <Handle
        id="top"
        type="source"
        position={Position.Top}
        className="!bg-primary !w-3 !h-3 !border-2 !border-white dark:!border-surface-dark"
      />
      <Handle
        id="right"
        type="source"
        position={Position.Right}
        className="!bg-primary !w-3 !h-3 !border-2 !border-white dark:!border-surface-dark"
      />
      <Handle
        id="bottom"
        type="source"
        position={Position.Bottom}
        className="!bg-primary !w-3 !h-3 !border-2 !border-white dark:!border-surface-dark"
      />
      <Handle
        id="left"
        type="source"
        position={Position.Left}
        className="!bg-primary !w-3 !h-3 !border-2 !border-white dark:!border-surface-dark"
      />

      {/* 헤더: 상태 + 우선순위 */}
      <div className="flex items-center justify-between mb-2">
        <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full ${statusInfo.bgColor}`}>
          <span className={`text-xs font-bold ${statusInfo.color}`}>
            {statusInfo.label}
          </span>
        </div>
        <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full ${priorityInfo.bgColor}`}>
          <span className="material-symbols-outlined" style={{ fontSize: 12 }}>
            flag
          </span>
          <span className={`text-xs font-medium ${priorityInfo.color}`}>
            {priorityInfo.label}
          </span>
        </div>
      </div>

      {/* 태스크 제목 */}
      <h4 className="text-sm font-semibold text-text dark:text-white mb-2 line-clamp-2">
        {task.title}
      </h4>

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
    </div>
  );
});

TaskNode.displayName = "TaskNode";
