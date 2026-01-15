/**
 * @file src/app/dashboard/kanban/components/TaskFlowSidebar.tsx
 * @description
 * 태스크 상세 정보 우측 사이드바 컴포넌트
 * 선택된 태스크의 정보를 표시하고 편집합니다.
 *
 * 초보자 가이드:
 * 1. **기본 정보**: 제목, 상태, 우선순위, 담당자, 기간 등 편집
 * 2. **저장/취소**: 변경사항 저장 또는 사이드바 닫기
 */

"use client";

import { useState, useRef, useEffect } from "react";
import { Task } from "@/lib/api";
import { useUpdateTask, useDeleteTask } from "@/hooks/useTasks";
import { useMembers } from "@/hooks/useMembers";

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
interface TaskFlowSidebarProps {
  task: Task;
  projectId: string;
  onClose: () => void;
}

/**
 * 태스크 상세 사이드바 컴포넌트
 */
export function TaskFlowSidebar({ task, projectId, onClose }: TaskFlowSidebarProps) {
  const [editData, setEditData] = useState(task);
  const sidebarRef = useRef<HTMLDivElement>(null);

  const updateTask = useUpdateTask();
  const deleteTask = useDeleteTask();
  const { data: members = [] } = useMembers({ projectId });

  // task prop 변경 시 editData 업데이트
  useEffect(() => {
    setEditData(task);
  }, [task.id]);

  // 외부 클릭 감지
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (sidebarRef.current && !sidebarRef.current.contains(event.target as Node)) {
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

  const handleSave = async () => {
    await updateTask.mutateAsync({
      id: task.id,
      data: {
        title: editData.title,
        description: editData.description,
        status: editData.status,
        priority: editData.priority,
        assigneeId: editData.assigneeId,
        startDate: editData.startDate,
        dueDate: editData.dueDate,
      },
    });
    onClose();
  };

  const handleDelete = async () => {
    if (!confirm("정말 이 태스크를 삭제하시겠습니까?")) return;
    await deleteTask.mutateAsync(task.id);
    onClose();
  };

  return (
    <div
      ref={sidebarRef}
      className="w-[380px] border-l border-border dark:border-border-dark bg-background-white dark:bg-surface-dark flex flex-col h-full overflow-hidden animate-slide-in-right shadow-2xl"
    >
      {/* 헤더 */}
      <div className="p-4 border-b border-border dark:border-border-dark">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-text dark:text-white">태스크 상세</h2>
          <button
            onClick={onClose}
            className="text-text-secondary hover:text-text dark:hover:text-white transition-colors"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
      </div>

      {/* 본문 */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* 태스크 제목 */}
        <div>
          <label className="block text-xs font-medium text-text dark:text-white mb-1">
            제목
          </label>
          <input
            type="text"
            value={editData.title}
            onChange={(e) => setEditData({ ...editData, title: e.target.value })}
            className="w-full px-3 py-2 rounded-lg bg-surface dark:bg-background-dark border border-border dark:border-border-dark text-sm text-text dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        {/* 상태 + 우선순위 */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-text dark:text-white mb-1">
              상태
            </label>
            <select
              value={editData.status}
              onChange={(e) => setEditData({ ...editData, status: e.target.value as Task["status"] })}
              className="w-full px-3 py-2 rounded-lg bg-surface dark:bg-background-dark border border-border dark:border-border-dark text-sm text-text dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
            >
              {Object.entries(STATUS_CONFIG).map(([key, config]) => (
                <option key={key} value={key}>
                  {config.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-text dark:text-white mb-1">
              우선순위
            </label>
            <select
              value={editData.priority}
              onChange={(e) => setEditData({ ...editData, priority: e.target.value as Task["priority"] })}
              className="w-full px-3 py-2 rounded-lg bg-surface dark:bg-background-dark border border-border dark:border-border-dark text-sm text-text dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
            >
              {Object.entries(PRIORITY_CONFIG).map(([key, config]) => (
                <option key={key} value={key}>
                  {config.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* 담당자 */}
        <div>
          <label className="block text-xs font-medium text-text dark:text-white mb-1">
            담당자
          </label>
          <select
            value={editData.assigneeId || ""}
            onChange={(e) => setEditData({ ...editData, assigneeId: e.target.value || null })}
            className="w-full px-3 py-2 rounded-lg bg-surface dark:bg-background-dark border border-border dark:border-border-dark text-sm text-text dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="">담당자 없음</option>
            {members.map((member) => (
              <option key={member.id} value={member.user?.id || member.id}>
                {member.user?.name || member.user?.email || "알 수 없음"}
              </option>
            ))}
          </select>
        </div>

        {/* 기간 */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-text dark:text-white mb-1">
              시작일
            </label>
            <input
              type="date"
              value={editData.startDate ? new Date(editData.startDate).toISOString().split("T")[0] : ""}
              onChange={(e) => setEditData({ ...editData, startDate: e.target.value || undefined })}
              className="w-full px-3 py-2 rounded-lg bg-surface dark:bg-background-dark border border-border dark:border-border-dark text-sm text-text dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-text dark:text-white mb-1">
              마감일
            </label>
            <input
              type="date"
              value={editData.dueDate ? new Date(editData.dueDate).toISOString().split("T")[0] : ""}
              onChange={(e) => setEditData({ ...editData, dueDate: e.target.value || undefined })}
              className="w-full px-3 py-2 rounded-lg bg-surface dark:bg-background-dark border border-border dark:border-border-dark text-sm text-text dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
        </div>

        {/* 설명 */}
        <div>
          <label className="block text-xs font-medium text-text dark:text-white mb-1">
            설명
          </label>
          <textarea
            value={editData.description || ""}
            onChange={(e) => setEditData({ ...editData, description: e.target.value })}
            rows={4}
            className="w-full px-3 py-2 rounded-lg bg-surface dark:bg-background-dark border border-border dark:border-border-dark text-sm text-text dark:text-white focus:outline-none focus:ring-2 focus:ring-primary resize-none"
            placeholder="태스크에 대한 설명을 입력하세요..."
          />
        </div>

        {/* 연결된 정보 */}
        {(task.requirement || task.wbsItem) && (
          <div className="border border-border dark:border-border-dark rounded-lg p-3">
            <h3 className="text-xs font-semibold text-text dark:text-white mb-2 flex items-center gap-1">
              <span className="material-symbols-outlined" style={{ fontSize: 14 }}>
                link
              </span>
              연결된 항목
            </h3>
            <div className="space-y-2">
              {task.requirement && (
                <div className="flex items-center gap-2 text-xs text-text-secondary">
                  <span className="material-symbols-outlined" style={{ fontSize: 14 }}>
                    checklist
                  </span>
                  <span className="truncate">요구사항: {task.requirement.title}</span>
                </div>
              )}
              {task.wbsItem && (
                <div className="flex items-center gap-2 text-xs text-text-secondary">
                  <span className="material-symbols-outlined" style={{ fontSize: 14 }}>
                    account_tree
                  </span>
                  <span className="truncate">WBS: {task.wbsItem.name}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 캔버스 위치 정보 */}
        {(task.flowX !== 0 || task.flowY !== 0) && (
          <div className="border border-success/30 bg-success/5 rounded-lg p-3">
            <h3 className="text-xs font-semibold text-success mb-2 flex items-center gap-1">
              <span className="material-symbols-outlined" style={{ fontSize: 14 }}>
                grid_on
              </span>
              캔버스 위치
            </h3>
            <div className="text-xs text-text-secondary">
              X: {Math.round(task.flowX)}, Y: {Math.round(task.flowY)}
            </div>
          </div>
        )}
      </div>

      {/* 푸터 */}
      <div className="p-4 border-t border-border dark:border-border-dark flex gap-2">
        <button
          onClick={handleDelete}
          className="px-4 py-2 bg-error hover:bg-error/90 text-white rounded-lg transition-colors"
        >
          삭제
        </button>
        <button
          onClick={onClose}
          className="flex-1 px-4 py-2 bg-surface dark:bg-background-dark hover:bg-surface-hover dark:hover:bg-background-dark/80 text-text dark:text-white rounded-lg transition-colors"
        >
          취소
        </button>
        <button
          onClick={handleSave}
          className="flex-1 px-4 py-2 bg-primary hover:bg-primary-hover text-white rounded-lg transition-colors"
          disabled={updateTask.isPending}
        >
          {updateTask.isPending ? "저장 중..." : "저장"}
        </button>
      </div>
    </div>
  );
}
