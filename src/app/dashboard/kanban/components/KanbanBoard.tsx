/**
 * @file src/app/dashboard/kanban/components/KanbanBoard.tsx
 * @description
 * 칸반 보드 컴포넌트입니다.
 * 작업을 상태별로 컬럼에 나누어 시각화하고 드래그 앤 드롭으로 상태 변경이 가능합니다.
 *
 * 초보자 가이드:
 * 1. **Column**: 대기중, 진행중, 완료 등의 상태 컬럼
 * 2. **Task Card**: 각 작업을 나타내는 카드
 * 3. **Drag & Drop**: @dnd-kit을 사용하여 작업을 다른 컬럼으로 드래그
 */

"use client";

import { useState, useEffect, FormEvent } from "react";
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
import { Icon, Button, Input, useToast, ConfirmModal } from "@/components/ui";
import { useTasks, useCreateTask, useUpdateTask, useDeleteTask, useMembers, useRequirements, useWbsItems, useNudgeTask, useCurrentUser } from "@/hooks";
import { useProject } from "@/contexts";
import type { Task } from "@/lib/api";
import { utils, writeFile } from "xlsx";

/** 로컬 사용자 타입 */
interface LocalUser {
  id: string;
  name?: string;
  email?: string;
}

/** 컬럼 설정 */
interface ColumnConfig {
  id: "PENDING" | "IN_PROGRESS" | "COMPLETED";
  title: string;
  titleKo: string;
  color: string;           // 상단 보더 색상
  bgColor: string;         // 카운트 배지 색상
  headerBgColor: string;   // 헤더 배경색
  columnBgColor: string;   // 컬럼 전체 배경색 (연한 틴트)
}

/** 컬럼 설정 */
const columns: ColumnConfig[] = [
  {
    id: "PENDING",
    title: "Pending",
    titleKo: "대기중",
    color: "border-t-slate-400",
    bgColor: "bg-slate-200 dark:bg-slate-600 text-slate-700 dark:text-slate-200",
    headerBgColor: "bg-slate-100 dark:bg-slate-800/50",
    columnBgColor: "bg-slate-50/50 dark:bg-slate-900/20",
  },
  {
    id: "IN_PROGRESS",
    title: "In Progress",
    titleKo: "진행중",
    color: "border-t-sky-500",
    bgColor: "bg-sky-200 dark:bg-sky-800 text-sky-700 dark:text-sky-200",
    headerBgColor: "bg-sky-100 dark:bg-sky-900/50",
    columnBgColor: "bg-sky-50/50 dark:bg-sky-950/20",
  },
  {
    id: "COMPLETED",
    title: "Completed",
    titleKo: "완료",
    color: "border-t-emerald-500",
    bgColor: "bg-emerald-200 dark:bg-emerald-800 text-emerald-700 dark:text-emerald-200",
    headerBgColor: "bg-emerald-100 dark:bg-emerald-900/50",
    columnBgColor: "bg-emerald-50/50 dark:bg-emerald-950/20",
  },
];

/** 우선순위 설정 */
const priorityConfig: Record<string, { label: string; bgColor: string; textColor: string }> = {
  HIGH: { label: "HIGH", bgColor: "bg-orange-100 dark:bg-orange-900/30", textColor: "text-orange-600 dark:text-orange-400" },
  MEDIUM: { label: "MEDIUM", bgColor: "bg-blue-100 dark:bg-blue-900/30", textColor: "text-blue-600 dark:text-blue-400" },
  LOW: { label: "LOW", bgColor: "bg-slate-100 dark:bg-slate-700", textColor: "text-slate-600 dark:text-slate-300" },
};

/**
 * 칸반 보드 컴포넌트
 */
export function KanbanBoard() {
  // 현재 로그인한 사용자 정보
  const [user, setUser] = useState<LocalUser | null>(null);

  const [filter, setFilter] = useState<"all" | "my">("all");
  const [showNewTaskModal, setShowNewTaskModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [filterAssignee, setFilterAssignee] = useState<string>("all");
  const [filterPriority, setFilterPriority] = useState<string>("all");
  const [filterDelayedOnly, setFilterDelayedOnly] = useState(false); // 지연된 작업만 보기
  const [filterTodayOnly, setFilterTodayOnly] = useState(false); // 오늘 등록한 작업만 보기

  // 삭제 확인 모달 상태
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletingTaskId, setDeletingTaskId] = useState<string | null>(null);
  const [deletingTaskTitle, setDeletingTaskTitle] = useState("");

  const toast = useToast();

  // 새 작업 폼 상태
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskDescription, setNewTaskDescription] = useState("");
  const [newTaskPriority, setNewTaskPriority] = useState("MEDIUM");
  const [newTaskStartDate, setNewTaskStartDate] = useState("");  // 시작일
  const [newTaskDueDate, setNewTaskDueDate] = useState("");      // 마감일
  const [newTaskAssigneeId, setNewTaskAssigneeId] = useState("");  // 주 담당자
  const [newTaskAssigneeIds, setNewTaskAssigneeIds] = useState<string[]>([]);  // 부 담당자들
  const [newTaskRequirementId, setNewTaskRequirementId] = useState("");
  const [newTaskWbsItemId, setNewTaskWbsItemId] = useState("");  // WBS 항목

  // 사이드바 상태 (카드 선택 시 우측에 상세 정보 표시)
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [editTaskAssigneeId, setEditTaskAssigneeId] = useState("");  // 주 담당자
  const [editTaskAssigneeIds, setEditTaskAssigneeIds] = useState<string[]>([]);  // 부 담당자들

  // 컬럼 최대화 모달 상태
  const [maximizedColumn, setMaximizedColumn] = useState<string | null>(null);
  const [maximizedColumnTasks, setMaximizedColumnTasks] = useState<Task[]>([]);

  // 완료된 task 확장 상태 (클릭하면 확장)
  const [expandedCompletedTaskIds, setExpandedCompletedTaskIds] = useState<Set<string>>(new Set());

  // 전역 프로젝트 선택 상태 (헤더에서 선택)
  const { selectedProjectId, selectedProject } = useProject();

  // API 연동
  const { data: tasks = [], isLoading, error, refetch: refetchTasks } = useTasks(
    selectedProjectId ? { projectId: selectedProjectId } : undefined
  );
  const createTask = useCreateTask();
  const updateTask = useUpdateTask();
  const deleteTask = useDeleteTask();
  const nudgeTask = useNudgeTask();

  // 현재 로그인한 사용자 조회
  const { data: currentUser } = useCurrentUser();

  // 프로젝트 팀 멤버 목록 조회
  const { data: teamMembers = [] } = useMembers(
    selectedProjectId ? { projectId: selectedProjectId } : undefined
  );

  // 프로젝트 요구사항 목록 조회
  const { data: requirements = [] } = useRequirements(
    selectedProjectId ? { projectId: selectedProjectId } : undefined
  );

  // 프로젝트 WBS 항목 목록 조회 (평탄화하여 선택 가능하게)
  const { data: wbsItems = [] } = useWbsItems(
    selectedProjectId ? { projectId: selectedProjectId, flat: true } : undefined
  );

  // localStorage에서 사용자 정보 가져오기
  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch {
        console.error("사용자 정보 파싱 실패");
      }
    }
  }, []);

  // 드래그 앤 드롭 센서 설정
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // 8px 이상 드래그해야 활성화
      },
    })
  );

  /**
   * 지연 여부 판별 함수
   * 마감일이 지났고 완료되지 않은 작업
   */
  const isTaskDelayed = (task: Task) => {
    if (!task.dueDate) return false;
    if (task.status === "COMPLETED") return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dueDate = new Date(task.dueDate);
    dueDate.setHours(0, 0, 0, 0);
    return dueDate < today;
  };

  /** 지연된 작업 수 계산 */
  const delayedTaskCount = tasks.filter(isTaskDelayed).length;

  /**
   * 오늘 등록 여부 판별 함수
   * 작업의 createdAt이 오늘인지 확인
   */
  const isTaskCreatedToday = (task: Task) => {
    if (!task.createdAt) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const createdDate = new Date(task.createdAt);
    createdDate.setHours(0, 0, 0, 0);
    return createdDate.getTime() === today.getTime();
  };

  /** 오늘 등록한 작업 수 계산 */
  const todayCreatedTaskCount = tasks.filter(isTaskCreatedToday).length;

  /** 내 작업 수 계산 (currentUser 또는 localStorage user 사용) */
  const activeUserId = currentUser?.id || user?.id;
  const myTaskCount = activeUserId
    ? tasks.filter((task) =>
        task.assigneeId === activeUserId ||
        task.assignee?.id === activeUserId ||
        task.assignees?.some((a) => a.id === activeUserId || (a as { userId?: string }).userId === activeUserId)
      ).length
    : 0;

  /**
   * 필터링된 작업 목록
   */
  const getFilteredTasks = (status: string) => {
    return tasks.filter((task) => {
      // 상태 필터 - 지연(DELAYED) 또는 홀딩(HOLDING) 상태는 진행중(IN_PROGRESS) 컬럼에 표시
      if (status === "IN_PROGRESS") {
        if (task.status !== "IN_PROGRESS" && task.status !== "DELAYED" && task.status !== "HOLDING") return false;
      } else if (task.status !== status) {
        return false;
      }

      // "내 작업" 필터 - 현재 사용자가 담당자인 작업만
      if (filter === "my" && activeUserId) {
        const isMyTask =
          task.assigneeId === activeUserId ||
          task.assignee?.id === activeUserId ||
          task.assignees?.some((a) => a && (a.id === activeUserId || (a as any).userId === activeUserId));
        if (!isMyTask) return false;
      }

      // 검색어 필터
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesSearch = task.title.toLowerCase().includes(query) ||
          (task.description?.toLowerCase().includes(query) ?? false);
        if (!matchesSearch) return false;
      }

      // 담당자 필터 (드롭다운) - 주 담당자와 부 담당자 모두 확인
      if (filterAssignee !== "all") {
        const isMainAssignee = task.assigneeId === filterAssignee;
        const isSubAssignee = task.assignees?.some((a) => a.id === filterAssignee);
        if (!isMainAssignee && !isSubAssignee) return false;
      }

      // 우선순위 필터
      if (filterPriority !== "all" && task.priority !== filterPriority) {
        return false;
      }

      // 지연 필터
      if (filterDelayedOnly && !isTaskDelayed(task)) {
        return false;
      }

      // 오늘 등록 필터
      if (filterTodayOnly && !isTaskCreatedToday(task)) {
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
        startDate: newTaskStartDate || undefined,  // 시작일
        dueDate: newTaskDueDate || undefined,      // 마감일
        assigneeId: newTaskAssigneeId || undefined,  // 주 담당자
        assigneeIds: newTaskAssigneeIds.length > 0 ? newTaskAssigneeIds : undefined,  // 부 담당자들
        requirementId: newTaskRequirementId || undefined, // 요구사항 연결
        wbsItemId: newTaskWbsItemId || undefined, // WBS 항목 연결
      });

      // 폼 초기화 및 모달 닫기
      setNewTaskTitle("");
      setNewTaskDescription("");
      setNewTaskPriority("MEDIUM");
      setNewTaskStartDate("");  // 시작일 초기화
      setNewTaskDueDate("");    // 마감일 초기화
      setNewTaskAssigneeId("");  // 주 담당자 초기화
      setNewTaskAssigneeIds([]);  // 부 담당자들 초기화
      setNewTaskRequirementId(""); // 요구사항 ID 초기화
      setNewTaskWbsItemId(""); // WBS 항목 ID 초기화
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
   * 진행률 변경 핸들러
   */
  const handleProgressChange = async (taskId: string, newProgress: number) => {
    try {
      await updateTask.mutateAsync({
        id: taskId,
        data: { progress: newProgress },
      });
    } catch (err) {
      console.error("진행률 변경 실패:", err);
    }
  };

  /**
   * 컬럼 최대화 핸들러
   */
  const handleMaximizeColumn = (columnId: string, tasks: Task[]) => {
    setMaximizedColumn(columnId);
    setMaximizedColumnTasks(tasks);
  };

  /**
   * 최대화 모달 닫기
   */
  const closeMaximizedModal = () => {
    setMaximizedColumn(null);
    setMaximizedColumnTasks([]);
  };

  /**
   * ESC 키로 최대화 모달 닫기
   */
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape" && maximizedColumn) {
        closeMaximizedModal();
      }
    };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [maximizedColumn]);

  /**
   * 사이드바 열기 (카드 선택)
   */
  const openSidebar = (task: Task) => {
    setSelectedTask({ ...task });
    setEditTaskAssigneeId(task.assigneeId || "");  // 주 담당자
    setEditTaskAssigneeIds(task.assignees?.map((a) => a.id) || []);  // 부 담당자들
  };

  /**
   * 사이드바 닫기
   */
  const closeSidebar = () => {
    setSelectedTask(null);
    setEditTaskAssigneeId("");
    setEditTaskAssigneeIds([]);
  };

  /**
   * 작업 삭제 핸들러 (대기중 상태에서만 가능)
   */
  const handleDeleteTask = async (taskId: string, taskTitle: string) => {
    setDeletingTaskId(taskId);
    setDeletingTaskTitle(taskTitle);
    setShowDeleteConfirm(true);
  };

  /**
   * 작업 삭제 확인
   */
  const handleConfirmDelete = async () => {
    if (!deletingTaskId) return;

    try {
      await deleteTask.mutateAsync(deletingTaskId);
      toast.success("작업이 삭제되었습니다.");
      setShowDeleteConfirm(false);
      setDeletingTaskId(null);
      setDeletingTaskTitle("");
    } catch (err) {
      console.error("작업 삭제 실패:", err);
      toast.error("작업 삭제에 실패했습니다.");
    }
  };

  /**
   * 완료된 task 확장/축소 토글
   */
  const toggleCompletedTaskExpand = (taskId: string) => {
    setExpandedCompletedTaskIds((prev) => {
      const next = new Set(prev);
      if (next.has(taskId)) {
        next.delete(taskId);
      } else {
        next.add(taskId);
      }
      return next;
    });
  };

  /**
   * 작업 수정 핸들러 (사이드바에서 저장)
   */
  const handleSaveTask = async () => {
    if (!selectedTask) return;

    try {
      await updateTask.mutateAsync({
        id: selectedTask.id,
        data: {
          title: selectedTask.title,
          description: selectedTask.description,
          status: selectedTask.status,
          priority: selectedTask.priority,
          progress: selectedTask.progress,  // 진행률
          startDate: selectedTask.startDate,  // 계획 시작일
          dueDate: selectedTask.dueDate,      // 계획 마감일
          actualStartDate: selectedTask.actualStartDate,  // 실제 시작일
          actualEndDate: selectedTask.actualEndDate,      // 실제 마감일
          requirementId: selectedTask.requirementId,
          wbsItemId: selectedTask.wbsItemId,  // WBS 항목
          assigneeId: editTaskAssigneeId || null,  // 주 담당자
          assigneeIds: editTaskAssigneeIds,  // 부 담당자들
        },
      });
      closeSidebar();
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

  /**
   * 데이터 새로고침 핸들러
   * 캐시를 무시하고 최신 작업 데이터를 가져옵니다.
   */
  const handleRefresh = async () => {
    try {
      await refetchTasks();
      toast.success("데이터가 업데이트되었습니다.");
    } catch (err) {
      console.error("새로고침 실패:", err);
      toast.error("데이터 업데이트에 실패했습니다.");
    }
  };

  /**
   * 엑셀 다운로드 핸들러
   * 담당자별로 정렬하여 다운로드
   */
  const handleExportToExcel = () => {
    if (tasks.length === 0) {
      toast.error("다운로드할 작업이 없습니다.");
      return;
    }

    // 상태 한글 변환
    const statusNames: Record<string, string> = {
      PENDING: "대기중",
      IN_PROGRESS: "진행중",
      COMPLETED: "완료",
      HOLDING: "홀딩",
      DELAYED: "지연",
      CANCELLED: "취소",
    };

    // 우선순위 한글 변환
    const priorityNames: Record<string, string> = {
      HIGH: "높음",
      MEDIUM: "보통",
      LOW: "낮음",
    };

    // 담당자별로 정렬 (담당자 이름 기준, 담당자 없는 것은 맨 뒤로)
    const sortedTasks = [...tasks].sort((a, b) => {
      const aAssignee = a.assignee?.name || a.assignees?.[0]?.name || "";
      const bAssignee = b.assignee?.name || b.assignees?.[0]?.name || "";

      // 담당자 없는 경우 맨 뒤로
      if (!aAssignee && bAssignee) return 1;
      if (aAssignee && !bAssignee) return -1;

      // 담당자 이름으로 정렬
      const nameCompare = aAssignee.localeCompare(bAssignee, "ko");
      if (nameCompare !== 0) return nameCompare;

      // 같은 담당자면 상태로 정렬 (대기중 -> 진행중 -> 완료)
      const statusOrder = { PENDING: 0, IN_PROGRESS: 1, COMPLETED: 2, HOLDING: 3, DELAYED: 4, CANCELLED: 5 };
      return (statusOrder[a.status as keyof typeof statusOrder] || 99) - (statusOrder[b.status as keyof typeof statusOrder] || 99);
    });

    // 엑셀 데이터 변환
    const excelData = sortedTasks.map((task, index) => {
      // 모든 담당자 이름 합치기
      const allAssignees: string[] = [];
      if (task.assignee?.name) allAssignees.push(task.assignee.name);
      task.assignees?.forEach((a) => {
        if (a.name && !allAssignees.includes(a.name)) {
          allAssignees.push(a.name);
        }
      });

      return {
        "번호": index + 1,
        "제목": task.title,
        "설명": task.description || "",
        "상태": statusNames[task.status] || task.status,
        "우선순위": priorityNames[task.priority] || task.priority,
        "주 담당자": task.assignee?.name || "",
        "협업자": task.assignees?.map((a) => a.name).filter(Boolean).join(", ") || "",
        "업무협조요청": task.requirement ? (task.requirement.code ? `[${task.requirement.code}] ${task.requirement.title}` : task.requirement.title) : "",
        "시작일": task.startDate ? new Date(task.startDate).toLocaleDateString("ko-KR") : "",
        "마감일": task.dueDate ? new Date(task.dueDate).toLocaleDateString("ko-KR") : "",
        "생성일": task.createdAt ? new Date(task.createdAt).toLocaleDateString("ko-KR") : "",
      };
    });

    // 워크북 생성
    const worksheet = utils.json_to_sheet(excelData);
    const workbook = utils.book_new();
    utils.book_append_sheet(workbook, worksheet, "작업목록");

    // 컬럼 너비 설정
    worksheet["!cols"] = [
      { wch: 5 },   // 번호
      { wch: 40 },  // 제목
      { wch: 50 },  // 설명
      { wch: 10 },  // 상태
      { wch: 10 },  // 우선순위
      { wch: 15 },  // 주 담당자
      { wch: 30 },  // 협업자
      { wch: 40 },  // 업무협조요청
      { wch: 12 },  // 시작일
      { wch: 12 },  // 마감일
      { wch: 12 },  // 생성일
    ];

    // 파일명 생성 (프로젝트명_작업목록_날짜.xlsx)
    const projectName = selectedProject?.name || "프로젝트";
    const dateStr = new Date().toISOString().split("T")[0];
    writeFile(workbook, `${projectName}_작업목록_${dateStr}.xlsx`);
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
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* 액션 바 */}
      <div className="flex flex-wrap items-center justify-between gap-4 px-6 py-3 bg-background-white dark:bg-surface-dark border-b border-border dark:border-border-dark shrink-0">
        {/* 검색 */}
        <div className="flex items-center bg-surface dark:bg-background-dark rounded-lg px-3 py-2 w-64 border border-border dark:border-border-dark focus-within:ring-2 focus-within:ring-primary/50">
          <Icon name="search" size="sm" className="text-text-secondary" />
          <input
            className="bg-transparent border-none focus:ring-0 text-sm w-full text-text dark:text-white placeholder:text-text-secondary ml-2"
            placeholder="작업 검색..."
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-3">
          {/* 새로고침 버튼 */}
          <button
            onClick={handleRefresh}
            disabled={!selectedProjectId || isLoading}
            className={`flex items-center justify-center p-2 rounded-lg transition-all ${
              isLoading
                ? "bg-primary/10 text-primary cursor-wait"
                : "bg-background-white dark:bg-surface-dark border border-border dark:border-border-dark text-text-secondary hover:text-primary hover:border-primary/30"
            }`}
            title="데이터 새로고침"
          >
            <Icon name={isLoading ? "sync" : "refresh"} size="sm" className={isLoading ? "animate-spin" : ""} />
          </button>
          <Button
            variant="outline"
            leftIcon="download"
            onClick={handleExportToExcel}
            disabled={!selectedProjectId || tasks.length === 0}
          >
            엑셀 다운로드
          </Button>
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
            내 작업 ({myTaskCount})
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

          {/* 지연 필터 */}
          <button
            onClick={() => setFilterDelayedOnly(!filterDelayedOnly)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors flex items-center gap-1.5 ${
              filterDelayedOnly
                ? "bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800"
                : "bg-background-white dark:bg-surface-dark border border-border dark:border-border-dark text-text-secondary hover:text-rose-500"
            }`}
          >
            <Icon name="warning" size="xs" />
            지연 ({delayedTaskCount})
          </button>

          {/* 오늘 등록 필터 */}
          <button
            onClick={() => setFilterTodayOnly(!filterTodayOnly)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors flex items-center gap-1.5 ${
              filterTodayOnly
                ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800"
                : "bg-background-white dark:bg-surface-dark border border-border dark:border-border-dark text-text-secondary hover:text-emerald-500"
            }`}
          >
            <Icon name="today" size="xs" />
            오늘 등록 ({todayCreatedTaskCount})
          </button>
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

      {/* 칸반 보드 + 사이드바 */}
      {selectedProjectId && (
        <div className="flex-1 flex overflow-hidden">
          {/* 칸반 보드 영역 */}
          <DndContext
            sensors={sensors}
            collisionDetection={closestCorners}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            onDragOver={handleDragOver}
          >
            <div className={`flex-1 overflow-x-auto overflow-y-hidden px-6 pb-6 transition-all duration-300 ${selectedTask ? "mr-0" : ""}`}>
              <div className="flex h-full gap-6 min-w-max">
                {columns.map((column) => {
                  const columnTasks = getFilteredTasks(column.id);

                  return (
                    <KanbanColumn
                      key={column.id}
                      column={column}
                      tasks={columnTasks}
                      onStatusChange={handleStatusChange}
                      onProgressChange={handleProgressChange}
                      onAddTask={() => setShowNewTaskModal(true)}
                      onSelectTask={openSidebar}
                      onDeleteTask={handleDeleteTask}
                      expandedCompletedTaskIds={expandedCompletedTaskIds}
                      onToggleCompleted={toggleCompletedTaskExpand}
                      selectedTaskId={selectedTask?.id}
                      currentUserId={currentUser?.id}
                      onNudge={(taskId) => nudgeTask.mutate({ taskId })}
                      isNudging={nudgeTask.isPending}
                      onMaximize={() => handleMaximizeColumn(column.id, columnTasks)}
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
                  onProgressChange={() => {}}
                  isDragging
                />
              )}
            </DragOverlay>
          </DndContext>

          {/* 우측 사이드바 - 작업 상세/수정 */}
          {selectedTask && (
            <div className="w-[420px] shrink-0 border-l border-border dark:border-border-dark bg-background-white dark:bg-surface-dark flex flex-col h-full overflow-hidden animate-slide-in-right">
              {/* 사이드바 헤더 */}
              <div className="flex items-center justify-between p-4 border-b border-border dark:border-border-dark shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Icon name="task_alt" size="sm" className="text-primary" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-text dark:text-white">작업 상세</h2>
                    <p className="text-xs text-text-secondary">#{selectedTask.id.slice(0, 8)}</p>
                  </div>
                </div>
                <button
                  onClick={closeSidebar}
                  className="text-text-secondary hover:text-text dark:hover:text-white p-1.5 rounded-lg hover:bg-surface dark:hover:bg-background-dark transition-colors"
                >
                  <Icon name="close" size="md" />
                </button>
              </div>

              {/* 사이드바 본문 */}
              <div className="flex-1 overflow-y-auto p-4 space-y-5">
                {/* 제목 */}
                <div>
                  <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wide mb-2">
                    제목
                  </label>
                  <input
                    type="text"
                    value={selectedTask.title}
                    onChange={(e) => setSelectedTask({ ...selectedTask, title: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-surface dark:bg-background-dark border border-border dark:border-border-dark text-text dark:text-white text-sm focus:ring-2 focus:ring-primary/50 focus:border-primary"
                  />
                </div>

                {/* 설명 */}
                <div>
                  <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wide mb-2">
                    설명
                  </label>
                  <textarea
                    value={selectedTask.description || ""}
                    onChange={(e) => setSelectedTask({ ...selectedTask, description: e.target.value })}
                    rows={3}
                    className="w-full px-3 py-2 rounded-lg bg-surface dark:bg-background-dark border border-border dark:border-border-dark text-text dark:text-white text-sm focus:ring-2 focus:ring-primary/50 focus:border-primary resize-none"
                    placeholder="작업에 대한 설명..."
                  />
                </div>

                {/* 상태 */}
                <div>
                  <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wide mb-2">
                    상태
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { value: "PENDING", label: "대기중", color: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400" },
                      { value: "IN_PROGRESS", label: "진행중", color: "bg-sky-100 text-sky-600 dark:bg-sky-900/30 dark:text-sky-400" },
                      { value: "COMPLETED", label: "완료", color: "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400" },
                    ].map((status) => (
                      <button
                        key={status.value}
                        type="button"
                        onClick={() => setSelectedTask({ ...selectedTask, status: status.value as Task["status"] })}
                        className={`px-2 py-1.5 rounded-lg text-xs font-medium transition-all ${
                          selectedTask.status === status.value
                            ? status.color + " ring-2 ring-offset-1 ring-primary"
                            : "bg-surface dark:bg-background-dark text-text-secondary border border-border dark:border-border-dark"
                        }`}
                      >
                        {status.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 우선순위 */}
                <div>
                  <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wide mb-2">
                    우선순위
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { value: "HIGH", label: "높음", color: "bg-rose-100 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400" },
                      { value: "MEDIUM", label: "보통", color: "bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400" },
                      { value: "LOW", label: "낮음", color: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400" },
                    ].map((priority) => (
                      <button
                        key={priority.value}
                        type="button"
                        onClick={() => setSelectedTask({ ...selectedTask, priority: priority.value as Task["priority"] })}
                        className={`px-2 py-1.5 rounded-lg text-xs font-medium transition-all ${
                          selectedTask.priority === priority.value
                            ? priority.color + " ring-2 ring-offset-1 ring-primary"
                            : "bg-surface dark:bg-background-dark text-text-secondary border border-border dark:border-border-dark"
                        }`}
                      >
                        {priority.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 업무협조요청 */}
                <div>
                  <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wide mb-2">
                    업무협조요청
                  </label>
                  <select
                    value={selectedTask.requirementId || ""}
                    onChange={(e) => setSelectedTask({ ...selectedTask, requirementId: e.target.value || null })}
                    className="w-full px-3 py-2 rounded-lg bg-surface dark:bg-background-dark border border-border dark:border-border-dark text-text dark:text-white text-sm focus:ring-2 focus:ring-primary/50 focus:border-primary"
                  >
                    <option value="">협조요청 없음</option>
                    {requirements.map((req) => (
                      <option key={req.id} value={req.id}>
                        {req.code ? `[${req.code}] ` : ""}{req.title}
                      </option>
                    ))}
                  </select>
                </div>

                {/* 연결된 WBS 항목 */}
                <div>
                  <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wide mb-2">
                    연결된 WBS 항목
                  </label>
                  <select
                    value={selectedTask.wbsItemId || ""}
                    onChange={(e) => setSelectedTask({ ...selectedTask, wbsItemId: e.target.value || null })}
                    className="w-full px-3 py-2 rounded-lg bg-surface dark:bg-background-dark border border-border dark:border-border-dark text-text dark:text-white text-sm focus:ring-2 focus:ring-primary/50 focus:border-primary"
                  >
                    <option value="">WBS 항목 없음</option>
                    {wbsItems.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.code ? `[${item.code}] ` : ""}{item.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* 주 담당자 */}
                <div>
                  <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wide mb-2">
                    주 담당자
                  </label>
                  <select
                    value={editTaskAssigneeId}
                    onChange={(e) => setEditTaskAssigneeId(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-surface dark:bg-background-dark border border-border dark:border-border-dark text-text dark:text-white text-sm focus:ring-2 focus:ring-primary/50 focus:border-primary"
                  >
                    <option value="">담당자 없음</option>
                    {teamMembers.map((member) => (
                      <option key={member.userId} value={member.userId}>
                        {member.user?.name || member.user?.email || "알 수 없음"}
                        {member.customRole && ` (${member.customRole})`}
                      </option>
                    ))}
                  </select>
                </div>

                {/* 협업자 */}
                <div>
                  <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wide mb-2">
                    협업자 {editTaskAssigneeIds.length > 0 && (
                      <span className="text-primary">({editTaskAssigneeIds.length}명)</span>
                    )}
                  </label>
                  <div className="max-h-32 overflow-y-auto border border-border dark:border-border-dark rounded-lg bg-surface dark:bg-background-dark">
                    {teamMembers.length === 0 ? (
                      <p className="text-xs text-text-secondary p-3 text-center">팀 멤버가 없습니다</p>
                    ) : (
                      <div className="p-2 grid grid-cols-2 gap-1">
                        {teamMembers.map((member) => (
                          <label
                            key={member.userId}
                            className={`flex items-center gap-2 p-1.5 rounded cursor-pointer transition-colors text-xs ${
                              editTaskAssigneeIds.includes(member.userId)
                                ? "bg-primary/10 border border-primary/30"
                                : "hover:bg-surface-hover dark:hover:bg-surface-dark border border-transparent"
                            }`}
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
                              className="w-3.5 h-3.5 rounded border-border text-primary focus:ring-primary"
                            />
                            <span className="text-text dark:text-white truncate">
                              {member.user?.name || member.user?.email || "알 수 없음"}
                            </span>
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* 진행률 */}
                <div>
                  <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wide mb-2">
                    진행률 ({selectedTask.progress || 0}%)
                  </label>
                  <div className="relative">
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={selectedTask.progress || 0}
                      onChange={(e) => setSelectedTask({ ...selectedTask, progress: parseInt(e.target.value) })}
                      className="w-full h-2 bg-surface dark:bg-background-dark rounded-lg appearance-none cursor-pointer accent-primary"
                    />
                    <div className="flex justify-between text-[10px] text-text-secondary mt-1">
                      <span>0%</span>
                      <span>50%</span>
                      <span>100%</span>
                    </div>
                  </div>
                </div>

                {/* 계획 일정 */}
                <div>
                  <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wide mb-2">
                    📅 계획 일정
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] text-text-secondary mb-1">시작일</label>
                      <input
                        type="date"
                        value={selectedTask.startDate ? selectedTask.startDate.split("T")[0] : ""}
                        onChange={(e) => setSelectedTask({ ...selectedTask, startDate: e.target.value || undefined })}
                        className="w-full px-3 py-2 rounded-lg bg-surface dark:bg-background-dark border border-border dark:border-border-dark text-text dark:text-white text-sm focus:ring-2 focus:ring-primary/50 focus:border-primary"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-text-secondary mb-1">마감일</label>
                      <input
                        type="date"
                        value={selectedTask.dueDate ? selectedTask.dueDate.split("T")[0] : ""}
                        onChange={(e) => setSelectedTask({ ...selectedTask, dueDate: e.target.value || undefined })}
                        className="w-full px-3 py-2 rounded-lg bg-surface dark:bg-background-dark border border-border dark:border-border-dark text-text dark:text-white text-sm focus:ring-2 focus:ring-primary/50 focus:border-primary"
                      />
                    </div>
                  </div>
                </div>

                {/* 실제 일정 */}
                <div>
                  <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wide mb-2">
                    ✅ 실제 일정
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] text-text-secondary mb-1">실제 시작일</label>
                      <input
                        type="date"
                        value={selectedTask.actualStartDate ? selectedTask.actualStartDate.split("T")[0] : ""}
                        onChange={(e) => setSelectedTask({ ...selectedTask, actualStartDate: e.target.value || undefined })}
                        className="w-full px-3 py-2 rounded-lg bg-surface dark:bg-background-dark border border-border dark:border-border-dark text-text dark:text-white text-sm focus:ring-2 focus:ring-primary/50 focus:border-primary"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-text-secondary mb-1">실제 마감일</label>
                      <input
                        type="date"
                        value={selectedTask.actualEndDate ? selectedTask.actualEndDate.split("T")[0] : ""}
                        onChange={(e) => setSelectedTask({ ...selectedTask, actualEndDate: e.target.value || undefined })}
                        className="w-full px-3 py-2 rounded-lg bg-surface dark:bg-background-dark border border-border dark:border-border-dark text-text dark:text-white text-sm focus:ring-2 focus:ring-primary/50 focus:border-primary"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* 사이드바 푸터 */}
              <div className="flex items-center justify-between gap-3 p-4 border-t border-border dark:border-border-dark bg-surface/50 dark:bg-background-dark/50 shrink-0">
                {/* 삭제 버튼 (대기중일 때만) */}
                {selectedTask.status === "PENDING" && (
                  <Button
                    variant="ghost"
                    size="sm"
                    leftIcon="delete"
                    onClick={() => {
                      handleDeleteTask(selectedTask.id, selectedTask.title);
                      closeSidebar();
                    }}
                    className="text-error hover:bg-error/10"
                  >
                    삭제
                  </Button>
                )}
                <div className="flex-1" />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={closeSidebar}
                >
                  취소
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  leftIcon="save"
                  onClick={handleSaveTask}
                  disabled={updateTask.isPending}
                >
                  {updateTask.isPending ? "저장 중..." : "저장"}
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 새 작업 모달 - 넓은 2열 레이아웃 */}
      {showNewTaskModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-background-white dark:bg-surface-dark rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
            {/* 모달 헤더 */}
            <div className="flex items-center justify-between p-5 border-b border-border dark:border-border-dark">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Icon name="add_task" size="md" className="text-primary" />
                </div>
                <h2 className="text-xl font-bold text-text dark:text-white">새 작업</h2>
              </div>
              <button
                onClick={() => setShowNewTaskModal(false)}
                className="text-text-secondary hover:text-text dark:hover:text-white p-1.5 rounded-lg hover:bg-surface dark:hover:bg-background-dark transition-colors"
              >
                <Icon name="close" size="md" />
              </button>
            </div>

            {/* 모달 본문 - 2열 레이아웃 */}
            <form onSubmit={handleCreateTask} className="overflow-y-auto max-h-[calc(90vh-140px)]">
              <div className="p-5 grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* 좌측 컬럼: 기본 정보 */}
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold text-text-secondary uppercase tracking-wide flex items-center gap-2">
                    <Icon name="info" size="sm" />
                    기본 정보
                  </h3>

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

                  {/* 업무협조요청 연결 (선택) */}
                  <div>
                    <label className="block text-sm font-medium text-text dark:text-white mb-2">
                      업무협조요청
                    </label>
                    <select
                      value={newTaskRequirementId}
                      onChange={(e) => setNewTaskRequirementId(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-lg bg-surface dark:bg-background-dark border border-border dark:border-border-dark text-text dark:text-white text-sm focus:ring-2 focus:ring-primary/50 focus:border-primary"
                    >
                      <option value="">협조요청 없음</option>
                      {requirements.map((req) => (
                        <option key={req.id} value={req.id}>
                          {req.code ? `[${req.code}] ` : ""}{req.title}
                        </option>
                      ))}
                    </select>
                    <p className="text-xs text-text-secondary mt-1">
                      이 작업이 특정 업무협조요청과 관련된 경우 연결하세요
                    </p>
                  </div>

                  {/* WBS 항목 연결 (선택) */}
                  <div>
                    <label className="block text-sm font-medium text-text dark:text-white mb-2">
                      연결된 WBS 항목
                    </label>
                    <select
                      value={newTaskWbsItemId}
                      onChange={(e) => setNewTaskWbsItemId(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-lg bg-surface dark:bg-background-dark border border-border dark:border-border-dark text-text dark:text-white text-sm focus:ring-2 focus:ring-primary/50 focus:border-primary"
                    >
                      <option value="">WBS 항목 없음</option>
                      {wbsItems.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.code ? `[${item.code}] ` : ""}{item.name}
                        </option>
                      ))}
                    </select>
                    <p className="text-xs text-text-secondary mt-1">
                      이 작업이 특정 WBS 항목과 관련된 경우 연결하세요
                    </p>
                  </div>

                  {/* 우선순위 */}
                  <div>
                    <label className="block text-sm font-medium text-text dark:text-white mb-2">
                      우선순위
                    </label>
                    <div className="flex gap-2">
                      {[
                        { value: "HIGH", label: "높음", color: "bg-rose-100 text-rose-600 border-rose-200 dark:bg-rose-900/30 dark:text-rose-400 dark:border-rose-800" },
                        { value: "MEDIUM", label: "보통", color: "bg-amber-100 text-amber-600 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800" },
                        { value: "LOW", label: "낮음", color: "bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700" },
                      ].map((priority) => (
                        <button
                          key={priority.value}
                          type="button"
                          onClick={() => setNewTaskPriority(priority.value)}
                          className={`flex-1 px-3 py-2 rounded-lg border text-sm font-medium transition-all ${
                            newTaskPriority === priority.value
                              ? priority.color + " ring-2 ring-offset-1 ring-primary"
                              : "bg-surface dark:bg-background-dark border-border dark:border-border-dark text-text-secondary hover:border-primary/50"
                          }`}
                        >
                          {priority.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* 우측 컬럼: 담당자 및 일정 */}
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold text-text-secondary uppercase tracking-wide flex items-center gap-2">
                    <Icon name="group" size="sm" />
                    담당자 및 일정
                  </h3>

                  {/* 주 담당자 선택 (단일 선택) */}
                  <div>
                    <label className="block text-sm font-medium text-text dark:text-white mb-2">
                      주 담당자
                    </label>
                    <select
                      value={newTaskAssigneeId}
                      onChange={(e) => setNewTaskAssigneeId(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-lg bg-surface dark:bg-background-dark border border-border dark:border-border-dark text-text dark:text-white focus:ring-2 focus:ring-primary/50 focus:border-primary"
                    >
                      <option value="">담당자 없음</option>
                      {teamMembers.map((member) => (
                        <option key={member.userId} value={member.userId}>
                          {member.user?.name || member.user?.email || "알 수 없음"}
                          {member.customRole && ` (${member.customRole})`}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* 부 담당자 선택 (다중 선택, 협업자) */}
                  <div>
                    <label className="block text-sm font-medium text-text dark:text-white mb-2">
                      협업자 {newTaskAssigneeIds.length > 0 && (
                        <span className="text-primary">({newTaskAssigneeIds.length}명 선택)</span>
                      )}
                    </label>
                    <div className="max-h-36 overflow-y-auto border border-border dark:border-border-dark rounded-lg bg-surface dark:bg-background-dark">
                      {teamMembers.length === 0 ? (
                        <p className="text-sm text-text-secondary p-4 text-center">팀 멤버가 없습니다</p>
                      ) : (
                        <div className="p-2 grid grid-cols-2 gap-1">
                          {teamMembers.map((member) => (
                            <label
                              key={member.userId}
                              className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-colors ${
                                newTaskAssigneeIds.includes(member.userId)
                                  ? "bg-primary/10 border border-primary/30"
                                  : "hover:bg-surface-hover dark:hover:bg-surface-dark border border-transparent"
                              }`}
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
                                className="w-4 h-4 rounded border-border text-primary focus:ring-primary"
                              />
                              <span className="text-sm text-text dark:text-white truncate">
                                {member.user?.name || member.user?.email || "알 수 없음"}
                              </span>
                            </label>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* 시작일 & 마감일 */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-text dark:text-white mb-2">
                        시작일
                      </label>
                      <input
                        type="date"
                        value={newTaskStartDate}
                        onChange={(e) => setNewTaskStartDate(e.target.value)}
                        className="w-full px-3 py-2.5 rounded-lg bg-surface dark:bg-background-dark border border-border dark:border-border-dark text-text dark:text-white focus:ring-2 focus:ring-primary/50 focus:border-primary"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-text dark:text-white mb-2">
                        마감일
                      </label>
                      <input
                        type="date"
                        value={newTaskDueDate}
                        onChange={(e) => setNewTaskDueDate(e.target.value)}
                        className="w-full px-3 py-2.5 rounded-lg bg-surface dark:bg-background-dark border border-border dark:border-border-dark text-text dark:text-white focus:ring-2 focus:ring-primary/50 focus:border-primary"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* 모달 푸터 - 버튼 */}
              <div className="flex items-center justify-end gap-3 p-5 border-t border-border dark:border-border-dark bg-surface/50 dark:bg-background-dark/50">
                <Button
                  variant="ghost"
                  type="button"
                  onClick={() => setShowNewTaskModal(false)}
                >
                  취소
                </Button>
                <Button
                  variant="primary"
                  type="submit"
                  leftIcon="add"
                  disabled={createTask.isPending}
                >
                  {createTask.isPending ? "생성 중..." : "작업 생성"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 작업 삭제 확인 모달 */}
      <ConfirmModal
        isOpen={showDeleteConfirm}
        title="작업 삭제"
        message={`"${deletingTaskTitle}" 작업을 삭제하시겠습니까?\n\n이 작업은 되돌릴 수 없습니다.`}
        onConfirm={handleConfirmDelete}
        onCancel={() => {
          setShowDeleteConfirm(false);
          setDeletingTaskId(null);
          setDeletingTaskTitle("");
        }}
        confirmText="삭제"
        cancelText="취소"
        variant="danger"
        isLoading={deleteTask.isPending}
      />

      {/* 컬럼 최대화 모달 (전체화면 그리드 뷰) */}
      {maximizedColumn && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4"
          onClick={closeMaximizedModal}
        >
          {/* 모달 컨텐츠 (배경 클릭해도 안 닫힘) */}
          <div
            className="flex flex-col w-full h-full bg-background dark:bg-background-dark rounded-xl shadow-2xl overflow-hidden relative"
            onClick={(e) => e.stopPropagation()}
          >
            {/* 모달 헤더 */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-border dark:border-border-dark bg-surface dark:bg-surface-dark shrink-0">
              <div className="flex items-center gap-3">
                <h2 className="text-2xl font-bold text-text dark:text-white">
                  {columns.find((c) => c.id === maximizedColumn)?.titleKo} ({columns.find((c) => c.id === maximizedColumn)?.title})
                </h2>
                <span className={`${columns.find((c) => c.id === maximizedColumn)?.bgColor} text-sm px-3 py-1.5 rounded-full font-bold`}>
                  {maximizedColumnTasks.length}개
                </span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs text-text-secondary">ESC 키로 닫기</span>
                <button
                  onClick={closeMaximizedModal}
                  className="p-2 hover:bg-background dark:hover:bg-background-dark rounded-lg transition-colors"
                  title="닫기 (ESC)"
                >
                  <Icon name="close" size="lg" className="text-text-secondary hover:text-error" />
                </button>
              </div>
            </div>

            {/* 그리드 뷰 */}
            <div className="flex-1 overflow-y-auto p-6">
              <div className="grid grid-cols-4 gap-4 auto-rows-min">
                {maximizedColumnTasks.map((task) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    onStatusChange={handleStatusChange}
                    onProgressChange={handleProgressChange}
                    onSelectTask={openSidebar}
                    onDeleteTask={handleDeleteTask}
                    isExpanded={expandedCompletedTaskIds.has(task.id)}
                    onToggleCompleted={toggleCompletedTaskExpand}
                    isSelected={selectedTask?.id === task.id}
                    currentUserId={currentUser?.id}
                    onNudge={(taskId) => nudgeTask.mutate({ taskId })}
                    isNudging={nudgeTask.isPending}
                  />
                ))}
                {maximizedColumnTasks.length === 0 && (
                  <div className="col-span-4 text-center py-20 text-text-secondary">
                    <Icon name="inbox" size="xl" className="mb-4" />
                    <p>작업이 없습니다.</p>
                  </div>
                )}
              </div>
            </div>
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
  onProgressChange,
  onAddTask,
  onSelectTask,
  onDeleteTask,
  expandedCompletedTaskIds,
  onToggleCompleted,
  selectedTaskId,
  currentUserId,
  onNudge,
  isNudging,
  onMaximize,
}: {
  column: ColumnConfig;
  tasks: Task[];
  onStatusChange: (taskId: string, newStatus: string) => void;
  onProgressChange: (taskId: string, newProgress: number) => void;
  onAddTask: () => void;
  onSelectTask: (task: Task) => void;
  onDeleteTask: (taskId: string, taskTitle: string) => void;
  expandedCompletedTaskIds: Set<string>;
  onToggleCompleted: (taskId: string) => void;
  selectedTaskId?: string;
  currentUserId?: string;
  onNudge: (taskId: string) => void;
  isNudging: boolean;
  onMaximize: () => void;
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
      className={`flex flex-col w-[320px] rounded-xl border border-border dark:border-border-dark shadow-sm h-full max-h-full border-t-4 ${column.color} ${column.columnBgColor}`}
    >
      {/* 컬럼 헤더 */}
      <div className={`p-4 flex items-center justify-between border-b border-border dark:border-border-dark rounded-t-lg ${column.headerBgColor}`}>
        <div className="flex items-center gap-2">
          <h3 className="font-bold text-text">
            {column.titleKo} ({column.title})
          </h3>
          <span className={`${column.bgColor} text-xs px-2.5 py-1 rounded-full font-bold`}>
            {tasks.length}
          </span>
        </div>
        {/* 최대화 버튼 */}
        <button
          onClick={onMaximize}
          className="p-2 hover:bg-surface dark:hover:bg-background-dark rounded-lg transition-colors"
          title="그리드 보기 (전체화면)"
        >
          <Icon name="grid_view" size="sm" className="text-text-secondary hover:text-primary" />
        </button>
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
              onProgressChange={onProgressChange}
              onSelectTask={onSelectTask}
              onDeleteTask={onDeleteTask}
              isExpanded={expandedCompletedTaskIds.has(task.id)}
              onToggleCompleted={onToggleCompleted}
              isSelected={selectedTaskId === task.id}
              currentUserId={currentUserId}
              onNudge={onNudge}
              isNudging={isNudging}
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
  onProgressChange,
  onSelectTask,
  onDeleteTask,
  isExpanded,
  onToggleCompleted,
  isSelected,
  currentUserId,
  onNudge,
  isNudging,
}: {
  task: Task;
  onStatusChange: (taskId: string, newStatus: string) => void;
  onProgressChange: (taskId: string, newProgress: number) => void;
  onSelectTask: (task: Task) => void;
  onDeleteTask: (taskId: string, taskTitle: string) => void;
  isExpanded: boolean;
  onToggleCompleted: (taskId: string) => void;
  isSelected: boolean;
  currentUserId?: string;
  onNudge: (taskId: string) => void;
  isNudging: boolean;
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
        onProgressChange={onProgressChange}
        onSelectTask={onSelectTask}
        onDeleteTask={onDeleteTask}
        isDragging={isDragging}
        isExpanded={isExpanded}
        onToggleCompleted={onToggleCompleted}
        isSelected={isSelected}
        currentUserId={currentUserId}
        onNudge={onNudge}
        isNudging={isNudging}
      />
    </div>
  );
}

/**
 * 작업 카드 컴포넌트
 *
 * 주요 기능:
 * - 대기중(PENDING) 상태일 때 삭제 버튼 표시
 * - 완료(COMPLETED) 상태일 때 컴팩트 뷰 (클릭하면 확장)
 */
function TaskCard({
  task,
  onStatusChange,
  onProgressChange,
  onSelectTask,
  onDeleteTask,
  isDragging = false,
  isExpanded = false,
  onToggleCompleted,
  isSelected = false,
  currentUserId,
  onNudge,
  isNudging = false,
}: {
  task: Task;
  onStatusChange: (taskId: string, newStatus: string) => void;
  onProgressChange: (taskId: string, newProgress: number) => void;
  onSelectTask?: (task: Task) => void;
  onDeleteTask?: (taskId: string, taskTitle: string) => void;
  isDragging?: boolean;
  isExpanded?: boolean;
  onToggleCompleted?: (taskId: string) => void;
  isSelected?: boolean;
  currentUserId?: string;
  onNudge?: (taskId: string) => void;
  isNudging?: boolean;
}) {
  const priority = priorityConfig[task.priority] || priorityConfig.MEDIUM;
  const isCompleted = task.status === "COMPLETED";

  // 지연 여부: DELAYED 상태이거나, 완료되지 않았으면서 마감일이 지난 경우
  const isDelayed = task.status === "DELAYED" || (
    task.status !== "COMPLETED" &&
    task.dueDate &&
    new Date(task.dueDate) < new Date()
  );

  const isPending = task.status === "PENDING";

  // 내 태스크인지 확인 (주 담당자이거나 부 담당자에 포함)
  const isMyTask = currentUserId && (
    task.assigneeId === currentUserId ||
    task.assignees?.some((a) => a.id === currentUserId)
  );

  // 재촉 가능 여부 (내 태스크가 아니고, 완료되지 않은 경우)
  const canNudge = !isMyTask && !isCompleted && currentUserId;

  // 재촉 수
  const nudgeCount = task.nudges?.length || 0;

  // 담당자 정보 (주 담당자 또는 첫 번째 협업자)
  const primaryAssignee = task.assignee || (task.assignees && task.assignees.length > 0 ? task.assignees[0] : null);

  // 모든 담당자 목록 (주 담당자 + 부 담당자, 중복 제거)
  const allAssignees = (() => {
    const assigneeMap = new Map<string, { id: string; name: string | null; avatar: string | null }>();
    // 주 담당자 추가
    if (task.assignee && task.assignee.id) {
      assigneeMap.set(task.assignee.id, {
        id: task.assignee.id,
        name: task.assignee.name ?? null,
        avatar: task.assignee.avatar ?? null,
      });
    }
    // 부 담당자들 추가
    if (task.assignees && Array.isArray(task.assignees)) {
      task.assignees.forEach((a) => {
        if (a && a.id && !assigneeMap.has(a.id)) {
          assigneeMap.set(a.id, {
            id: a.id,
            name: a.name ?? null,
            avatar: a.avatar ?? null,
          });
        }
      });
    }
    return Array.from(assigneeMap.values());
  })();

  // 완료된 task: 컴팩트 뷰 (isExpanded가 false일 때) - 글래스모피즘
  if (isCompleted && !isExpanded) {
    return (
      <div
        onClick={(e) => {
          e.stopPropagation();
          onToggleCompleted?.(task.id);
        }}
        onPointerDown={(e) => e.stopPropagation()}
        className={`
          relative p-2.5 rounded-xl border border-white/10 dark:border-white/5
          cursor-pointer transition-all
          backdrop-blur-md bg-gradient-to-br from-emerald-500/10 to-emerald-600/5
          dark:from-emerald-400/15 dark:to-emerald-500/10
          hover:from-emerald-500/20 hover:to-emerald-600/10
          dark:hover:from-emerald-400/25 dark:hover:to-emerald-500/15
          shadow-lg hover:shadow-xl
          ${isDragging ? "opacity-50 shadow-2xl ring-2 ring-primary scale-105" : ""}
        `}
      >
        <div className="flex items-center gap-2">
          <Icon name="check_circle" size="xs" className="text-success flex-shrink-0" />
          <span className="text-xs font-medium text-text-secondary line-through truncate flex-1">
            {task.title}
          </span>
          {/* 담당자 아바타 + 이름 */}
          {primaryAssignee && (
            <div className="flex items-center gap-1 flex-shrink-0">
              {primaryAssignee.avatar ? (
                <img
                  src={primaryAssignee.avatar}
                  alt={primaryAssignee.name || ""}
                  className="size-5 rounded-full object-cover ring-2 ring-white/20"
                />
              ) : (
                <div className="size-5 rounded-full bg-success/30 backdrop-blur-sm flex items-center justify-center text-[9px] font-bold text-success ring-2 ring-white/20">
                  {primaryAssignee.name?.charAt(0) || "?"}
                </div>
              )}
              <span className="text-[10px] text-text-secondary max-w-[60px] truncate">
                {primaryAssignee.name || ""}
              </span>
            </div>
          )}
          <Icon name="expand_more" size="xs" className="text-text-secondary flex-shrink-0" />
        </div>
      </div>
    );
  }

  return (
    <div
      onClick={(e) => {
        e.stopPropagation();
        onSelectTask?.(task);
      }}
      className={`
        relative p-4 rounded-xl border transition-all group
        cursor-grab active:cursor-grabbing
        backdrop-blur-lg shadow-lg hover:shadow-xl
        ${isDragging ? "opacity-50 shadow-2xl ring-2 ring-primary scale-105" : ""}
        ${isSelected ? "ring-2 ring-primary border-primary/50 shadow-2xl bg-gradient-to-br from-primary/10 via-transparent to-primary/5 dark:from-primary/20 dark:via-transparent dark:to-primary/10" : ""}
        ${isCompleted && !isSelected
          ? "opacity-90 hover:opacity-100 border-white/10 dark:border-white/5 bg-gradient-to-br from-emerald-500/10 to-emerald-600/5 dark:from-emerald-400/15 dark:to-emerald-500/10 hover:from-emerald-500/15 hover:to-emerald-600/10 dark:hover:from-emerald-400/20 dark:hover:to-emerald-500/15"
          : ""}
        ${isDelayed && !isSelected
          ? "border-rose-400/30 dark:border-rose-500/20 ring-1 ring-rose-200/20 dark:ring-rose-900/30 bg-gradient-to-br from-rose-500/10 to-rose-600/5 dark:from-rose-400/15 dark:to-rose-500/10"
          : ""}
        ${!isCompleted && !isDelayed && !isSelected
          ? "border-white/10 dark:border-white/5 bg-gradient-to-br from-white/80 to-white/40 dark:from-slate-800/80 dark:to-slate-900/60 hover:from-white/90 hover:to-white/50 dark:hover:from-slate-800/90 dark:hover:to-slate-900/70 hover:ring-2 hover:ring-primary/30"
          : ""}
      `}
    >
      {/* 드래그 핸들 아이콘 */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Icon name="drag_indicator" size="xs" className="text-text-secondary opacity-50 group-hover:opacity-100" />
          {isCompleted ? (
            <div className="flex items-center gap-1 text-success text-xs font-bold backdrop-blur-sm bg-emerald-500/15 dark:bg-emerald-400/20 px-2 py-1 rounded-full border border-emerald-300/30 dark:border-emerald-400/20 shadow-md">
              <Icon name="check_circle" size="xs" />
              <span>완료</span>
              {/* 축소 버튼 */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleCompleted?.(task.id);
                }}
                onPointerDown={(e) => e.stopPropagation()}
                className="ml-1 p-0.5 rounded-full hover:bg-success/20 dark:hover:bg-success/30 transition-colors"
                title="축소"
              >
                <Icon name="expand_less" size="xs" className="text-success" />
              </button>
            </div>
          ) : isDelayed ? (
            <div className="flex items-center gap-1 text-rose-500 dark:text-rose-400 text-xs font-bold backdrop-blur-sm bg-rose-500/10 dark:bg-rose-400/15 px-2 py-1 rounded-full border border-rose-300/30 dark:border-rose-400/20 shadow-md">
              <Icon name="warning" size="xs" />
              <span>지연</span>
            </div>
          ) : (
            <span className={`${priority.bgColor} ${priority.textColor} text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wider backdrop-blur-sm border border-white/20 dark:border-white/10 shadow-md`}>
              {priority.label}
            </span>
          )}
          {/* 재촉 버튼 - 우선순위 옆 */}
          {canNudge && onNudge && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onNudge(task.id);
              }}
              onPointerDown={(e) => e.stopPropagation()}
              disabled={isNudging}
              className={`flex items-center gap-0.5 px-1.5 py-0.5 rounded-full transition-all disabled:opacity-50 backdrop-blur-sm shadow-md text-[10px] ${
                nudgeCount > 0
                  ? "bg-gradient-to-br from-amber-400/30 to-amber-500/20 dark:from-amber-400/40 dark:to-amber-500/30 border border-amber-300/30 dark:border-amber-400/20 text-amber-700 dark:text-amber-300 hover:from-amber-400/40 hover:to-amber-500/30 dark:hover:from-amber-400/50 dark:hover:to-amber-500/40"
                  : "bg-gradient-to-br from-amber-300/20 to-amber-400/10 dark:from-amber-400/25 dark:to-amber-500/15 border border-amber-200/30 dark:border-amber-400/20 text-amber-600 dark:text-amber-400 hover:from-amber-300/30 hover:to-amber-400/20 dark:hover:from-amber-400/35 dark:hover:to-amber-500/25"
              }`}
              title={nudgeCount > 0
                ? `${nudgeCount}회 재촉됨\n${task.nudges?.map((n) => `${n.nudger.name || "알 수 없음"}님`).join(", ")}\n클릭하여 추가 재촉`
                : "재촉하기"
              }
            >
              <Icon name={nudgeCount > 0 ? "notifications_active" : "notifications"} size="xs" />
              {nudgeCount > 0 && (
                <span className="font-bold">{nudgeCount}</span>
              )}
            </button>
          )}
        </div>
        {/* 상태 변경 드롭다운 & 수정/삭제 버튼 */}
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
            <option value="COMPLETED">완료</option>
          </select>
          {/* 삭제 버튼: 대기중(PENDING) 상태에서만 표시 */}
          {isPending && onDeleteTask && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDeleteTask(task.id, task.title);
              }}
              onPointerDown={(e) => e.stopPropagation()}
              className="size-6 rounded flex items-center justify-center hover:bg-error/10 text-text-secondary hover:text-error transition-colors opacity-0 group-hover:opacity-100"
              title="삭제 (대기중 상태에서만 가능)"
            >
              <Icon name="delete" size="xs" />
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

      {/* 진행률 바 */}
      {!isCompleted && (
        <div className="mb-3">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] font-medium text-text-secondary">진행률</span>
            <span className="text-xs font-bold text-primary">{task.progress || 0}%</span>
          </div>
          <div className="relative h-2 bg-surface dark:bg-background-dark rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-primary to-primary/80 transition-all duration-300 rounded-full"
              style={{ width: `${task.progress || 0}%` }}
            />
            {/* 진행률 슬라이더 (클릭 시 수정 가능) */}
            <input
              type="range"
              min="0"
              max="100"
              value={task.progress || 0}
              onChange={(e) => {
                e.stopPropagation();
                onProgressChange(task.id, parseInt(e.target.value));
              }}
              onClick={(e) => e.stopPropagation()}
              onPointerDown={(e) => e.stopPropagation()}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              title={`진행률: ${task.progress || 0}%`}
            />
          </div>
        </div>
      )}

      {/* 날짜 정보 (계획 / 실제) */}
      {(task.startDate || task.dueDate || task.actualStartDate || task.actualEndDate) && (
        <div className="mb-3 space-y-1.5">
          {/* 계획 일정 */}
          {(task.startDate || task.dueDate) && (
            <div className="px-2 py-1.5 rounded-lg backdrop-blur-sm bg-gradient-to-br from-blue-500/20 to-blue-600/10 dark:from-blue-400/25 dark:to-blue-500/15 border border-blue-200/30 dark:border-blue-400/20">
              <div className="flex items-center gap-1.5">
                <Icon name="event" size="xs" className="text-blue-600 dark:text-blue-400 flex-shrink-0" />
                <span className="text-[10px] font-semibold text-blue-700 dark:text-blue-300">계획</span>
                <span className="text-[10px] text-blue-600 dark:text-blue-400">
                  {task.startDate && new Date(task.startDate).toLocaleDateString("ko-KR", { month: "short", day: "numeric" })}
                  {task.startDate && task.dueDate && " ~ "}
                  {task.dueDate && new Date(task.dueDate).toLocaleDateString("ko-KR", { month: "short", day: "numeric" })}
                </span>
              </div>
            </div>
          )}
          {/* 실제 일정 */}
          {(task.actualStartDate || task.actualEndDate) && (
            <div className="px-2 py-1.5 rounded-lg backdrop-blur-sm bg-gradient-to-br from-green-500/20 to-green-600/10 dark:from-green-400/25 dark:to-green-500/15 border border-green-200/30 dark:border-green-400/20">
              <div className="flex items-center gap-1.5">
                <Icon name="check_circle" size="xs" className="text-green-600 dark:text-green-400 flex-shrink-0" />
                <span className="text-[10px] font-semibold text-green-700 dark:text-green-300">실제</span>
                <span className="text-[10px] text-green-600 dark:text-green-400">
                  {task.actualStartDate && new Date(task.actualStartDate).toLocaleDateString("ko-KR", { month: "short", day: "numeric" })}
                  {task.actualStartDate && task.actualEndDate && " ~ "}
                  {task.actualEndDate && new Date(task.actualEndDate).toLocaleDateString("ko-KR", { month: "short", day: "numeric" })}
                </span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 설명 */}
      {task.description && (
        <p className="text-xs text-text-secondary line-clamp-2 mb-3">
          {task.description}
        </p>
      )}

      {/* 업무협조요청 - 글래스모피즘 */}
      {task.requirement && (
        <div className="mb-3 px-2 py-1.5 rounded-lg backdrop-blur-sm bg-gradient-to-br from-purple-500/20 to-purple-600/10 dark:from-purple-400/25 dark:to-purple-500/15 border border-purple-200/30 dark:border-purple-400/20 shadow-md">
          <div className="flex items-center gap-1.5">
            <Icon name="link" size="xs" className="text-purple-600 dark:text-purple-400 flex-shrink-0" />
            {task.requirement.code && (
              <span className="text-[10px] font-bold text-white bg-purple-600/90 dark:bg-purple-500/90 backdrop-blur-sm px-1.5 py-0.5 rounded flex-shrink-0 shadow-sm">
                {task.requirement.code}
              </span>
            )}
            <span className="text-[11px] font-medium text-purple-700 dark:text-purple-300 truncate">
              {task.requirement.title}
            </span>
          </div>
        </div>
      )}

      {/* 연결된 WBS 항목 - 글래스모피즘 */}
      {task.wbsItem && (
        <div className="mb-3 px-2 py-1.5 rounded-lg backdrop-blur-sm bg-gradient-to-br from-cyan-500/20 to-cyan-600/10 dark:from-cyan-400/25 dark:to-cyan-500/15 border border-cyan-200/30 dark:border-cyan-400/20 shadow-md">
          <div className="flex items-center gap-1.5">
            <Icon name="account_tree" size="xs" className="text-cyan-600 dark:text-cyan-400 flex-shrink-0" />
            {task.wbsItem.code && (
              <span className="text-[10px] font-bold text-white bg-cyan-600/90 dark:bg-cyan-500/90 backdrop-blur-sm px-1.5 py-0.5 rounded flex-shrink-0 shadow-sm">
                {task.wbsItem.code}
              </span>
            )}
            <span className="text-[11px] font-medium text-cyan-700 dark:text-cyan-300 truncate">
              {task.wbsItem.name}
            </span>
          </div>
        </div>
      )}

      {/* 하단: 담당자 및 메타 정보 */}
      <div className="flex items-center justify-between mt-3">
        {/* 다중 담당자 표시 (아바타 + 이름) - 글래스모피즘 효과 */}
        <div className="flex items-center gap-2">
          <div className="flex -space-x-1.5">
            {allAssignees.length > 0 ? (
              <>
                {allAssignees.slice(0, 3).map((assignee) => (
                  assignee.avatar ? (
                    <img
                      key={assignee.id}
                      src={assignee.avatar}
                      alt={assignee.name || "담당자"}
                      className="size-6 rounded-full object-cover border-2 border-white/30 dark:border-white/10 ring-1 ring-white/20 dark:ring-white/5 shadow-md"
                      title={assignee.name || ""}
                    />
                  ) : (
                    <div
                      key={assignee.id}
                      className="size-6 rounded-full bg-primary/80 backdrop-blur-sm flex items-center justify-center text-[10px] font-bold text-white border-2 border-white/30 dark:border-white/10 ring-1 ring-white/20 dark:ring-white/5 shadow-md"
                      title={assignee.name || ""}
                    >
                      {assignee.name?.charAt(0) || "?"}
                    </div>
                  )
                ))}
                {allAssignees.length > 3 && (
                  <div className="size-6 rounded-full bg-text-secondary/80 backdrop-blur-sm flex items-center justify-center text-[10px] font-bold text-white border-2 border-white/30 dark:border-white/10 ring-1 ring-white/20 dark:ring-white/5 shadow-md">
                    +{allAssignees.length - 3}
                  </div>
                )}
              </>
            ) : (
              <div className="size-6 rounded-full bg-text-secondary/50 backdrop-blur-sm flex items-center justify-center text-[10px] font-bold text-white ring-1 ring-white/10 shadow-sm">
                --
              </div>
            )}
          </div>
          {/* 담당자 이름 표시 */}
          {primaryAssignee && (
            <span className="text-xs text-text-secondary truncate max-w-[100px]">
              {primaryAssignee.name || ""}
              {allAssignees.length > 1 && (
                <span className="text-text-secondary/70"> 외 {allAssignees.length - 1}명</span>
              )}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 text-text-secondary text-xs">
          {/* 실제 시작일 ~ 실제 마감일 표시 */}
          {(task.actualStartDate || task.actualEndDate) && (
            <div className="flex items-center gap-1">
              <Icon name="event_available" size="xs" className="text-green-500" />
              <span className="text-green-600 dark:text-green-400 text-[10px] font-medium">
                {task.actualStartDate
                  ? new Date(task.actualStartDate).toLocaleDateString("ko-KR", { month: "short", day: "numeric" })
                  : ""}
                {task.actualStartDate && task.actualEndDate && " ~ "}
                {task.actualEndDate
                  ? new Date(task.actualEndDate).toLocaleDateString("ko-KR", { month: "short", day: "numeric" })
                  : ""}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
