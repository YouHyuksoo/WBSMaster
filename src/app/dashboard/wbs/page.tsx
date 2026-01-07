/**
 * @file src/app/dashboard/wbs/page.tsx
 * @description
 * WBS(Work Breakdown Structure) 관리 페이지입니다.
 * 4단계 계층 구조(대분류 > 중분류 > 소분류 > 단위업무)를 지원합니다.
 *
 * 초보자 가이드:
 * 1. **트리 구조**: 계층적 WBS 항목을 트리 형태로 표시
 * 2. **레벨 구분**: LEVEL1(대), LEVEL2(중), LEVEL3(소), LEVEL4(단위업무)
 * 3. **간트 차트**: 우측에 타임라인 기반 일정 표시
 *
 * 수정 방법:
 * - 프로젝트 선택: selectedProjectId 변경
 * - 레벨 추가: WbsLevel enum 및 UI 수정
 */

"use client";

import { useState, useMemo, useCallback, useRef, useEffect } from "react";
import { Icon, Button, Input, useToast } from "@/components/ui";
import { useWbsItems, useCreateWbsItem, useUpdateWbsItem, useDeleteWbsItem, useChangeWbsLevel, useMembers, useCreateTask } from "@/hooks";
import { useProject } from "@/contexts/ProjectContext";
import type { WbsItem, WbsLevel } from "@/lib/api";

/** 레벨별 표시명 (짧은 버전) */
const levelNames: Record<WbsLevel, string> = {
  LEVEL1: "대",
  LEVEL2: "중",
  LEVEL3: "소",
  LEVEL4: "단",
};

/** 레벨별 색상 */
const levelColors: Record<WbsLevel, string> = {
  LEVEL1: "bg-blue-500",
  LEVEL2: "bg-green-500",
  LEVEL3: "bg-yellow-500",
  LEVEL4: "bg-purple-500",
};

/** 상태별 색상 */
const statusColors: Record<string, string> = {
  PENDING: "bg-gray-400",
  IN_PROGRESS: "bg-primary",
  HOLDING: "bg-warning",
  COMPLETED: "bg-success",
  CANCELLED: "bg-error",
};

/** 상태 표시명 */
const statusNames: Record<string, string> = {
  PENDING: "대기",
  IN_PROGRESS: "진행중",
  HOLDING: "보류",
  COMPLETED: "완료",
  CANCELLED: "취소",
};

/** 작업일수 계산 (시작일 ~ 종료일) */
const calculateWorkDays = (startDate: string | null | undefined, endDate: string | null | undefined): number | null => {
  if (!startDate || !endDate) return null;
  const start = new Date(startDate);
  const end = new Date(endDate);
  const diffTime = end.getTime() - start.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; // 시작일 포함
  return diffDays > 0 ? diffDays : 1;
};

/** 날짜 생성 헬퍼 */
const generateDates = (startDate: Date, days: number) => {
  const dates = [];
  const dayNames = ["일", "월", "화", "수", "목", "금", "토"];

  for (let i = 0; i < days; i++) {
    const date = new Date(startDate);
    date.setDate(date.getDate() + i);
    dates.push({
      date,
      day: date.getDate(),
      month: date.getMonth() + 1,
      dayName: dayNames[date.getDay()],
      isWeekend: date.getDay() === 0 || date.getDay() === 6,
      isToday:
        date.getFullYear() === new Date().getFullYear() &&
        date.getMonth() === new Date().getMonth() &&
        date.getDate() === new Date().getDate(),
    });
  }
  return dates;
};

/**
 * WBS 트리 항목 컴포넌트
 * 재귀적으로 자식 항목을 렌더링
 */
interface WbsTreeItemProps {
  item: WbsItem;
  expandedIds: Set<string>;
  selectedId: string | null;
  onToggle: (id: string) => void;
  onSelect: (id: string) => void;
  onAddChild: (parentId: string, level: WbsLevel) => void;
  onEdit: (item: WbsItem) => void;
  onDelete: (id: string) => void;
  onLevelUp: (id: string) => void;
  onLevelDown: (id: string) => void;
  onRegisterTask: (item: WbsItem) => void;
}

function WbsTreeItem({
  item,
  expandedIds,
  selectedId,
  onToggle,
  onSelect,
  onAddChild,
  onEdit,
  onDelete,
  onLevelUp,
  onLevelDown,
  onRegisterTask,
}: WbsTreeItemProps) {
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const isExpanded = expandedIds.has(item.id);
  const isSelected = selectedId === item.id;
  const hasChildren = item.children && item.children.length > 0;
  const indent = (item.levelNumber - 1) * 28; // 레벨당 28px 들여쓰기
  const workDays = calculateWorkDays(item.startDate, item.endDate);

  // 다음 레벨 계산
  const nextLevel = `LEVEL${item.levelNumber + 1}` as WbsLevel;
  const canAddChild = item.levelNumber < 4; // LEVEL4까지만 지원

  // 메뉴 외부 클릭 시 닫기
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMenu(false);
      }
    };
    if (showMenu) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [showMenu]);

  return (
    <>
      {/* 현재 항목 */}
      <div
        onClick={() => onSelect(item.id)}
        className={`
          h-12 border-b border-border dark:border-border-dark flex items-center
          cursor-pointer transition-colors group
          ${isSelected ? "bg-primary/10 border-l-3 border-l-primary" : "hover:bg-surface dark:hover:bg-surface-dark"}
        `}
        style={{ paddingLeft: `${16 + indent}px` }}
      >
        {/* 확장/축소 버튼 */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggle(item.id);
          }}
          className="size-7 flex items-center justify-center text-text-secondary hover:text-text dark:hover:text-white mr-1"
        >
          {hasChildren ? (
            <Icon name={isExpanded ? "expand_more" : "chevron_right"} size="md" />
          ) : (
            <span className="size-5" /> // 빈 공간
          )}
        </button>

        {/* 더보기 메뉴 버튼 (호버 시 표시) */}
        <div className="relative" ref={menuRef}>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowMenu(!showMenu);
            }}
            className={`size-6 rounded flex items-center justify-center mr-1 transition-all
              ${showMenu
                ? "bg-primary text-white"
                : "opacity-0 group-hover:opacity-100 text-text-secondary hover:bg-surface-hover dark:hover:bg-surface-dark hover:text-text dark:hover:text-white"
              }
            `}
            title="메뉴"
          >
            <Icon name="more_vert" size="sm" />
          </button>

          {/* 드롭다운 메뉴 */}
          {showMenu && (
            <div className="absolute left-0 top-7 z-50 bg-background-white dark:bg-surface-dark border border-border dark:border-border-dark rounded-lg shadow-lg py-1 min-w-[140px] animate-slide-in-down">
              {/* 하위 추가 */}
              {canAddChild && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onAddChild(item.id, nextLevel);
                    setShowMenu(false);
                  }}
                  className="w-full px-3 py-2 text-left text-sm flex items-center gap-2 hover:bg-surface dark:hover:bg-background-dark text-text dark:text-white"
                >
                  <Icon name="add" size="sm" className="text-primary" />
                  <span>{levelNames[nextLevel]} 추가</span>
                </button>
              )}
              {/* 수정 */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit(item);
                  setShowMenu(false);
                }}
                className="w-full px-3 py-2 text-left text-sm flex items-center gap-2 hover:bg-surface dark:hover:bg-background-dark text-text dark:text-white"
              >
                <Icon name="edit" size="sm" className="text-text-secondary" />
                <span>수정</span>
              </button>
              {/* 레벨 변경 구분선 */}
              {(item.levelNumber > 1 || item.levelNumber < 4) && (
                <div className="h-px bg-border dark:bg-border-dark my-1" />
              )}
              {/* 레벨 올리기 */}
              {item.levelNumber > 1 && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onLevelUp(item.id);
                    setShowMenu(false);
                  }}
                  className="w-full px-3 py-2 text-left text-sm flex items-center gap-2 hover:bg-surface dark:hover:bg-background-dark text-text dark:text-white"
                >
                  <Icon name="arrow_upward" size="sm" className="text-blue-500" />
                  <span>레벨 올리기</span>
                </button>
              )}
              {/* 레벨 내리기 */}
              {item.levelNumber < 4 && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onLevelDown(item.id);
                    setShowMenu(false);
                  }}
                  className="w-full px-3 py-2 text-left text-sm flex items-center gap-2 hover:bg-surface dark:hover:bg-background-dark text-text dark:text-white"
                >
                  <Icon name="arrow_downward" size="sm" className="text-orange-500" />
                  <span>레벨 내리기</span>
                </button>
              )}
              {/* Task로 등록 (LEVEL4 단위업무만) */}
              {item.levelNumber === 4 && (
                <>
                  <div className="h-px bg-border dark:bg-border-dark my-1" />
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onRegisterTask(item);
                      setShowMenu(false);
                    }}
                    className="w-full px-3 py-2 text-left text-sm flex items-center gap-2 hover:bg-primary/10 text-primary"
                  >
                    <Icon name="assignment" size="sm" />
                    <span>Task로 등록</span>
                  </button>
                </>
              )}
              {/* 삭제 구분선 */}
              <div className="h-px bg-border dark:bg-border-dark my-1" />
              {/* 삭제 */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(item.id);
                  setShowMenu(false);
                }}
                className="w-full px-3 py-2 text-left text-sm flex items-center gap-2 hover:bg-error/10 text-error"
              >
                <Icon name="delete" size="sm" />
                <span>삭제</span>
              </button>
            </div>
          )}
        </div>

        {/* 레벨 배지 */}
        <span
          className={`size-6 rounded flex items-center justify-center text-xs font-bold text-white mr-2 ${levelColors[item.level]}`}
        >
          {levelNames[item.level]}
        </span>

        {/* WBS 코드 */}
        <span className="text-sm text-text-secondary mr-3 font-mono font-medium whitespace-nowrap">{item.code}</span>

        {/* 항목명 */}
        <span
          className={`flex-1 text-base truncate font-medium ${
            isSelected ? "text-primary" : "text-text dark:text-white"
          }`}
          title={item.name}
        >
          {item.name}
        </span>

        {/* 기간 (시작일~종료일 + 작업일수) */}
        <div className="w-36 flex-shrink-0 text-center">
          {item.startDate && item.endDate ? (
            <div className="flex items-center justify-center gap-1">
              <span className="text-xs text-text-secondary font-medium">
                {new Date(item.startDate).toLocaleDateString("ko-KR", { month: "2-digit", day: "2-digit" })}
                ~
                {new Date(item.endDate).toLocaleDateString("ko-KR", { month: "2-digit", day: "2-digit" })}
              </span>
              {workDays && (
                <span className="text-xs font-semibold text-primary bg-primary/10 px-1.5 py-0.5 rounded">
                  {workDays}일
                </span>
              )}
            </div>
          ) : (
            <span className="text-xs text-text-secondary">-</span>
          )}
        </div>

        {/* 진행률 */}
        <div className="w-20 flex-shrink-0 text-center">
          <div className="h-2 bg-background dark:bg-background-dark rounded-full overflow-hidden mx-1">
            <div
              className="h-full bg-primary rounded-full transition-all"
              style={{ width: `${item.progress}%` }}
            />
          </div>
          <span className="text-xs text-text-secondary font-medium">{item.progress}%</span>
        </div>

        {/* 상태 */}
        <div className="w-16 flex-shrink-0 flex justify-center">
          <span
            className={`px-2 py-0.5 rounded text-xs font-semibold text-white ${statusColors[item.status]}`}
          >
            {statusNames[item.status]}
          </span>
        </div>

        {/* 담당자 */}
        <div className="w-16 flex justify-center -space-x-1.5 flex-shrink-0">
          {item.assignees && item.assignees.length > 0 ? (
            item.assignees.slice(0, 3).map((assignee) =>
              assignee.avatar ? (
                <img
                  key={assignee.id}
                  src={assignee.avatar}
                  alt={assignee.name || "담당자"}
                  className="size-7 rounded-full object-cover border-2 border-background-white dark:border-background-dark"
                  title={assignee.name || ""}
                />
              ) : (
                <div
                  key={assignee.id}
                  className="size-7 rounded-full bg-primary/20 flex items-center justify-center border-2 border-background-white dark:border-background-dark"
                  title={assignee.name || ""}
                >
                  <span className="text-xs font-semibold text-primary">
                    {assignee.name?.charAt(0) || "?"}
                  </span>
                </div>
              )
            )
          ) : (
            <span className="text-sm text-text-secondary">-</span>
          )}
        </div>
      </div>

      {/* 자식 항목 (확장된 경우) */}
      {isExpanded && hasChildren && (
        <>
          {item.children!.map((child) => (
            <WbsTreeItem
              key={child.id}
              item={child}
              expandedIds={expandedIds}
              selectedId={selectedId}
              onToggle={onToggle}
              onSelect={onSelect}
              onAddChild={onAddChild}
              onEdit={onEdit}
              onDelete={onDelete}
              onLevelUp={onLevelUp}
              onLevelDown={onLevelDown}
              onRegisterTask={onRegisterTask}
            />
          ))}
        </>
      )}
    </>
  );
}

/**
 * WBS 페이지 컴포넌트
 */
export default function WBSPage() {
  const toast = useToast();

  // 프로젝트 Context에서 선택된 프로젝트 가져오기
  const { selectedProjectId, selectedProject } = useProject();

  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingItem, setEditingItem] = useState<WbsItem | null>(null);

  // 패널 리사이즈 상태
  const [panelWidth, setPanelWidth] = useState(620); // 기간 컬럼 통합으로 축소

  // 간트 차트 드래그/리사이즈 상태
  const [dragState, setDragState] = useState<{
    itemId: string;
    type: "move" | "resize-left" | "resize-right";
    startX: number;
    originalStartDate: string;
    originalEndDate: string;
  } | null>(null);
  const isResizing = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // 새 항목 폼 상태
  const [newItem, setNewItem] = useState({
    name: "",
    description: "",
    level: "LEVEL1" as WbsLevel,
    parentId: undefined as string | undefined,
    assigneeIds: [] as string[],
    startDate: "",
    endDate: "",
  });

  /** WBS 목록 조회 (트리 구조) */
  const { data: wbsTree = [], isLoading, error } = useWbsItems(
    selectedProjectId ? { projectId: selectedProjectId } : undefined
  );

  /** 프로젝트 팀 멤버 목록 조회 */
  const { data: teamMembers = [] } = useMembers(
    selectedProjectId ? { projectId: selectedProjectId } : undefined
  );

  /** WBS CRUD */
  const createWbs = useCreateWbsItem();
  const updateWbs = useUpdateWbsItem();
  const deleteWbs = useDeleteWbsItem();
  const changeLevel = useChangeWbsLevel();

  /** Task 생성 */
  const createTask = useCreateTask();

  /** 리사이즈 시작 */
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    isResizing.current = true;
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
  }, []);

  /** 리사이즈 중 */
  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isResizing.current || !containerRef.current) return;
    const containerRect = containerRef.current.getBoundingClientRect();
    const newWidth = e.clientX - containerRect.left;
    // 최소 400px, 최대 컨테이너의 70%
    const maxWidth = containerRect.width * 0.7;
    setPanelWidth(Math.min(Math.max(400, newWidth), maxWidth));
  }, []);

  /** 리사이즈 종료 */
  const handleMouseUp = useCallback(() => {
    isResizing.current = false;
    document.body.style.cursor = "";
    document.body.style.userSelect = "";
  }, []);

  /** 간트 바 드래그 시작 */
  const handleGanttDragStart = useCallback((
    e: React.MouseEvent,
    itemId: string,
    type: "move" | "resize-left" | "resize-right",
    startDate: string | null,
    endDate: string | null
  ) => {
    e.preventDefault();
    e.stopPropagation();
    setDragState({
      itemId,
      type,
      startX: e.clientX,
      originalStartDate: startDate || new Date().toISOString().split("T")[0],
      originalEndDate: endDate || new Date().toISOString().split("T")[0],
    });
    document.body.style.cursor = type === "move" ? "grabbing" : "col-resize";
    document.body.style.userSelect = "none";
  }, []);

  /** 현재 드래그 델타 (픽셀 → 일) */
  const [dragDelta, setDragDelta] = useState(0);

  /** 간트 바 드래그 중 */
  const handleGanttDragMove = useCallback((e: MouseEvent) => {
    if (!dragState) return;

    const deltaX = e.clientX - dragState.startX;
    const daysDelta = Math.round(deltaX / 40); // 40px = 1일
    setDragDelta(daysDelta);
  }, [dragState]);

  /** 간트 바 드래그 종료 */
  const handleGanttDragEnd = useCallback(async () => {
    if (!dragState || dragDelta === 0) {
      setDragState(null);
      setDragDelta(0);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      return;
    }

    document.body.style.cursor = "";
    document.body.style.userSelect = "";

    // 새로운 날짜 계산
    const originalStart = new Date(dragState.originalStartDate);
    const originalEnd = new Date(dragState.originalEndDate);
    let newStartDate: Date;
    let newEndDate: Date;

    if (dragState.type === "move") {
      newStartDate = new Date(originalStart);
      newStartDate.setDate(newStartDate.getDate() + dragDelta);
      newEndDate = new Date(originalEnd);
      newEndDate.setDate(newEndDate.getDate() + dragDelta);
    } else if (dragState.type === "resize-left") {
      newStartDate = new Date(originalStart);
      newStartDate.setDate(newStartDate.getDate() + dragDelta);
      newEndDate = originalEnd;
      if (newStartDate >= newEndDate) {
        newStartDate = new Date(newEndDate);
        newStartDate.setDate(newStartDate.getDate() - 1);
      }
    } else {
      newStartDate = originalStart;
      newEndDate = new Date(originalEnd);
      newEndDate.setDate(newEndDate.getDate() + dragDelta);
      if (newEndDate <= newStartDate) {
        newEndDate = new Date(newStartDate);
        newEndDate.setDate(newEndDate.getDate() + 1);
      }
    }

    // API 호출하여 날짜 업데이트
    try {
      await updateWbs.mutateAsync({
        id: dragState.itemId,
        startDate: newStartDate.toISOString().split("T")[0],
        endDate: newEndDate.toISOString().split("T")[0],
      });
      toast.success("일정이 변경되었습니다.");
    } catch (error) {
      toast.error("일정 변경에 실패했습니다.");
    }

    setDragState(null);
    setDragDelta(0);
  }, [dragState, dragDelta, updateWbs, toast]);

  /** 마우스 이벤트 리스너 등록 */
  useEffect(() => {
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [handleMouseMove, handleMouseUp]);

  /** 간트 드래그 이벤트 리스너 등록 */
  useEffect(() => {
    if (dragState) {
      document.addEventListener("mousemove", handleGanttDragMove);
      document.addEventListener("mouseup", handleGanttDragEnd);
      return () => {
        document.removeEventListener("mousemove", handleGanttDragMove);
        document.removeEventListener("mouseup", handleGanttDragEnd);
      };
    }
  }, [dragState, handleGanttDragMove, handleGanttDragEnd]);

  // 30일 날짜 범위 생성 (오늘부터)
  const startDate = useMemo(() => {
    const date = new Date();
    date.setDate(date.getDate() - 7);
    return date;
  }, []);
  const dates = useMemo(() => generateDates(startDate, 45), [startDate]);
  const todayIndex = dates.findIndex((d) => d.isToday);

  /** 모든 항목을 평탄화하여 간트 차트용 배열 생성 */
  const flattenItems = (items: WbsItem[]): WbsItem[] => {
    const result: WbsItem[] = [];
    const traverse = (list: WbsItem[]) => {
      list.forEach((item) => {
        if (expandedIds.has(item.id) || item.levelNumber === 1) {
          result.push(item);
        }
        if (item.children && expandedIds.has(item.id)) {
          traverse(item.children);
        }
      });
    };
    traverse(items);
    return result;
  };

  const visibleItems = useMemo(() => flattenItems(wbsTree), [wbsTree, expandedIds]);

  /** 통계 계산 */
  const stats = useMemo(() => {
    const allItems: WbsItem[] = [];
    const collectAll = (items: WbsItem[]) => {
      items.forEach((item) => {
        allItems.push(item);
        if (item.children) collectAll(item.children);
      });
    };
    collectAll(wbsTree);

    const total = allItems.length;
    const completed = allItems.filter((i) => i.status === "COMPLETED").length;
    const inProgress = allItems.filter((i) => i.status === "IN_PROGRESS").length;
    const pending = allItems.filter((i) => i.status === "PENDING").length;

    // 최상위 레벨의 평균 진행률
    const level1Items = wbsTree.filter((i) => i.level === "LEVEL1");
    const avgProgress =
      level1Items.length > 0
        ? Math.round(level1Items.reduce((sum, i) => sum + i.progress, 0) / level1Items.length)
        : 0;

    return { total, completed, inProgress, pending, progress: avgProgress };
  }, [wbsTree]);

  /** 항목 확장/축소 토글 */
  const handleToggle = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  /** 전체 확장/축소 */
  const handleExpandAll = () => {
    const allIds: string[] = [];
    const collectIds = (items: WbsItem[]) => {
      items.forEach((item) => {
        allIds.push(item.id);
        if (item.children) collectIds(item.children);
      });
    };
    collectIds(wbsTree);
    setExpandedIds(new Set(allIds));
  };

  const handleCollapseAll = () => {
    setExpandedIds(new Set());
  };

  /** 자식 추가 */
  const handleAddChild = (parentId: string, level: WbsLevel) => {
    setNewItem({
      name: "",
      description: "",
      level,
      parentId,
      assigneeIds: [],
      startDate: "",
      endDate: "",
    });
    setEditingItem(null);
    setShowAddModal(true);
  };

  /** 항목 수정 */
  const handleEdit = (item: WbsItem) => {
    setEditingItem(item);
    setNewItem({
      name: item.name,
      description: item.description || "",
      level: item.level,
      parentId: item.parentId,
      assigneeIds: item.assignees?.map((a) => a.id) || [],
      startDate: item.startDate?.split("T")[0] || "",
      endDate: item.endDate?.split("T")[0] || "",
    });
    setShowAddModal(true);
  };

  /** 항목 삭제 */
  const handleDelete = async (id: string) => {
    if (confirm("이 항목과 모든 하위 항목이 삭제됩니다. 계속하시겠습니까?")) {
      await deleteWbs.mutateAsync(id);
      if (selectedItemId === id) {
        setSelectedItemId(null);
      }
    }
  };

  /** 레벨 올리기 (LEVEL4 → LEVEL3 등) */
  const handleLevelUp = async (id: string) => {
    try {
      await changeLevel.mutateAsync({ id, direction: "up" });
      toast.success("레벨이 변경되었습니다.");
    } catch (error: any) {
      toast.error(error?.message || "레벨을 올릴 수 없습니다.", "레벨 변경 실패");
    }
  };

  /** 레벨 내리기 (LEVEL3 → LEVEL4 등) */
  const handleLevelDown = async (id: string) => {
    try {
      await changeLevel.mutateAsync({ id, direction: "down" });
      toast.success("레벨이 변경되었습니다.");
    } catch (error: any) {
      toast.error(error?.message || "레벨을 내릴 수 없습니다. 이전 형제 항목이 필요합니다.", "레벨 변경 실패");
    }
  };

  /** WBS 단위업무를 Task로 등록 */
  const handleRegisterTask = async (item: WbsItem) => {
    if (!selectedProjectId) return;

    try {
      await createTask.mutateAsync({
        title: `[${item.code}] ${item.name}`,
        description: item.description || `WBS 단위업무에서 생성됨\n\nWBS 코드: ${item.code}`,
        projectId: selectedProjectId,
        assigneeIds: item.assignees?.map(a => a.id) || [],
        dueDate: item.endDate?.split("T")[0],
        priority: "MEDIUM",
      });
      toast.success(`"${item.name}" 항목이 Task로 등록되었습니다.`, "Task 등록 완료");
    } catch (error: any) {
      toast.error(error?.message || "Task 등록에 실패했습니다.", "Task 등록 실패");
    }
  };

  /** 항목 생성/수정 */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProjectId || !newItem.name.trim()) return;

    if (editingItem) {
      // 수정
      await updateWbs.mutateAsync({
        id: editingItem.id,
        name: newItem.name,
        description: newItem.description,
        assigneeIds: newItem.assigneeIds.length > 0 ? newItem.assigneeIds : undefined,
        startDate: newItem.startDate || undefined,
        endDate: newItem.endDate || undefined,
      });
    } else {
      // 생성
      await createWbs.mutateAsync({
        name: newItem.name,
        description: newItem.description,
        projectId: selectedProjectId,
        parentId: newItem.parentId,
        level: newItem.level,
        assigneeIds: newItem.assigneeIds.length > 0 ? newItem.assigneeIds : undefined,
        startDate: newItem.startDate || undefined,
        endDate: newItem.endDate || undefined,
      });

      // 부모 항목 확장
      if (newItem.parentId) {
        setExpandedIds((prev) => new Set([...prev, newItem.parentId!]));
      }
    }

    // 폼 초기화
    setNewItem({
      name: "",
      description: "",
      level: "LEVEL1",
      parentId: undefined,
      assigneeIds: [],
      startDate: "",
      endDate: "",
    });
    setEditingItem(null);
    setShowAddModal(false);
  };

  /** 간트 차트에서 항목 위치 계산 */
  const getItemPosition = (item: WbsItem) => {
    if (!item.startDate && !item.endDate) {
      // 날짜 없으면 기본 위치
      return { startIndex: todayIndex >= 0 ? todayIndex : 7, endIndex: (todayIndex >= 0 ? todayIndex : 7) + 5 };
    }

    const start = item.startDate ? new Date(item.startDate) : new Date();
    const end = item.endDate ? new Date(item.endDate) : new Date(start);
    end.setDate(end.getDate() + 7);

    let startIndex = dates.findIndex(
      (d) =>
        d.date.getFullYear() === start.getFullYear() &&
        d.date.getMonth() === start.getMonth() &&
        d.date.getDate() === start.getDate()
    );
    if (startIndex < 0) startIndex = 0;

    let endIndex = dates.findIndex(
      (d) =>
        d.date.getFullYear() === end.getFullYear() &&
        d.date.getMonth() === end.getMonth() &&
        d.date.getDate() === end.getDate()
    );
    if (endIndex < 0 || endIndex <= startIndex) endIndex = Math.min(startIndex + 5, dates.length - 1);

    return { startIndex, endIndex };
  };

  /** 로딩 상태 */
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  /** 에러 상태 */
  if (error) {
    return (
      <div className="p-6">
        <div className="bg-error/10 text-error p-4 rounded-lg">
          데이터를 불러오는데 실패했습니다.
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-background dark:bg-background-dark">
      {/* 상단 툴바 */}
      <div className="h-14 border-b border-border dark:border-border-dark flex items-center justify-between px-6 bg-background-white dark:bg-surface-dark shrink-0">
        <div className="flex items-center gap-4">
          <h1 className="text-lg font-bold text-text dark:text-white">WBS 관리</h1>

          {/* 현재 선택된 프로젝트 표시 */}
          {selectedProject && (
            <>
              <div className="h-6 w-px bg-border dark:bg-border-dark" />
              <div className="flex items-center gap-2 px-3 py-1 rounded-lg bg-primary/10 border border-primary/20">
                <Icon name="folder" size="sm" className="text-primary" />
                <span className="text-sm font-medium text-primary">{selectedProject.name}</span>
              </div>
            </>
          )}

          {/* 확장/축소 버튼 */}
          {selectedProjectId && wbsTree.length > 0 && (
            <div className="flex items-center gap-1">
              <button
                onClick={handleExpandAll}
                className="px-2 py-1 text-xs rounded bg-surface dark:bg-background-dark border border-border dark:border-border-dark text-text-secondary hover:text-text dark:hover:text-white"
              >
                전체 펼치기
              </button>
              <button
                onClick={handleCollapseAll}
                className="px-2 py-1 text-xs rounded bg-surface dark:bg-background-dark border border-border dark:border-border-dark text-text-secondary hover:text-text dark:hover:text-white"
              >
                전체 접기
              </button>
            </div>
          )}
        </div>

        <Button
          variant="primary"
          size="sm"
          leftIcon="add"
          onClick={() => {
            setNewItem({
              name: "",
              description: "",
              level: "LEVEL1",
              parentId: undefined,
              assigneeIds: [],
              startDate: "",
              endDate: "",
            });
            setEditingItem(null);
            setShowAddModal(true);
          }}
          disabled={!selectedProjectId}
        >
          대분류 추가
        </Button>
      </div>

      {/* 프로젝트 미선택 안내 */}
      {!selectedProjectId && (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <Icon name="folder_open" size="xl" className="text-primary mb-4" />
            <h3 className="text-lg font-semibold text-text dark:text-white mb-2">
              프로젝트를 선택해주세요
            </h3>
            <p className="text-text-secondary">
              상단 헤더에서 프로젝트를 선택하면 WBS가 표시됩니다.
            </p>
          </div>
        </div>
      )}

      {selectedProjectId && (
        <>
          {/* 프로젝트 상태 요약 */}
          <div className="p-4 border-b border-border dark:border-border-dark bg-surface dark:bg-surface-dark">
            <div className="flex items-center gap-6">
              {/* 진행률 바 */}
              <div className="flex-1">
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-text-secondary">전체 진행률</span>
                  <span className="font-medium text-text dark:text-white">{stats.progress}%</span>
                </div>
                <div className="h-2 bg-background dark:bg-background-dark rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary rounded-full transition-all"
                    style={{ width: `${stats.progress}%` }}
                  />
                </div>
              </div>

              {/* 통계 */}
              <div className="flex gap-4">
                <div className="flex items-center gap-2 px-3 py-1.5 bg-background-white dark:bg-background-dark rounded-lg border border-border dark:border-border-dark">
                  <div className="size-2 rounded-full bg-success" />
                  <span className="text-xs text-text-secondary">완료</span>
                  <span className="text-sm font-bold text-text dark:text-white">{stats.completed}</span>
                </div>
                <div className="flex items-center gap-2 px-3 py-1.5 bg-background-white dark:bg-background-dark rounded-lg border border-border dark:border-border-dark">
                  <div className="size-2 rounded-full bg-primary" />
                  <span className="text-xs text-text-secondary">진행중</span>
                  <span className="text-sm font-bold text-text dark:text-white">{stats.inProgress}</span>
                </div>
                <div className="flex items-center gap-2 px-3 py-1.5 bg-background-white dark:bg-background-dark rounded-lg border border-border dark:border-border-dark">
                  <div className="size-2 rounded-full bg-gray-400" />
                  <span className="text-xs text-text-secondary">대기</span>
                  <span className="text-sm font-bold text-text dark:text-white">{stats.pending}</span>
                </div>
                <div className="flex items-center gap-2 px-3 py-1.5 bg-background-white dark:bg-background-dark rounded-lg border border-border dark:border-border-dark">
                  <span className="text-xs text-text-secondary">총 항목</span>
                  <span className="text-sm font-bold text-text dark:text-white">{stats.total}</span>
                </div>
              </div>
            </div>
          </div>

          {/* 메인 콘텐츠 */}
          {wbsTree.length === 0 ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <Icon name="account_tree" size="xl" className="text-text-secondary mb-4" />
                <h3 className="text-lg font-semibold text-text dark:text-white mb-2">
                  WBS 항목이 없습니다
                </h3>
                <p className="text-text-secondary mb-4">
                  대분류부터 추가하여 WBS 구조를 만들어보세요.
                </p>
                <Button variant="primary" leftIcon="add" onClick={() => setShowAddModal(true)}>
                  대분류 추가
                </Button>
              </div>
            </div>
          ) : (
            <div ref={containerRef} className="flex-1 flex overflow-hidden">
              {/* 좌측: WBS 트리 목록 (리사이즈 가능) */}
              <div
                style={{ width: panelWidth }}
                className="flex-shrink-0 border-r border-border dark:border-border-dark flex flex-col bg-background-white dark:bg-background-dark"
              >
                {/* 헤더 */}
                <div className="h-10 border-b border-border dark:border-border-dark bg-surface dark:bg-surface-dark flex items-center px-4 shrink-0">
                  <div className="flex-1 text-xs font-semibold text-text-secondary uppercase">
                    WBS 항목
                  </div>
                  <div className="w-36 text-xs font-semibold text-text-secondary uppercase text-center flex-shrink-0">
                    기간
                  </div>
                  <div className="w-20 text-xs font-semibold text-text-secondary uppercase text-center flex-shrink-0">
                    진행률
                  </div>
                  <div className="w-16 text-xs font-semibold text-text-secondary uppercase text-center flex-shrink-0">
                    상태
                  </div>
                  <div className="w-16 text-xs font-semibold text-text-secondary uppercase text-center flex-shrink-0">
                    담당
                  </div>
                </div>

                {/* WBS 트리 목록 */}
                <div className="flex-1 overflow-y-auto">
                  {wbsTree.map((item) => (
                    <WbsTreeItem
                      key={item.id}
                      item={item}
                      expandedIds={expandedIds}
                      selectedId={selectedItemId}
                      onToggle={handleToggle}
                      onSelect={setSelectedItemId}
                      onAddChild={handleAddChild}
                      onEdit={handleEdit}
                      onDelete={handleDelete}
                      onLevelUp={handleLevelUp}
                      onLevelDown={handleLevelDown}
                      onRegisterTask={handleRegisterTask}
                    />
                  ))}
                </div>

                {/* 하단 요약 */}
                <div className="h-10 border-t border-border dark:border-border-dark bg-surface dark:bg-surface-dark flex items-center justify-between px-4 text-xs text-text-secondary">
                  <span>{stats.total}개 항목</span>
                  <div className="flex gap-2">
                    {Object.entries(levelNames).map(([level, name]) => (
                      <span key={level} className="flex items-center gap-1">
                        <span className={`size-2 rounded-full ${levelColors[level as WbsLevel]}`} />
                        {name}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* 리사이즈 핸들 (드래그하여 패널 크기 조절) */}
              <div
                onMouseDown={handleMouseDown}
                className="w-2 flex-shrink-0 bg-border dark:bg-border-dark hover:bg-primary/50 cursor-col-resize transition-colors flex items-center justify-center group"
                title="드래그하여 크기 조절"
              >
                <div className="w-0.5 h-8 bg-text-secondary/30 group-hover:bg-primary rounded-full" />
              </div>

              {/* 우측: 간트 차트 */}
              <div className="flex-1 overflow-auto bg-background-white dark:bg-[#161b22]">
                {/* 날짜 헤더 */}
                <div className="h-10 border-b border-border dark:border-border-dark bg-surface dark:bg-surface-dark flex sticky top-0 z-10">
                  {dates.map((date, index) => (
                    <div
                      key={index}
                      className={`
                        min-w-[40px] flex-shrink-0 border-r border-border dark:border-border-dark
                        flex flex-col items-center justify-center text-xs
                        ${date.isWeekend ? "bg-surface dark:bg-surface-dark/50" : ""}
                        ${date.isToday ? "bg-primary/10 text-primary font-bold" : "text-text-secondary"}
                      `}
                    >
                      <span>
                        {date.month}/{date.day}
                      </span>
                      <span className="text-[10px] opacity-70">{date.dayName}</span>
                    </div>
                  ))}
                </div>

                {/* 간트 바 영역 */}
                <div className="relative" style={{ width: `${dates.length * 40}px` }}>
                  {/* 그리드 라인 */}
                  <div className="absolute inset-0 flex pointer-events-none">
                    {dates.map((date, index) => (
                      <div
                        key={index}
                        className={`
                          min-w-[40px] flex-shrink-0 border-r border-border/30 dark:border-border-dark/30
                          ${date.isWeekend ? "bg-surface/50 dark:bg-surface-dark/30" : ""}
                          ${date.isToday ? "bg-primary/5" : ""}
                        `}
                        style={{ height: `${visibleItems.length * 44}px` }}
                      />
                    ))}
                  </div>

                  {/* 오늘 표시선 */}
                  {todayIndex >= 0 && (
                    <div
                      className="absolute top-0 bottom-0 w-0.5 bg-error z-10"
                      style={{
                        left: `${todayIndex * 40 + 20}px`,
                        height: `${visibleItems.length * 44}px`,
                      }}
                    >
                      <div className="absolute -top-1 -left-1 size-2 rounded-full bg-error" />
                    </div>
                  )}

                  {/* 간트 바 */}
                  {visibleItems.map((item, rowIndex) => {
                    const isSelected = selectedItemId === item.id;
                    const isDragging = dragState?.itemId === item.id;

                    // 날짜로부터 위치 계산
                    const getDateIndex = (dateStr: string | null | undefined) => {
                      if (!dateStr) return -1;
                      const d = new Date(dateStr);
                      return dates.findIndex(
                        (dd) =>
                          dd.date.getFullYear() === d.getFullYear() &&
                          dd.date.getMonth() === d.getMonth() &&
                          dd.date.getDate() === d.getDate()
                      );
                    };

                    let startIndex = getDateIndex(item.startDate);
                    let endIndex = getDateIndex(item.endDate);

                    // 날짜가 없으면 기본 위치
                    if (startIndex < 0) startIndex = todayIndex >= 0 ? todayIndex : 7;
                    if (endIndex < 0 || endIndex < startIndex) endIndex = startIndex + 5;

                    // 드래그 중일 때 델타 적용 (실시간 시각적 피드백)
                    let adjustedStartIndex = startIndex;
                    let adjustedEndIndex = endIndex;
                    let newStartDateStr = "";
                    let newEndDateStr = "";

                    if (isDragging && dragDelta !== 0) {
                      if (dragState.type === "move") {
                        // 전체 이동
                        adjustedStartIndex = startIndex + dragDelta;
                        adjustedEndIndex = endIndex + dragDelta;
                      } else if (dragState.type === "resize-left") {
                        // 왼쪽 리사이즈 (시작일 변경)
                        adjustedStartIndex = startIndex + dragDelta;
                        if (adjustedStartIndex >= adjustedEndIndex) {
                          adjustedStartIndex = adjustedEndIndex - 1;
                        }
                      } else if (dragState.type === "resize-right") {
                        // 오른쪽 리사이즈 (종료일 변경)
                        adjustedEndIndex = endIndex + dragDelta;
                        if (adjustedEndIndex <= adjustedStartIndex) {
                          adjustedEndIndex = adjustedStartIndex + 1;
                        }
                      }

                      // 새 날짜 문자열 계산 (툴팁 표시용)
                      if (adjustedStartIndex >= 0 && adjustedStartIndex < dates.length) {
                        const d = dates[adjustedStartIndex].date;
                        newStartDateStr = `${d.getMonth() + 1}/${d.getDate()}`;
                      }
                      if (adjustedEndIndex >= 0 && adjustedEndIndex < dates.length) {
                        const d = dates[adjustedEndIndex].date;
                        newEndDateStr = `${d.getMonth() + 1}/${d.getDate()}`;
                      }
                    }

                    const barWidth = Math.max((adjustedEndIndex - adjustedStartIndex + 1) * 40 - 8, 32);
                    const barLeft = adjustedStartIndex * 40 + 4;

                    return (
                      <div
                        key={item.id}
                        className="h-11 border-b border-border/30 dark:border-border-dark/30 relative flex items-center"
                      >
                        <div
                          className={`
                            absolute h-7 rounded transition-all group
                            ${levelColors[item.level]}
                            ${isSelected ? "ring-2 ring-white shadow-lg" : ""}
                            ${isDragging ? "opacity-80 shadow-xl scale-y-110" : "hover:brightness-110"}
                          `}
                          style={{
                            left: `${barLeft}px`,
                            width: `${barWidth}px`,
                          }}
                        >
                          {/* 왼쪽 리사이즈 핸들 */}
                          <div
                            onMouseDown={(e) => handleGanttDragStart(e, item.id, "resize-left", item.startDate, item.endDate)}
                            className="absolute left-0 top-0 bottom-0 w-2 cursor-col-resize hover:bg-white/30 rounded-l flex items-center justify-center"
                            title="시작일 조정"
                          >
                            <div className="w-0.5 h-3 bg-white/50 rounded opacity-0 group-hover:opacity-100" />
                          </div>

                          {/* 가운데 드래그 영역 */}
                          <div
                            onMouseDown={(e) => handleGanttDragStart(e, item.id, "move", item.startDate, item.endDate)}
                            onClick={() => setSelectedItemId(item.id)}
                            className="absolute left-2 right-2 top-0 bottom-0 cursor-grab active:cursor-grabbing flex items-center"
                          >
                            {/* 진행률 표시 */}
                            <div
                              className="absolute inset-y-0 left-0 bg-black/20 rounded-l pointer-events-none"
                              style={{ width: `${item.progress}%` }}
                            />
                            {/* 항목명 */}
                            <span className="relative z-10 px-1 text-[10px] text-white font-medium truncate">
                              {barWidth > 80 ? `${item.code} ${item.name}` : barWidth > 40 ? item.code : ""}
                            </span>
                          </div>

                          {/* 오른쪽 리사이즈 핸들 */}
                          <div
                            onMouseDown={(e) => handleGanttDragStart(e, item.id, "resize-right", item.startDate, item.endDate)}
                            className="absolute right-0 top-0 bottom-0 w-2 cursor-col-resize hover:bg-white/30 rounded-r flex items-center justify-center"
                            title="종료일 조정"
                          >
                            <div className="w-0.5 h-3 bg-white/50 rounded opacity-0 group-hover:opacity-100" />
                          </div>
                        </div>

                        {/* 드래그 중 날짜 표시 툴팁 */}
                        {isDragging && dragDelta !== 0 && (
                          <div
                            className="absolute -top-7 bg-gray-900 text-white text-xs px-2 py-1 rounded shadow-lg whitespace-nowrap z-20 pointer-events-none"
                            style={{ left: `${barLeft}px` }}
                          >
                            {newStartDateStr || "-"} ~ {newEndDateStr || "-"}
                            <span className="ml-1 text-yellow-300">
                              ({dragDelta > 0 ? "+" : ""}{dragDelta}일)
                            </span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* WBS 항목 추가/수정 모달 */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-background-white dark:bg-surface-dark rounded-xl p-6 w-full max-w-md mx-4">
            <h2 className="text-lg font-semibold text-text dark:text-white mb-4">
              {editingItem ? "WBS 항목 수정" : `${levelNames[newItem.level]} 추가`}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* 레벨 표시 */}
              <div className="flex items-center gap-2">
                <span className={`px-2 py-1 rounded text-xs font-medium text-white ${levelColors[newItem.level]}`}>
                  {levelNames[newItem.level]}
                </span>
                {newItem.parentId && (
                  <span className="text-xs text-text-secondary">
                    (상위 항목에 추가됨)
                  </span>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-text dark:text-white mb-1">
                  항목명 *
                </label>
                <Input
                  value={newItem.name}
                  onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
                  placeholder={`${levelNames[newItem.level]} 항목명 입력`}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-text dark:text-white mb-1">
                  설명
                </label>
                <textarea
                  value={newItem.description}
                  onChange={(e) => setNewItem({ ...newItem, description: e.target.value })}
                  placeholder="항목 설명"
                  className="w-full px-3 py-2 rounded-lg bg-background-white dark:bg-surface-dark border border-border dark:border-border-dark text-text dark:text-white resize-none h-20"
                />
              </div>

              {/* 담당자 선택 */}
              <div>
                <label className="block text-sm font-medium text-text dark:text-white mb-1">
                  담당자
                </label>
                <div className="max-h-32 overflow-y-auto border border-border dark:border-border-dark rounded-lg p-2 bg-background-white dark:bg-surface-dark">
                  {teamMembers.length === 0 ? (
                    <p className="text-xs text-text-secondary p-2">팀 멤버가 없습니다</p>
                  ) : (
                    teamMembers.map((member) => (
                      <label
                        key={member.userId}
                        className="flex items-center gap-2 p-2 rounded hover:bg-surface dark:hover:bg-background-dark cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={newItem.assigneeIds.includes(member.userId)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setNewItem({
                                ...newItem,
                                assigneeIds: [...newItem.assigneeIds, member.userId],
                              });
                            } else {
                              setNewItem({
                                ...newItem,
                                assigneeIds: newItem.assigneeIds.filter((id) => id !== member.userId),
                              });
                            }
                          }}
                          className="w-4 h-4 rounded border-border text-primary focus:ring-primary"
                        />
                        <span className="text-sm text-text dark:text-white">
                          {member.user?.name || member.user?.email || "알 수 없음"}
                        </span>
                      </label>
                    ))
                  )}
                </div>
              </div>

              {/* 일정 */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-text dark:text-white mb-1">
                    시작일
                  </label>
                  <input
                    type="date"
                    value={newItem.startDate}
                    onChange={(e) => setNewItem({ ...newItem, startDate: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-background-white dark:bg-surface-dark border border-border dark:border-border-dark text-text dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-text dark:text-white mb-1">
                    종료일
                  </label>
                  <input
                    type="date"
                    value={newItem.endDate}
                    onChange={(e) => setNewItem({ ...newItem, endDate: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-background-white dark:bg-surface-dark border border-border dark:border-border-dark text-text dark:text-white"
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    setShowAddModal(false);
                    setEditingItem(null);
                  }}
                >
                  취소
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  className="flex-1"
                  disabled={createWbs.isPending || updateWbs.isPending}
                >
                  {createWbs.isPending || updateWbs.isPending
                    ? "처리 중..."
                    : editingItem
                    ? "수정"
                    : "추가"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
