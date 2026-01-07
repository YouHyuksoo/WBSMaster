/**
 * @file src/app/dashboard/kanban/page.tsx
 * @description
 * 칸반 보드 페이지입니다.
 * 작업을 상태별로 컬럼에 나누어 시각화하고 드래그 앤 드롭으로 상태 변경이 가능합니다.
 *
 * 초보자 가이드:
 * 1. **Column**: 대기중, 진행중, 완료 등의 상태 컬럼
 * 2. **Task Card**: 각 작업을 나타내는 카드
 * 3. **Drag & Drop**: @dnd-kit을 사용하여 작업을 다른 컬럼으로 드래그
 *
 * 수정 방법:
 * - 컬럼 추가: columns 배열에 새 컬럼 추가
 * - 작업 추가: API를 통해 새 작업 생성
 */

"use client";

import { useState, FormEvent } from "react";
import {
  DndContext,
  DragEndEvent,
  DragOverEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Icon, Button, Input } from "@/components/ui";
import { useTasks, useCreateTask, useUpdateTask, useMembers, useRequirements } from "@/hooks";
import { useProject } from "@/contexts";
import type { Task } from "@/lib/api";

/** 컬럼 설정 */
interface ColumnConfig {
  id: "PENDING" | "IN_PROGRESS" | "HOLDING" | "COMPLETED" | "CANCELLED";
  title: string;
  titleKo: string;
  color: string;
  bgColor: string;
}

/** 컬럼 설정 */
const columns: ColumnConfig[] = [
  { id: "PENDING", title: "Pending", titleKo: "대기중", color: "border-t-slate-400", bgColor: "bg-slate-100 dark:bg-slate-700" },
  { id: "IN_PROGRESS", title: "In Progress", titleKo: "진행중", color: "border-t-primary", bgColor: "bg-primary/20" },
  { id: "HOLDING", title: "Holding", titleKo: "홀딩", color: "border-t-amber-500", bgColor: "bg-amber-100 dark:bg-amber-900/30" },
  { id: "COMPLETED", title: "Completed", titleKo: "완료", color: "border-t-success", bgColor: "bg-success/20" },
  { id: "CANCELLED", title: "Cancelled", titleKo: "취소", color: "border-t-red-500", bgColor: "bg-red-100 dark:bg-red-900/30" },
];

/** 우선순위 설정 */
const priorityConfig: Record<string, { label: string; bgColor: string; textColor: string }> = {
  HIGH: { label: "HIGH", bgColor: "bg-orange-100 dark:bg-orange-900/30", textColor: "text-orange-600 dark:text-orange-400" },
  MEDIUM: { label: "MEDIUM", bgColor: "bg-blue-100 dark:bg-blue-900/30", textColor: "text-blue-600 dark:text-blue-400" },
  LOW: { label: "LOW", bgColor: "bg-slate-100 dark:bg-slate-700", textColor: "text-slate-600 dark:text-slate-300" },
};

/**
 * 칸반 보드 페이지
 */
export default function KanbanPage() {
  const [filter, setFilter] = useState<"all" | "my">("all");
  const [showNewTaskModal, setShowNewTaskModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [filterAssignee, setFilterAssignee] = useState<string>("all");
  const [filterPriority, setFilterPriority] = useState<string>("all");

  // 새 작업 폼 상태
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskDescription, setNewTaskDescription] = useState("");
  const [newTaskPriority, setNewTaskPriority] = useState("MEDIUM");
  const [newTaskDueDate, setNewTaskDueDate] = useState("");
  const [newTaskAssigneeIds, setNewTaskAssigneeIds] = useState<string[]>([]);
  const [newTaskRequirementId, setNewTaskRequirementId] = useState("");

  // 수정 모달 상태
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [editTaskAssigneeIds, setEditTaskAssigneeIds] = useState<string[]>([]);

  // 전역 프로젝트 선택 상태 (헤더에서 선택)
  const { selectedProjectId, selectedProject } = useProject();

  // API 연동
  const { data: tasks = [], isLoading, error } = useTasks(
    selectedProjectId ? { projectId: selectedProjectId } : undefined
  );
  const createTask = useCreateTask();
  const updateTask = useUpdateTask();

  // 프로젝트 팀 멤버 목록 조회
  const { data: teamMembers = [] } = useMembers(
    selectedProjectId ? { projectId: selectedProjectId } : undefined
  );

  // 프로젝트 요구사항 목록 조회
  const { data: requirements = [] } = useRequirements(
    selectedProjectId ? { projectId: selectedProjectId } : undefined
  );

  // 드래그 앤 드롭 센서 설정
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // 8px 이상 드래그해야 활성화
      },
    })
  );

  /**
   * 필터링된 작업 목록
   */
  const getFilteredTasks = (status: string) => {
    return tasks.filter((task) => {
      if (task.status !== status) return false;

      // 검색어 필터
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesSearch = task.title.toLowerCase().includes(query) ||
          (task.description?.toLowerCase().includes(query) ?? false);
        if (!matchesSearch) return false;
      }

      // 담당자 필터
      if (filterAssignee !== "all") {
        const hasAssignee = task.assignees?.some((a) => a.id === filterAssignee);
        if (!hasAssignee) return false;
      }

      // 우선순위 필터
      if (filterPriority !== "all" && task.priority !== filterPriority) {
        return false;
      }

      return true;
    });
  };

  /**
   * 새 작업 생성
   */
  const handleCreateTask = async (e: FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim() || !selectedProjectId) return;

    try {
      await createTask.mutateAsync({
        title: newTaskTitle,
        description: newTaskDescription || undefined,
        projectId: selectedProjectId,
        priority: newTaskPriority,
        dueDate: newTaskDueDate || undefined,
        assigneeIds: newTaskAssigneeIds.length > 0 ? newTaskAssigneeIds : undefined,
        requirementId: newTaskRequirementId || undefined, // 요구사항 연결
      });

      // 폼 초기화 및 모달 닫기
      setNewTaskTitle("");
      setNewTaskDescription("");
      setNewTaskPriority("MEDIUM");
      setNewTaskDueDate("");
      setNewTaskAssigneeIds([]);
      setNewTaskRequirementId(""); // 요구사항 ID 초기화
      setShowNewTaskModal(false);
    } catch (err) {
      console.error("작업 생성 실패:", err);
    }
  };

  /**
   * 작업 상태 변경
   */
  const handleStatusChange = async (taskId: string, newStatus: string) => {
    try {
      await updateTask.mutateAsync({
        id: taskId,
        data: { status: newStatus as Task["status"] },
      });
    } catch (err) {
      console.error("상태 변경 실패:", err);
    }
  };

  /**
   * 수정 모달 열기
   */
  const openEditModal = (task: Task) => {
    setEditingTask(task);
    setEditTaskAssigneeIds(task.assignees?.map((a) => a.id) || []);
  };

  /**
   * 작업 수정 핸들러
   */
  const handleEditTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTask) return;

    try {
      await updateTask.mutateAsync({
        id: editingTask.id,
        data: {
          title: editingTask.title,
          description: editingTask.description,
          status: editingTask.status,
          priority: editingTask.priority,
          dueDate: editingTask.dueDate,
          requirementId: editingTask.requirementId,
          assigneeIds: editTaskAssigneeIds,
        },
      });
      setEditingTask(null);
    } catch (err) {
      console.error("작업 수정 실패:", err);
    }
  };

  /**
   * 드래그 시작 핸들러
   */
  const handleDragStart = (event: DragStartEvent) => {
    const taskId = event.active.id as string;
    const task = tasks.find((t) => t.id === taskId);
    if (task) {
      setActiveTask(task);
    }
  };

  /**
   * 드래그 종료 핸들러
   */
  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveTask(null);

    if (!over) return;

    const taskId = active.id as string;
    const overId = over.id as string;

    // 컬럼 위에 드롭한 경우
    const targetColumn = columns.find((col) => col.id === overId);
    if (targetColumn) {
      const task = tasks.find((t) => t.id === taskId);
      if (task && task.status !== targetColumn.id) {
        await handleStatusChange(taskId, targetColumn.id);
      }
      return;
    }

    // 다른 작업 위에 드롭한 경우 - 해당 작업의 컬럼으로 이동
    const overTask = tasks.find((t) => t.id === overId);
    if (overTask) {
      const task = tasks.find((t) => t.id === taskId);
      if (task && task.status !== overTask.status) {
        await handleStatusChange(taskId, overTask.status);
      }
    }
  };

  /**
   * 드래그 오버 핸들러 (시각적 피드백용)
   */
  const handleDragOver = (event: DragOverEvent) => {
    // 필요시 추가 로직
  };

  // 로딩 상태
  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center bg-background dark:bg-background-dark">
        <div className="text-center">
          <Icon name="sync" size="lg" className="text-primary animate-spin mx-auto mb-4" />
          <p className="text-text-secondary">작업 목록을 불러오는 중...</p>
        </div>
      </div>
    );
  }

  // 에러 상태
  if (error) {
    return (
      <div className="h-full flex items-center justify-center bg-background dark:bg-background-dark">
        <div className="text-center">
          <Icon name="error" size="lg" className="text-error mx-auto mb-4" />
          <p className="text-text-secondary">작업 목록을 불러올 수 없습니다.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-background dark:bg-background-dark">
      {/* 상단 헤더 */}
      <div className="px-6 py-4 border-b border-border dark:border-border-dark bg-background-white dark:bg-surface-dark shrink-0">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-bold text-text">
              TASK Kanban Board
            </h1>
            {/* 현재 선택된 프로젝트 표시 */}
            {selectedProject && (
              <div className="flex items-center gap-2 px-3 py-1 rounded-lg bg-primary/10 border border-primary/20">
                <Icon name="folder" size="sm" className="text-primary" />
                <span className="text-sm font-medium text-primary">{selectedProject.name}</span>
              </div>
            )}
          </div>
          <div className="flex items-center gap-3">
            {/* 검색 */}
            <div className="hidden xl:flex items-center bg-surface dark:bg-background-dark rounded-lg px-3 py-2 w-64 border border-border dark:border-border-dark focus-within:ring-2 focus-within:ring-primary/50">
              <Icon name="search" size="sm" className="text-text-secondary" />
              <input
                className="bg-transparent border-none focus:ring-0 text-sm w-full text-text placeholder:text-text-secondary ml-2"
                placeholder="작업 검색..."
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Button
              variant="primary"
              size="sm"
              leftIcon="add"
              onClick={() => setShowNewTaskModal(true)}
              disabled={!selectedProjectId}
            >
              새 작업
            </Button>
          </div>
        </div>
      </div>

      {/* 필터 바 */}
      <div className="flex flex-wrap items-center justify-between gap-4 px-6 py-4 shrink-0">
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setFilter("all")}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
              filter === "all"
                ? "bg-primary/10 text-primary border border-primary/20"
                : "bg-background-white dark:bg-surface-dark border border-border dark:border-border-dark text-text-secondary hover:text-primary"
            }`}
          >
            전체 작업 ({tasks.length})
          </button>
          <button
            onClick={() => setFilter("my")}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
              filter === "my"
                ? "bg-primary/10 text-primary border border-primary/20"
                : "bg-background-white dark:bg-surface-dark border border-border dark:border-border-dark text-text-secondary hover:text-primary"
            }`}
          >
            내 작업
          </button>

          {/* 담당자 필터 */}
          <select
            value={filterAssignee}
            onChange={(e) => setFilterAssignee(e.target.value)}
            className="px-3 py-1.5 rounded-full text-sm bg-background-white dark:bg-surface-dark border border-border dark:border-border-dark text-text"
          >
            <option value="all">모든 담당자</option>
            {teamMembers.map((member) => (
              <option key={member.userId} value={member.userId}>
                {member.user?.name || member.user?.email || "알 수 없음"}
              </option>
            ))}
          </select>

          {/* 우선순위 필터 */}
          <select
            value={filterPriority}
            onChange={(e) => setFilterPriority(e.target.value)}
            className="px-3 py-1.5 rounded-full text-sm bg-background-white dark:bg-surface-dark border border-border dark:border-border-dark text-text"
          >
            <option value="all">모든 우선순위</option>
            <option value="HIGH">높음</option>
            <option value="MEDIUM">보통</option>
            <option value="LOW">낮음</option>
          </select>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-text-secondary">
            {selectedProjectId ? (
              <>
                <Icon name="drag_indicator" size="xs" className="inline mr-1" />
                드래그하여 상태 변경 가능 • {tasks.length}개 작업
              </>
            ) : (
              "프로젝트를 선택하세요"
            )}
          </span>
        </div>
      </div>

      {/* 프로젝트 미선택 안내 */}
      {!selectedProjectId && (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <Icon name="folder" size="lg" className="text-text-secondary mx-auto mb-4" />
            <h3 className="text-lg font-medium text-text mb-2">
              프로젝트를 선택하세요
            </h3>
            <p className="text-text-secondary">
              상단 헤더에서 프로젝트를 선택하면 작업을 볼 수 있습니다.
            </p>
          </div>
        </div>
      )}

      {/* 칸반 보드 */}
      {selectedProjectId && (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          onDragOver={handleDragOver}
        >
          <div className="flex-1 overflow-x-auto overflow-y-hidden px-6 pb-6">
            <div className="flex h-full gap-6 min-w-max">
              {columns.map((column) => {
                const columnTasks = getFilteredTasks(column.id);

                return (
                  <KanbanColumn
                    key={column.id}
                    column={column}
                    tasks={columnTasks}
                    onStatusChange={handleStatusChange}
                    onAddTask={() => setShowNewTaskModal(true)}
                    onEditTask={openEditModal}
                  />
                );
              })}
            </div>
          </div>

          {/* 드래그 오버레이 */}
          <DragOverlay>
            {activeTask && (
              <TaskCard
                task={activeTask}
                onStatusChange={() => {}}
                isDragging
              />
            )}
          </DragOverlay>
        </DndContext>
      )}

      {/* 새 작업 모달 */}
      {showNewTaskModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-background-white dark:bg-surface-dark rounded-xl shadow-2xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-text">새 작업</h2>
              <button
                onClick={() => setShowNewTaskModal(false)}
                className="text-text-secondary hover:text-text dark:hover:text-white"
              >
                <Icon name="close" size="md" />
              </button>
            </div>

            <form onSubmit={handleCreateTask} className="space-y-4">
              <Input
                label="작업 제목"
                placeholder="작업 제목을 입력하세요"
                value={newTaskTitle}
                onChange={(e) => setNewTaskTitle(e.target.value)}
                required
              />
              <div>
                <label className="block text-sm font-medium text-text mb-2">
                  설명
                </label>
                <textarea
                  className="w-full px-4 py-3 rounded-lg bg-surface border border-border text-text placeholder:text-text-secondary focus:ring-2 focus:ring-primary/50 focus:border-primary resize-none"
                  rows={3}
                  placeholder="작업에 대한 설명을 입력하세요"
                  value={newTaskDescription}
                  onChange={(e) => setNewTaskDescription(e.target.value)}
                />
              </div>
              {/* 담당자 선택 (다중 선택) */}
              <div>
                <label className="block text-sm font-medium text-text mb-2">
                  담당자 (복수 선택 가능)
                </label>
                <div className="max-h-32 overflow-y-auto border border-border rounded-lg p-2 bg-surface">
                  {teamMembers.length === 0 ? (
                    <p className="text-xs text-text-secondary p-2">팀 멤버가 없습니다</p>
                  ) : (
                    teamMembers.map((member) => (
                      <label
                        key={member.userId}
                        className="flex items-center gap-2 p-2 rounded hover:bg-slate-100 dark:hover:bg-slate-600 cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={newTaskAssigneeIds.includes(member.userId)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setNewTaskAssigneeIds([...newTaskAssigneeIds, member.userId]);
                            } else {
                              setNewTaskAssigneeIds(newTaskAssigneeIds.filter((id) => id !== member.userId));
                            }
                          }}
                          className="w-4 h-4 rounded border-slate-300 dark:border-slate-500 text-primary focus:ring-primary dark:bg-slate-600"
                        />
                        <span className="text-sm text-text">
                          {member.user?.name || member.user?.email || "알 수 없음"}
                          {member.customRole && (
                            <span className="text-xs text-text-secondary ml-1">({member.customRole})</span>
                          )}
                        </span>
                      </label>
                    ))
                  )}
                </div>
                {newTaskAssigneeIds.length > 0 && (
                  <p className="text-xs text-primary mt-1">{newTaskAssigneeIds.length}명 선택됨</p>
                )}
              </div>
              {/* 요구사항 연결 (선택) */}
              <div>
                <label className="block text-sm font-medium text-text mb-2">
                  연결된 요구사항 (선택)
                </label>
                <select
                  value={newTaskRequirementId}
                  onChange={(e) => setNewTaskRequirementId(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-lg bg-surface border border-border text-text text-sm"
                >
                  <option value="">요구사항 없음</option>
                  {requirements.map((req) => (
                    <option key={req.id} value={req.id}>
                      {req.code ? `[${req.code}] ` : ""}{req.title}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-text-secondary mt-1">
                  이 작업이 특정 요구사항과 관련된 경우 연결하세요
                </p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-text mb-2">
                    우선순위
                  </label>
                  <select
                    value={newTaskPriority}
                    onChange={(e) => setNewTaskPriority(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-lg bg-surface border border-border text-text"
                  >
                    <option value="HIGH">높음</option>
                    <option value="MEDIUM">보통</option>
                    <option value="LOW">낮음</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-text mb-2">
                    마감일
                  </label>
                  <input
                    type="date"
                    value={newTaskDueDate}
                    onChange={(e) => setNewTaskDueDate(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-lg bg-surface border border-border text-text focus:ring-2 focus:ring-primary/50 focus:border-primary"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <Button
                  variant="ghost"
                  fullWidth
                  type="button"
                  onClick={() => setShowNewTaskModal(false)}
                >
                  취소
                </Button>
                <Button
                  variant="primary"
                  fullWidth
                  type="submit"
                  disabled={createTask.isPending}
                >
                  {createTask.isPending ? "생성 중..." : "생성"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 태스크 수정 모달 */}
      {editingTask && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-background-white dark:bg-surface-dark rounded-xl shadow-2xl max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-text">작업 수정</h2>
              <button
                onClick={() => setEditingTask(null)}
                className="text-text-secondary hover:text-text dark:hover:text-white"
              >
                <Icon name="close" size="md" />
              </button>
            </div>

            <form onSubmit={handleEditTask} className="space-y-4">
              {/* 제목 */}
              <Input
                label="작업 제목"
                placeholder="작업 제목을 입력하세요"
                value={editingTask.title}
                onChange={(e) => setEditingTask({ ...editingTask, title: e.target.value })}
                required
              />

              {/* 설명 */}
              <div>
                <label className="block text-sm font-medium text-text mb-2">
                  설명
                </label>
                <textarea
                  className="w-full px-4 py-3 rounded-lg bg-surface border border-border text-text placeholder:text-text-secondary focus:ring-2 focus:ring-primary/50 focus:border-primary resize-none"
                  rows={3}
                  placeholder="작업에 대한 설명을 입력하세요"
                  value={editingTask.description || ""}
                  onChange={(e) => setEditingTask({ ...editingTask, description: e.target.value })}
                />
              </div>

              {/* 상태 & 우선순위 */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-text mb-2">
                    상태
                  </label>
                  <select
                    value={editingTask.status}
                    onChange={(e) => setEditingTask({ ...editingTask, status: e.target.value as Task["status"] })}
                    className="w-full px-3 py-2.5 rounded-lg bg-surface border border-border text-text"
                  >
                    <option value="PENDING">대기중</option>
                    <option value="IN_PROGRESS">진행중</option>
                    <option value="HOLDING">홀딩</option>
                    <option value="COMPLETED">완료</option>
                    <option value="CANCELLED">취소</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-text mb-2">
                    우선순위
                  </label>
                  <select
                    value={editingTask.priority}
                    onChange={(e) => setEditingTask({ ...editingTask, priority: e.target.value as Task["priority"] })}
                    className="w-full px-3 py-2.5 rounded-lg bg-surface border border-border text-text"
                  >
                    <option value="HIGH">높음</option>
                    <option value="MEDIUM">보통</option>
                    <option value="LOW">낮음</option>
                  </select>
                </div>
              </div>

              {/* 담당자 선택 (다중 선택) */}
              <div>
                <label className="block text-sm font-medium text-text mb-2">
                  담당자 (복수 선택 가능)
                </label>
                <div className="max-h-32 overflow-y-auto border border-border rounded-lg p-2 bg-surface">
                  {teamMembers.length === 0 ? (
                    <p className="text-xs text-text-secondary p-2">팀 멤버가 없습니다</p>
                  ) : (
                    teamMembers.map((member) => (
                      <label
                        key={member.userId}
                        className="flex items-center gap-2 p-2 rounded hover:bg-slate-100 dark:hover:bg-slate-600 cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={editTaskAssigneeIds.includes(member.userId)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setEditTaskAssigneeIds([...editTaskAssigneeIds, member.userId]);
                            } else {
                              setEditTaskAssigneeIds(editTaskAssigneeIds.filter((id) => id !== member.userId));
                            }
                          }}
                          className="w-4 h-4 rounded border-slate-300 dark:border-slate-500 text-primary focus:ring-primary dark:bg-slate-600"
                        />
                        <span className="text-sm text-text">
                          {member.user?.name || member.user?.email || "알 수 없음"}
                          {member.customRole && (
                            <span className="text-xs text-text-secondary ml-1">({member.customRole})</span>
                          )}
                        </span>
                      </label>
                    ))
                  )}
                </div>
                {editTaskAssigneeIds.length > 0 && (
                  <p className="text-xs text-primary mt-1">{editTaskAssigneeIds.length}명 선택됨</p>
                )}
              </div>

              {/* 요구사항 연결 */}
              <div>
                <label className="block text-sm font-medium text-text mb-2">
                  연결된 요구사항
                </label>
                <select
                  value={editingTask.requirementId || ""}
                  onChange={(e) => setEditingTask({ ...editingTask, requirementId: e.target.value || null })}
                  className="w-full px-3 py-2.5 rounded-lg bg-surface border border-border text-text text-sm"
                >
                  <option value="">요구사항 없음</option>
                  {requirements.map((req) => (
                    <option key={req.id} value={req.id}>
                      {req.code ? `[${req.code}] ` : ""}{req.title}
                    </option>
                  ))}
                </select>
              </div>

              {/* 마감일 */}
              <div>
                <label className="block text-sm font-medium text-text mb-2">
                  마감일
                </label>
                <input
                  type="date"
                  value={editingTask.dueDate ? editingTask.dueDate.split("T")[0] : ""}
                  onChange={(e) => setEditingTask({ ...editingTask, dueDate: e.target.value || undefined })}
                  className="w-full px-3 py-2.5 rounded-lg bg-surface border border-border text-text focus:ring-2 focus:ring-primary/50 focus:border-primary"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <Button
                  variant="ghost"
                  fullWidth
                  type="button"
                  onClick={() => setEditingTask(null)}
                >
                  취소
                </Button>
                <Button
                  variant="primary"
                  fullWidth
                  type="submit"
                  disabled={updateTask.isPending}
                >
                  {updateTask.isPending ? "저장 중..." : "저장"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * 칸반 컬럼 컴포넌트 (드롭 영역)
 */
function KanbanColumn({
  column,
  tasks,
  onStatusChange,
  onAddTask,
  onEditTask,
}: {
  column: ColumnConfig;
  tasks: Task[];
  onStatusChange: (taskId: string, newStatus: string) => void;
  onAddTask: () => void;
  onEditTask: (task: Task) => void;
}) {
  const { setNodeRef } = useSortable({
    id: column.id,
    data: {
      type: "column",
      column,
    },
  });

  return (
    <div
      ref={setNodeRef}
      className={`flex flex-col w-[320px] rounded-xl bg-background-white dark:bg-surface-dark border border-border dark:border-border-dark shadow-sm h-full max-h-full border-t-4 ${column.color}`}
    >
      {/* 컬럼 헤더 */}
      <div className="p-4 flex items-center justify-between border-b border-border dark:border-border-dark bg-surface dark:bg-[#1e2630] rounded-t-lg">
        <div className="flex items-center gap-2">
          <h3 className="font-bold text-text">
            {column.titleKo} ({column.title})
          </h3>
          <span className={`${column.bgColor} text-xs px-2 py-0.5 rounded-full font-bold`}>
            {tasks.length}
          </span>
        </div>
        {column.id === "PENDING" && (
          <button
            onClick={onAddTask}
            className="text-text-secondary hover:text-text dark:hover:text-white transition-colors"
          >
            <Icon name="add" size="sm" />
          </button>
        )}
      </div>

      {/* 작업 카드 목록 */}
      <SortableContext
        items={tasks.map((t) => t.id)}
        strategy={verticalListSortingStrategy}
      >
        <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-3">
          {tasks.map((task) => (
            <SortableTaskCard
              key={task.id}
              task={task}
              onStatusChange={onStatusChange}
              onEditTask={onEditTask}
            />
          ))}
          {tasks.length === 0 && (
            <div className="text-center py-8 text-text-secondary text-sm border-2 border-dashed border-border dark:border-border-dark rounded-lg">
              작업을 여기로 드래그하세요
            </div>
          )}
        </div>
      </SortableContext>

      {/* 작업 추가 버튼 (대기중 컬럼) */}
      {column.id === "PENDING" && (
        <div className="p-3 mt-auto">
          <button
            onClick={onAddTask}
            className="w-full flex items-center justify-center gap-2 py-2 rounded-lg border border-dashed border-border dark:border-border-dark text-text-secondary text-sm hover:bg-surface dark:hover:bg-surface-dark transition-colors"
          >
            <Icon name="add" size="sm" />
            작업 추가
          </button>
        </div>
      )}
    </div>
  );
}

/**
 * 정렬 가능한 작업 카드 컴포넌트
 */
function SortableTaskCard({
  task,
  onStatusChange,
  onEditTask,
}: {
  task: Task;
  onStatusChange: (taskId: string, newStatus: string) => void;
  onEditTask: (task: Task) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: task.id,
    data: {
      type: "task",
      task,
    },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <TaskCard
        task={task}
        onStatusChange={onStatusChange}
        onEditTask={onEditTask}
        isDragging={isDragging}
      />
    </div>
  );
}

/**
 * 작업 카드 컴포넌트
 */
function TaskCard({
  task,
  onStatusChange,
  onEditTask,
  isDragging = false,
}: {
  task: Task;
  onStatusChange: (taskId: string, newStatus: string) => void;
  onEditTask?: (task: Task) => void;
  isDragging?: boolean;
}) {
  const priority = priorityConfig[task.priority] || priorityConfig.MEDIUM;
  const isCompleted = task.status === "COMPLETED";

  return (
    <div
      className={`
        bg-background-white dark:bg-[#283039] p-4 rounded-lg shadow-sm border border-border dark:border-transparent
        cursor-grab active:cursor-grabbing transition-all group
        ${isDragging ? "opacity-50 shadow-lg ring-2 ring-primary scale-105" : ""}
        ${isCompleted ? "opacity-70 hover:opacity-90" : "hover:ring-2 hover:ring-primary/50 hover:shadow-md"}
      `}
    >
      {/* 드래그 핸들 아이콘 */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Icon name="drag_indicator" size="xs" className="text-text-secondary opacity-50 group-hover:opacity-100" />
          {isCompleted ? (
            <div className="flex items-center gap-1 text-success text-xs font-bold">
              <Icon name="check_circle" size="xs" />
              <span>완료</span>
            </div>
          ) : (
            <span className={`${priority.bgColor} ${priority.textColor} text-[10px] font-bold px-2 py-1 rounded uppercase tracking-wider`}>
              {priority.label}
            </span>
          )}
        </div>
        {/* 상태 변경 드롭다운 & 수정 버튼 */}
        <div className="flex items-center gap-1">
          <select
            value={task.status}
            onChange={(e) => {
              e.stopPropagation();
              onStatusChange(task.id, e.target.value);
            }}
            className="text-xs bg-transparent border-none focus:ring-0 text-text-secondary cursor-pointer"
            onClick={(e) => e.stopPropagation()}
            onPointerDown={(e) => e.stopPropagation()}
          >
            <option value="PENDING">대기중</option>
            <option value="IN_PROGRESS">진행중</option>
            <option value="HOLDING">홀딩</option>
            <option value="COMPLETED">완료</option>
            <option value="CANCELLED">취소</option>
          </select>
          {onEditTask && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onEditTask(task);
              }}
              onPointerDown={(e) => e.stopPropagation()}
              className="size-6 rounded flex items-center justify-center hover:bg-primary/10 text-text-secondary hover:text-primary transition-colors opacity-0 group-hover:opacity-100"
              title="수정"
            >
              <Icon name="edit" size="xs" />
            </button>
          )}
        </div>
      </div>

      {/* 제목 */}
      <h4
        className={`text-sm font-semibold mb-2 leading-snug ${
          isCompleted
            ? "text-text-secondary line-through"
            : "text-text"
        }`}
      >
        {task.title}
      </h4>

      {/* 설명 */}
      {task.description && (
        <p className="text-xs text-text-secondary line-clamp-2 mb-3">
          {task.description}
        </p>
      )}

      {/* 연결된 요구사항 */}
      {task.requirement && (
        <div className="mb-3 px-2 py-1.5 rounded bg-purple-100 dark:bg-purple-900/30 border border-purple-200 dark:border-purple-800">
          <div className="flex items-center gap-1.5">
            <Icon name="link" size="xs" className="text-purple-600 dark:text-purple-400 flex-shrink-0" />
            {task.requirement.code && (
              <span className="text-[10px] font-bold text-white bg-purple-600 dark:bg-purple-500 px-1.5 py-0.5 rounded flex-shrink-0">
                {task.requirement.code}
              </span>
            )}
            <span className="text-[11px] font-medium text-purple-600 dark:text-purple-400 truncate">
              {task.requirement.title}
            </span>
          </div>
        </div>
      )}

      {/* 하단: 담당자 및 메타 정보 */}
      <div className="flex items-center justify-between mt-3">
        {/* 다중 담당자 표시 */}
        <div className="flex -space-x-1.5">
          {task.assignees && task.assignees.length > 0 ? (
            <>
              {task.assignees.slice(0, 3).map((assignee) => (
                <div
                  key={assignee.id}
                  className="size-6 rounded-full bg-primary flex items-center justify-center text-[10px] font-bold text-white border-2 border-background-white dark:border-[#283039]"
                  title={assignee.name || ""}
                >
                  {assignee.name?.charAt(0) || "?"}
                </div>
              ))}
              {task.assignees.length > 3 && (
                <div className="size-6 rounded-full bg-text-secondary flex items-center justify-center text-[10px] font-bold text-white border-2 border-background-white dark:border-[#283039]">
                  +{task.assignees.length - 3}
                </div>
              )}
            </>
          ) : (
            <div className="size-6 rounded-full bg-text-secondary/50 flex items-center justify-center text-[10px] font-bold text-white">
              --
            </div>
          )}
        </div>

        <div className="flex items-center gap-3 text-text-secondary text-xs">
          {task.dueDate && (
            <div className="flex items-center gap-1">
              <Icon name="schedule" size="xs" />
              <span>{new Date(task.dueDate).toLocaleDateString("ko-KR", { month: "short", day: "numeric" })}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
