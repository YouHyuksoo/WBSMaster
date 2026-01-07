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
import { useTasks, useCreateTask, useUpdateTask } from "@/hooks";
import { useProjects } from "@/hooks";
import type { Task } from "@/lib/api";

/** 컬럼 설정 */
interface ColumnConfig {
  id: "PENDING" | "IN_PROGRESS" | "COMPLETED";
  title: string;
  titleKo: string;
  color: string;
  bgColor: string;
}

/** 컬럼 설정 */
const columns: ColumnConfig[] = [
  { id: "PENDING", title: "Pending", titleKo: "대기중", color: "border-t-slate-400", bgColor: "bg-slate-100 dark:bg-slate-700" },
  { id: "IN_PROGRESS", title: "In Progress", titleKo: "진행중", color: "border-t-primary", bgColor: "bg-primary/20" },
  { id: "COMPLETED", title: "Completed", titleKo: "완료", color: "border-t-success", bgColor: "bg-success/20" },
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
  const [selectedProject, setSelectedProject] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTask, setActiveTask] = useState<Task | null>(null);

  // 새 작업 폼 상태
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskDescription, setNewTaskDescription] = useState("");
  const [newTaskPriority, setNewTaskPriority] = useState("MEDIUM");
  const [newTaskDueDate, setNewTaskDueDate] = useState("");

  // API 연동
  const { data: projects = [] } = useProjects();
  const { data: tasks = [], isLoading, error } = useTasks(
    selectedProject ? { projectId: selectedProject } : undefined
  );
  const createTask = useCreateTask();
  const updateTask = useUpdateTask();

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
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        return task.title.toLowerCase().includes(query) ||
          (task.description?.toLowerCase().includes(query) ?? false);
      }
      return true;
    });
  };

  /**
   * 새 작업 생성
   */
  const handleCreateTask = async (e: FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim() || !selectedProject) return;

    try {
      await createTask.mutateAsync({
        title: newTaskTitle,
        description: newTaskDescription || undefined,
        projectId: selectedProject,
        priority: newTaskPriority,
        dueDate: newTaskDueDate || undefined,
      });

      // 폼 초기화 및 모달 닫기
      setNewTaskTitle("");
      setNewTaskDescription("");
      setNewTaskPriority("MEDIUM");
      setNewTaskDueDate("");
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
            <h1 className="text-xl font-bold text-text dark:text-white">
              TASK Kanban Board
            </h1>
            {/* 프로젝트 선택 */}
            <select
              value={selectedProject}
              onChange={(e) => setSelectedProject(e.target.value)}
              className="px-3 py-2 rounded-lg bg-surface dark:bg-background-dark border border-border dark:border-border-dark text-sm text-text dark:text-white"
            >
              <option value="">프로젝트 선택</option>
              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-3">
            {/* 검색 */}
            <div className="hidden xl:flex items-center bg-surface dark:bg-background-dark rounded-lg px-3 py-2 w-64 border border-border dark:border-border-dark focus-within:ring-2 focus-within:ring-primary/50">
              <Icon name="search" size="sm" className="text-text-secondary" />
              <input
                className="bg-transparent border-none focus:ring-0 text-sm w-full text-text dark:text-white placeholder:text-text-secondary ml-2"
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
              disabled={!selectedProject}
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
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-text-secondary">
            {selectedProject ? (
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
      {!selectedProject && (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <Icon name="folder" size="lg" className="text-text-secondary mx-auto mb-4" />
            <h3 className="text-lg font-medium text-text dark:text-white mb-2">
              프로젝트를 선택하세요
            </h3>
            <p className="text-text-secondary">
              상단의 드롭다운에서 프로젝트를 선택하면 작업을 볼 수 있습니다.
            </p>
          </div>
        </div>
      )}

      {/* 칸반 보드 */}
      {selectedProject && (
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
              <h2 className="text-xl font-bold text-text dark:text-white">새 작업</h2>
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
                <label className="block text-sm font-medium text-text dark:text-white mb-2">
                  설명
                </label>
                <textarea
                  className="w-full px-4 py-3 rounded-lg bg-surface dark:bg-background-dark border border-border dark:border-border-dark text-text dark:text-white placeholder:text-text-secondary focus:ring-2 focus:ring-primary/50 focus:border-primary resize-none"
                  rows={3}
                  placeholder="작업에 대한 설명을 입력하세요"
                  value={newTaskDescription}
                  onChange={(e) => setNewTaskDescription(e.target.value)}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-text dark:text-white mb-2">
                    우선순위
                  </label>
                  <select
                    value={newTaskPriority}
                    onChange={(e) => setNewTaskPriority(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-lg bg-surface dark:bg-background-dark border border-border dark:border-border-dark text-text dark:text-white"
                  >
                    <option value="HIGH">높음</option>
                    <option value="MEDIUM">보통</option>
                    <option value="LOW">낮음</option>
                  </select>
                </div>
                <Input
                  label="마감일"
                  type="date"
                  value={newTaskDueDate}
                  onChange={(e) => setNewTaskDueDate(e.target.value)}
                />
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
}: {
  column: ColumnConfig;
  tasks: Task[];
  onStatusChange: (taskId: string, newStatus: string) => void;
  onAddTask: () => void;
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
          <h3 className="font-bold text-text dark:text-white">
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
}: {
  task: Task;
  onStatusChange: (taskId: string, newStatus: string) => void;
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
  isDragging = false,
}: {
  task: Task;
  onStatusChange: (taskId: string, newStatus: string) => void;
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
        {/* 상태 변경 드롭다운 */}
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
          <option value="COMPLETED">완료</option>
        </select>
      </div>

      {/* 제목 */}
      <h4
        className={`text-sm font-semibold mb-2 leading-snug ${
          isCompleted
            ? "text-text-secondary line-through"
            : "text-text dark:text-white"
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

      {/* 하단: 담당자 및 메타 정보 */}
      <div className="flex items-center justify-between mt-3">
        <div className="flex -space-x-2">
          {task.assignee ? (
            <div className="size-6 rounded-full bg-primary flex items-center justify-center text-[10px] font-bold text-white border-2 border-background-white dark:border-[#283039]">
              {task.assignee.name?.charAt(0) || "?"}
            </div>
          ) : (
            <div className="size-6 rounded-full bg-text-secondary flex items-center justify-center text-[10px] font-bold text-white">
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
