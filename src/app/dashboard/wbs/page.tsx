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
 *
 * 모듈화 구조:
 * - constants.ts: 상수 정의
 * - types.ts: 타입 정의
 * - utils/: 헬퍼 함수
 * - components/: UI 컴포넌트
 */

"use client";

import { useState, useMemo, useCallback, useRef, useEffect } from "react";
import { utils, writeFile } from "xlsx";
import { Icon, Button, Input, useToast, ConfirmModal } from "@/components/ui";
import { useWbsItems, useCreateWbsItem, useUpdateWbsItem, useDeleteWbsItem, useChangeWbsLevel, useMembers, useCreateTask } from "@/hooks";
import { useProject } from "@/contexts/ProjectContext";
import type { WbsItem, WbsLevel } from "@/lib/api";

// 모듈화된 상수, 타입, 유틸, 컴포넌트 import
import { levelNames, levelColors, statusColors, statusNames, zoomLevels, defaultZoomIndex, defaultPanelWidth, rowHeight } from "./constants";
import type { NewItemForm } from "./types";
import { applyCalculatedDates, calculateProjectSchedule, isDelayed, getDelayDays, getDisplayStatus, getAllItemIds, flattenItems, filterByAssignee, getEmbedUrl } from "./utils/wbsHelpers";
import { generateDates, getItemPosition, calculateChartRange } from "./utils/ganttHelpers";
import { WbsTreeItem, BulkAssignModal, WbsFormModal, DeliverablePreviewModal } from "./components";

// 헬퍼 함수들은 ./utils/wbsHelpers.ts 및 ./utils/ganttHelpers.ts로 이동됨
// WbsTreeItem 컴포넌트는 ./components/WbsTreeItem.tsx로 이동됨
// 모달 컴포넌트들은 ./components/modals/로 이동됨

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

  /** 체크된 항목 ID 집합 (일괄 배정용) */
  const [checkedIds, setCheckedIds] = useState<Set<string>>(new Set());
  /** 일괄 배정 모달 표시 여부 */
  const [showBulkAssignModal, setShowBulkAssignModal] = useState(false);
  /** 일괄 배정할 담당자 ID 목록 */
  const [bulkAssigneeIds, setBulkAssigneeIds] = useState<string[]>([]);

  /** 담당자 필터 상태 (null: 전체, "unassigned": 미할당, 그 외: 담당자 ID) */
  const [filterAssigneeId, setFilterAssigneeId] = useState<string | null>(null);

  /** 산출물 미리보기 URL 상태 */
  const [deliverablePreviewUrl, setDeliverablePreviewUrl] = useState<string | null>(null);

  /** 삭제 확인 모달 상태 */
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletingItemId, setDeletingItemId] = useState<string | null>(null);
  const [deletingItemName, setDeletingItemName] = useState("");

  // 패널 리사이즈 상태 (폰트 축소에 따른 너비 조정)
  const [panelWidth, setPanelWidth] = useState(defaultPanelWidth);

  // 간트 차트 줌 레벨 (셀 너비 px) - zoomLevels는 constants.ts에서 import됨
  const [zoomIndex, setZoomIndex] = useState(defaultZoomIndex); // 기본값 40px
  const cellWidth = zoomLevels[zoomIndex];

  const handleZoomIn = () => {
    if (zoomIndex < zoomLevels.length - 1) {
      setZoomIndex(zoomIndex + 1);
    }
  };

  const handleZoomOut = () => {
    if (zoomIndex > 0) {
      setZoomIndex(zoomIndex - 1);
    }
  };

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
  const treeListRef = useRef<HTMLDivElement>(null);
  const ganttScrollRef = useRef<HTMLDivElement>(null); // 간트 차트 스크롤 영역 ref

  /**
   * 선택된 항목으로 양방향 스크롤
   * - 트리 목록에서 해당 항목으로 스크롤
   * - 간트 차트에서 해당 항목의 바 위치로 스크롤 (수평 + 수직)
   */
  useEffect(() => {
    if (!selectedItemId) return;

    // DOM 업데이트 후 스크롤 실행
    const timeoutId = setTimeout(() => {
      // 1. 트리 목록에서 해당 항목으로 스크롤
      if (treeListRef.current) {
        const treeElement = treeListRef.current.querySelector(`[data-wbs-id="${selectedItemId}"]`) as HTMLElement;
        if (treeElement) {
          const container = treeListRef.current;
          const elementTop = treeElement.offsetTop;
          const elementHeight = treeElement.offsetHeight;
          const containerHeight = container.clientHeight;

          // 요소가 컨테이너 중앙에 오도록 스크롤
          const targetScrollTop = elementTop - (containerHeight / 2) + (elementHeight / 2);
          container.scrollTo({
            top: Math.max(0, targetScrollTop),
            behavior: "smooth",
          });
        }
      }

      // 2. 간트 차트에서 해당 항목으로 스크롤
      if (ganttScrollRef.current) {
        const ganttRow = ganttScrollRef.current.querySelector(`[data-gantt-id="${selectedItemId}"]`) as HTMLElement;
        if (ganttRow) {
          const container = ganttScrollRef.current;

          // 수직 스크롤: 해당 행이 컨테이너 중앙에 오도록
          const rowTop = ganttRow.offsetTop;
          const rowHeight = ganttRow.offsetHeight;
          const containerHeight = container.clientHeight;
          const targetScrollTop = rowTop - (containerHeight / 2) + (rowHeight / 2);

          container.scrollTo({
            top: Math.max(0, targetScrollTop),
            behavior: "smooth",
          });

          // 수평 스크롤: 해당 항목의 간트 바 위치로 스크롤
          const ganttBar = ganttRow.querySelector("[data-gantt-bar]") as HTMLElement;
          if (ganttBar) {
            const barLeft = parseInt(ganttBar.style.left || "0", 10);
            const barWidth = parseInt(ganttBar.style.width || "0", 10);
            const containerWidth = container.clientWidth;

            // 바의 중앙이 화면 중앙에 오도록 스크롤
            const barCenter = barLeft + barWidth / 2;
            const targetScrollLeft = barCenter - containerWidth / 2;

            container.scrollTo({
              left: Math.max(0, targetScrollLeft),
              top: Math.max(0, targetScrollTop),
              behavior: "smooth",
            });
          }
        }
      }
    }, 100);

    return () => clearTimeout(timeoutId);
  }, [selectedItemId]);

  // 새 항목 폼 상태
  const [newItem, setNewItem] = useState({
    name: "",
    description: "",
    level: "LEVEL1" as WbsLevel,
    parentId: undefined as string | undefined,
    assigneeIds: [] as string[],
    startDate: "",
    endDate: "",
    actualStartDate: "", // 실제 시작일
    actualEndDate: "",   // 실제 종료일
    progress: 0, // 진행률
    weight: 1, // 가중치 (대분류용)
    deliverableName: "", // 산출물명
    deliverableLink: "", // 산출물 링크
  });

  /** WBS 목록 조회 (트리 구조) */
  const { data: rawWbsTree = [], isLoading, error } = useWbsItems(
    selectedProjectId ? { projectId: selectedProjectId } : undefined
  );

  /** 상위 레벨 날짜 자동 계산이 적용된 WBS 트리 */
  const wbsTreeWithDates = useMemo(() => {
    return applyCalculatedDates(rawWbsTree);
  }, [rawWbsTree]);

  /**
   * 담당자 필터가 적용된 WBS 트리
   * - 필터 조건에 맞는 항목과 그 상위 항목(경로)을 유지
   * - 재귀적으로 트리를 순회하며 필터링
   */
  const wbsTree = useMemo(() => {
    // 필터가 없으면 전체 반환
    if (!filterAssigneeId) {
      return wbsTreeWithDates;
    }

    /**
     * 항목이 필터 조건에 맞는지 확인
     */
    const matchesFilter = (item: WbsItem): boolean => {
      if (filterAssigneeId === "unassigned") {
        // 미할당: 담당자가 없는 항목
        return !item.assignees || item.assignees.length === 0;
      }
      // 특정 담당자: 해당 담당자가 할당된 항목
      return item.assignees?.some((a) => a.id === filterAssigneeId) || false;
    };

    /**
     * 재귀적으로 트리를 필터링
     * - 자신이 조건에 맞거나 자식 중 조건에 맞는 항목이 있으면 포함
     */
    const filterTree = (items: WbsItem[]): WbsItem[] => {
      const result: WbsItem[] = [];

      for (const item of items) {
        const filteredChildren = item.children ? filterTree(item.children) : [];
        const selfMatches = matchesFilter(item);
        const hasMatchingChildren = filteredChildren.length > 0;

        // 자신이 조건에 맞거나 자식 중 조건에 맞는 항목이 있으면 포함
        if (selfMatches || hasMatchingChildren) {
          result.push({
            ...item,
            children: filteredChildren,
          });
        }
      }

      return result;
    };

    return filterTree(wbsTreeWithDates);
  }, [wbsTreeWithDates, filterAssigneeId]);

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
    startDate: string | null | undefined,
    endDate: string | null | undefined
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
    const daysDelta = Math.round(deltaX / cellWidth); // cellWidth = 1일
    setDragDelta(daysDelta);
  }, [dragState, cellWidth]);

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

  // 프로젝트 기간에 맞춘 간트차트 날짜 범위 생성
  const { chartStartDate, chartDays } = useMemo(() => {
    if (selectedProject?.startDate && selectedProject?.endDate) {
      // 프로젝트 시작일/종료일 기준
      const projectStart = new Date(selectedProject.startDate);
      const projectEnd = new Date(selectedProject.endDate);

      // 시작일 3일 전부터, 종료일 7일 후까지 표시 (여유 기간)
      const start = new Date(projectStart);
      start.setDate(start.getDate() - 3);

      const end = new Date(projectEnd);
      end.setDate(end.getDate() + 7);

      const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;

      return { chartStartDate: start, chartDays: Math.max(days, 30) }; // 최소 30일
    }

    // 프로젝트 날짜가 없으면 오늘 기준 45일
    const date = new Date();
    date.setDate(date.getDate() - 7);
    return { chartStartDate: date, chartDays: 45 };
  }, [selectedProject?.startDate, selectedProject?.endDate]);

  const dates = useMemo(() => generateDates(chartStartDate, chartDays), [chartStartDate, chartDays]);
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

    // 지연 항목 (종료일이 지났는데 완료/취소 아닌 항목)
    const delayed = allItems.filter((i) => isDelayed(i.endDate, i.status)).length;
    // 지연 비율 (완료/취소 제외한 항목 중 지연 비율)
    const activeItems = allItems.filter((i) => i.status !== "COMPLETED" && i.status !== "CANCELLED").length;
    const delayedRate = activeItems > 0 ? Math.round((delayed / activeItems) * 100) : 0;

    // 최상위 레벨의 평균 진행률
    const level1Items = wbsTree.filter((i) => i.level === "LEVEL1");
    const avgProgress =
      level1Items.length > 0
        ? Math.round(level1Items.reduce((sum, i) => sum + i.progress, 0) / level1Items.length)
        : 0;

    return { total, completed, inProgress, pending, delayed, delayedRate, progress: avgProgress };
  }, [wbsTree]);

  /** 프로젝트 일정 통계 */
  const scheduleStats = useMemo(() => {
    if (!selectedProject?.startDate || !selectedProject?.endDate) return null;
    return calculateProjectSchedule(selectedProject.startDate, selectedProject.endDate);
  }, [selectedProject]);

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

  /**
   * 트리를 평탄화하여 모든 항목 ID 수집
   */
  const getAllItemIds = (items: WbsItem[]): string[] => {
    const ids: string[] = [];
    const collect = (list: WbsItem[]) => {
      list.forEach((item) => {
        ids.push(item.id);
        if (item.children) collect(item.children);
      });
    };
    collect(items);
    return ids;
  };

  /** 체크박스 토글 */
  const handleCheck = (id: string, checked: boolean) => {
    setCheckedIds((prev) => {
      const next = new Set(prev);
      if (checked) {
        next.add(id);
      } else {
        next.delete(id);
      }
      return next;
    });
  };

  /** 전체 선택/해제 */
  const handleCheckAll = (checked: boolean) => {
    if (checked) {
      const allIds = getAllItemIds(wbsTree);
      setCheckedIds(new Set(allIds));
    } else {
      setCheckedIds(new Set());
    }
  };

  /** 일괄 배정 실행 */
  const handleBulkAssign = async () => {
    if (checkedIds.size === 0 || bulkAssigneeIds.length === 0) return;

    try {
      // 선택된 모든 항목에 담당자 일괄 배정
      const promises = Array.from(checkedIds).map((id) =>
        updateWbs.mutateAsync({
          id,
          assigneeIds: bulkAssigneeIds,
        })
      );
      await Promise.all(promises);

      toast.success(`${checkedIds.size}개 항목에 담당자가 배정되었습니다.`);
      setShowBulkAssignModal(false);
      setCheckedIds(new Set());
      setBulkAssigneeIds([]);
    } catch (error) {
      toast.error("일괄 배정 중 오류가 발생했습니다.");
    }
  };

  /**
   * 엑셀 다운로드 핸들러
   * WBS 트리를 평탄화하여 엑셀로 내보냅니다.
   */
  const handleExportToExcel = () => {
    const flatItems = flattenItems(wbsTree);
    if (flatItems.length === 0) {
      toast.error("다운로드할 데이터가 없습니다.");
      return;
    }

    // 엑셀 데이터 변환
    const excelData = flatItems.map((item) => ({
      "WBS 코드": item.code,
      "레벨": levelNames[item.level],
      "항목명": item.name,
      "상태": statusNames[getDisplayStatus(item.status, item.endDate)],
      "진행률": `${item.progress}%`,
      "시작일": item.startDate ? new Date(item.startDate).toLocaleDateString() : "-",
      "종료일": item.endDate ? new Date(item.endDate).toLocaleDateString() : "-",
      "담당자": item.assignees?.map((a) => a.name).join(", ") || "-",
      "가중치": item.weight ? `${item.weight}%` : "-",
      "산출물": item.deliverableName || "-",
      "설명": item.description || "",
    }));

    // 워크시트 생성
    const worksheet = utils.json_to_sheet(excelData);

    // 컬럼 너비 설정
    worksheet["!cols"] = [
      { wch: 15 }, // WBS 코드
      { wch: 8 },  // 레벨
      { wch: 40 }, // 항목명
      { wch: 10 }, // 상태
      { wch: 8 },  // 진행률
      { wch: 12 }, // 시작일
      { wch: 12 }, // 종료일
      { wch: 20 }, // 담당자
      { wch: 8 },  // 가중치
      { wch: 20 }, // 산출물
      { wch: 50 }, // 설명
    ];

    // 워크북 생성 및 파일 저장
    const workbook = utils.book_new();
    utils.book_append_sheet(workbook, worksheet, "WBS");

    // 파일명 생성 (프로젝트명_WBS_날짜)
    const projectName = selectedProject?.name || "Project";
    const dateStr = new Date().toISOString().split("T")[0];
    writeFile(workbook, `${projectName}_WBS_${dateStr}.xlsx`);

    toast.success("WBS를 엑셀 파일로 다운로드했습니다.");
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
      actualStartDate: "",
      actualEndDate: "",
      progress: 0,
      weight: 1,
      deliverableName: "",
      deliverableLink: "",
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
      actualStartDate: item.actualStartDate?.split("T")[0] || "",
      actualEndDate: item.actualEndDate?.split("T")[0] || "",
      progress: item.progress || 0,
      weight: item.weight || 1,
      deliverableName: item.deliverableName || "",
      deliverableLink: item.deliverableLink || "",
    });
    setShowAddModal(true);
  };

  /** 항목 삭제 - 확인 모달 표시 */
  const handleDelete = (id: string) => {
    // 삭제할 항목 찾기
    const findItem = (items: WbsItem[]): WbsItem | null => {
      for (const item of items) {
        if (item.id === id) return item;
        if (item.children) {
          const found = findItem(item.children);
          if (found) return found;
        }
      }
      return null;
    };

    const item = findItem(wbsTree);
    if (item) {
      setDeletingItemId(id);
      setDeletingItemName(item.name);
      setShowDeleteConfirm(true);
    }
  };

  /** 항목 삭제 확인 */
  const handleConfirmDelete = async () => {
    if (!deletingItemId) return;

    try {
      await deleteWbs.mutateAsync(deletingItemId);
      if (selectedItemId === deletingItemId) {
        setSelectedItemId(null);
      }
      toast.success("항목이 삭제되었습니다.");
    } catch (error) {
      toast.error("항목 삭제에 실패했습니다.");
    } finally {
      setShowDeleteConfirm(false);
      setDeletingItemId(null);
      setDeletingItemName("");
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

  /** 진행률 인라인 업데이트 */
  const handleUpdateProgress = async (id: string, progress: number) => {
    try {
      await updateWbs.mutateAsync({ id, progress });
      toast.success(`진행률이 ${progress}%로 변경되었습니다.`);
    } catch (error: any) {
      toast.error(error?.message || "진행률 변경에 실패했습니다.", "진행률 변경 실패");
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
        actualStartDate: newItem.actualStartDate || undefined,
        actualEndDate: newItem.actualEndDate || undefined,
        progress: newItem.progress,
        weight: newItem.level === "LEVEL1" ? newItem.weight : undefined, // 대분류만 가중치 저장
        deliverableName: newItem.deliverableName || undefined,
        deliverableLink: newItem.deliverableLink || undefined,
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
        weight: newItem.level === "LEVEL1" ? newItem.weight : undefined, // 대분류만 가중치 저장
        deliverableName: newItem.deliverableName || undefined,
        deliverableLink: newItem.deliverableLink || undefined,
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
      actualStartDate: "",
      actualEndDate: "",
      progress: 0,
      weight: 1, // 가중치 초기화
      deliverableName: "",
      deliverableLink: "",
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
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <Icon name="account_tree" className="text-[#00f3ff]" />
            <span className="tracking-wider bg-clip-text text-transparent bg-gradient-to-r from-[#00f3ff] to-[#fa00ff]">
              WBS
            </span>
            <span className="text-slate-400 text-sm font-normal ml-1">
              / 작업분류체계
            </span>
          </h1>

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

          {/* 담당자 필터 */}
          {selectedProjectId && (
            <>
              <div className="h-6 w-px bg-border dark:bg-border-dark" />
              <div className="flex items-center gap-2">
                <Icon name="person" size="sm" className="text-text-secondary" />
                <select
                  value={filterAssigneeId || ""}
                  onChange={(e) => setFilterAssigneeId(e.target.value || null)}
                  className="px-2 py-1 text-xs rounded bg-surface dark:bg-background-dark border border-border dark:border-border-dark text-text dark:text-white focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
                >
                  <option value="">전체 담당자</option>
                  <option value="unassigned">미할당</option>
                  {teamMembers.map((member) => (
                    <option key={member.userId} value={member.userId}>
                      {member.user?.name || member.user?.email || "알 수 없음"}
                    </option>
                  ))}
                </select>
                {/* 필터 활성화 표시 */}
                {filterAssigneeId && (
                  <button
                    onClick={() => setFilterAssigneeId(null)}
                    className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs hover:bg-primary/20 transition-colors"
                    title="필터 해제"
                  >
                    <span>
                      {filterAssigneeId === "unassigned"
                        ? "미할당"
                        : teamMembers.find((m) => m.userId === filterAssigneeId)?.user?.name || "필터 적용중"}
                    </span>
                    <Icon name="close" size="xs" />
                  </button>
                )}
              </div>
            </>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            leftIcon="download"
            onClick={handleExportToExcel}
            disabled={!selectedProjectId || wbsTree.length === 0}
          >
            엑셀 다운로드
          </Button>
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
                actualStartDate: "",
                actualEndDate: "",
                progress: 0,
                weight: 1, // 가중치 초기화
                deliverableName: "",
                deliverableLink: "",
              });
              setEditingItem(null);
              setShowAddModal(true);
            }}
            disabled={!selectedProjectId}
          >
            대분류 추가
          </Button>
        </div>
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
              <div className="w-48 flex-shrink-0">
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

              {/* 프로젝트 일정 통계 */}
              {scheduleStats && (
                <div className="flex gap-2 flex-shrink-0">
                  <div className="flex items-center gap-1.5 px-2.5 py-1 bg-blue-500/10 dark:bg-blue-500/20 rounded-lg border border-blue-500/20">
                    <Icon name="date_range" size="xs" className="text-blue-500" />
                    <span className="text-xs text-text-secondary">총</span>
                    <span className="text-sm font-bold text-blue-600 dark:text-blue-400">{scheduleStats.totalDays}일</span>
                  </div>
                  <div className="flex items-center gap-1.5 px-2.5 py-1 bg-rose-500/10 dark:bg-rose-500/20 rounded-lg border border-rose-500/20">
                    <Icon name="weekend" size="xs" className="text-rose-500" />
                    <span className="text-xs text-text-secondary">휴무</span>
                    <span className="text-sm font-bold text-rose-600 dark:text-rose-400">{scheduleStats.weekendDays}일</span>
                  </div>
                  <div className="flex items-center gap-1.5 px-2.5 py-1 bg-emerald-500/10 dark:bg-emerald-500/20 rounded-lg border border-emerald-500/20">
                    <Icon name="work" size="xs" className="text-emerald-500" />
                    <span className="text-xs text-text-secondary">작업</span>
                    <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">{scheduleStats.workableDays}일</span>
                  </div>
                  <div className="flex items-center gap-1.5 px-2.5 py-1 bg-amber-500/10 dark:bg-amber-500/20 rounded-lg border border-amber-500/20">
                    <Icon name="hourglass_top" size="xs" className="text-amber-500" />
                    <span className="text-xs text-text-secondary">경과</span>
                    <span className="text-sm font-bold text-amber-600 dark:text-amber-400">{scheduleStats.elapsedDays}일</span>
                  </div>
                  <div className="flex items-center gap-1.5 px-2.5 py-1 bg-purple-500/10 dark:bg-purple-500/20 rounded-lg border border-purple-500/20">
                    <Icon name="hourglass_bottom" size="xs" className="text-purple-500" />
                    <span className="text-xs text-text-secondary">남은</span>
                    <span className="text-sm font-bold text-purple-600 dark:text-purple-400">{scheduleStats.remainingDays}일</span>
                  </div>
                </div>
              )}

              {/* 통계 */}
              <div className="flex gap-2 ml-auto">
                <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-background-white dark:bg-background-dark rounded-lg border border-border dark:border-border-dark">
                  <div className="size-2 rounded-full bg-success" />
                  <span className="text-xs text-text-secondary">완료</span>
                  <span className="text-sm font-bold text-text dark:text-white">{stats.completed}</span>
                </div>
                <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-background-white dark:bg-background-dark rounded-lg border border-border dark:border-border-dark">
                  <div className="size-2 rounded-full bg-primary" />
                  <span className="text-xs text-text-secondary">진행중</span>
                  <span className="text-sm font-bold text-text dark:text-white">{stats.inProgress}</span>
                </div>
                <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-background-white dark:bg-background-dark rounded-lg border border-border dark:border-border-dark">
                  <div className="size-2 rounded-full bg-gray-400" />
                  <span className="text-xs text-text-secondary">대기</span>
                  <span className="text-sm font-bold text-text dark:text-white">{stats.pending}</span>
                </div>
                <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-rose-500/10 dark:bg-rose-500/20 rounded-lg border border-rose-500/30">
                  <div className="size-2 rounded-full bg-rose-500" />
                  <span className="text-xs text-rose-600 dark:text-rose-400">지연</span>
                  <span className="text-sm font-bold text-rose-600 dark:text-rose-400">{stats.delayed}</span>
                  <span className="text-[10px] text-rose-500 dark:text-rose-400 font-medium">({stats.delayedRate}%)</span>
                </div>
                <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-background-white dark:bg-background-dark rounded-lg border border-border dark:border-border-dark">
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
                {/* 선택 툴바 (항목 선택 시 표시) */}
                {checkedIds.size > 0 && (
                  <div className="h-10 border-b border-primary/30 bg-primary/5 flex items-center justify-between px-4 shrink-0">
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={checkedIds.size === getAllItemIds(wbsTree).length}
                        onChange={(e) => handleCheckAll(e.target.checked)}
                        className="size-4 rounded border-primary text-primary focus:ring-primary focus:ring-offset-0 cursor-pointer"
                        title="전체 선택/해제"
                      />
                      <span className="text-sm font-medium text-primary">
                        {checkedIds.size}개 항목 선택됨
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setShowBulkAssignModal(true)}
                        className="px-3 py-1.5 bg-primary text-white text-sm rounded-lg hover:bg-primary-dark transition-colors flex items-center gap-2"
                      >
                        <Icon name="group_add" size="sm" />
                        일괄 담당자 배정
                      </button>
                      <button
                        onClick={() => setCheckedIds(new Set())}
                        className="px-3 py-1.5 text-text-secondary hover:text-text hover:bg-surface dark:hover:bg-surface-dark text-sm rounded-lg transition-colors"
                      >
                        선택 해제
                      </button>
                    </div>
                  </div>
                )}

                {/* 헤더 */}
                <div className="h-9 border-b border-border dark:border-border-dark bg-surface dark:bg-surface-dark flex items-center px-3 shrink-0">
                  {/* 전체 선택 체크박스 */}
                  <input
                    type="checkbox"
                    checked={checkedIds.size > 0 && checkedIds.size === getAllItemIds(wbsTree).length}
                    onChange={(e) => handleCheckAll(e.target.checked)}
                    className="size-4 rounded border-border dark:border-border-dark text-primary focus:ring-primary focus:ring-offset-0 mr-2 cursor-pointer flex-shrink-0"
                    title="전체 선택/해제"
                  />
                  <div className="flex-1 text-[11px] font-semibold text-text-secondary uppercase">
                    WBS 항목
                  </div>
                  <div className="w-32 text-[11px] font-semibold text-text-secondary uppercase text-center flex-shrink-0">
                    계획기간
                  </div>
                  <div className="w-32 text-[11px] font-semibold text-text-secondary uppercase text-center flex-shrink-0">
                    실제기간
                  </div>
                  <div className="w-16 text-[11px] font-semibold text-text-secondary uppercase text-center flex-shrink-0">
                    진행률
                  </div>
                  <div className="w-20 text-[11px] font-semibold text-text-secondary uppercase text-center flex-shrink-0">
                    상태
                  </div>
                  <div className="w-14 text-[11px] font-semibold text-text-secondary uppercase text-center flex-shrink-0">
                    담당
                  </div>
                  <div className="w-24 text-[11px] font-semibold text-text-secondary uppercase text-center flex-shrink-0">
                    산출물
                  </div>
                </div>

                {/* WBS 트리 목록 */}
                <div ref={treeListRef} className="flex-1 overflow-y-auto">
                  {wbsTree.map((item) => (
                    <WbsTreeItem
                      key={item.id}
                      item={item}
                      expandedIds={expandedIds}
                      selectedId={selectedItemId}
                      checkedIds={checkedIds}
                      onToggle={handleToggle}
                      onSelect={setSelectedItemId}
                      onCheck={handleCheck}
                      onAddChild={handleAddChild}
                      onEdit={handleEdit}
                      onDelete={handleDelete}
                      onLevelUp={handleLevelUp}
                      onLevelDown={handleLevelDown}
                      onRegisterTask={handleRegisterTask}
                      onUpdateProgress={handleUpdateProgress}
                      onPreviewDeliverable={setDeliverablePreviewUrl}
                    />
                  ))}
                </div>

                {/* 하단 요약 */}
                <div className="h-8 border-t border-border dark:border-border-dark bg-surface dark:bg-surface-dark flex items-center justify-between px-3 text-[11px] text-text-secondary">
                  <span>{stats.total}개 항목</span>
                  <div className="flex gap-2">
                    {Object.entries(levelNames).map(([level, name]) => (
                      <span key={level} className="flex items-center gap-1">
                        <span className={`size-1.5 rounded-full ${levelColors[level as WbsLevel]}`} />
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
              <div className="flex-1 flex flex-col overflow-hidden bg-background-white dark:bg-[#161b22]">
                {/* 줌 컨트롤 */}
                <div className="h-8 px-2 flex items-center gap-2 border-b border-border dark:border-border-dark bg-surface/50 dark:bg-surface-dark/50 shrink-0">
                  <span className="text-[10px] text-text-secondary">줌</span>
                  <button
                    onClick={handleZoomOut}
                    disabled={zoomIndex === 0}
                    className="size-6 rounded flex items-center justify-center bg-background-white dark:bg-background-dark border border-border dark:border-border-dark hover:bg-surface dark:hover:bg-surface-dark disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    title="축소"
                  >
                    <Icon name="remove" size="xs" />
                  </button>
                  <div className="w-16 h-1.5 bg-border dark:bg-border-dark rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full transition-all"
                      style={{ width: `${((zoomIndex + 1) / zoomLevels.length) * 100}%` }}
                    />
                  </div>
                  <button
                    onClick={handleZoomIn}
                    disabled={zoomIndex === zoomLevels.length - 1}
                    className="size-6 rounded flex items-center justify-center bg-background-white dark:bg-background-dark border border-border dark:border-border-dark hover:bg-surface dark:hover:bg-surface-dark disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    title="확대"
                  >
                    <Icon name="add" size="xs" />
                  </button>
                  <span className="text-[10px] text-text-secondary ml-1">{cellWidth}px</span>
                </div>

                {/* 스크롤 영역 */}
                <div ref={ganttScrollRef} className="flex-1 overflow-auto">
                  {/* 날짜 헤더 */}
                  <div className="h-9 border-b border-border dark:border-border-dark bg-surface dark:bg-surface-dark flex sticky top-0 z-10">
                    {dates.map((date, index) => (
                      <div
                        key={index}
                        className={`
                          flex-shrink-0 border-r border-border dark:border-border-dark
                          flex flex-col items-center justify-center
                          ${cellWidth < 35 ? "text-[9px]" : "text-[11px]"}
                          ${date.isWeekend ? "bg-surface dark:bg-surface-dark/50" : ""}
                          ${date.isToday ? "bg-primary/10 text-primary font-bold" : "text-text-secondary"}
                        `}
                        style={{ minWidth: `${cellWidth}px`, width: `${cellWidth}px` }}
                      >
                        {cellWidth >= 30 ? (
                          <>
                            <span>{date.month}/{date.day}</span>
                            {cellWidth >= 40 && <span className="text-[9px] opacity-70">{date.dayName}</span>}
                          </>
                        ) : (
                          <span>{date.day}</span>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* 간트 바 영역 */}
                  <div className="relative" style={{ width: `${dates.length * cellWidth}px` }}>
                    {/* 그리드 라인 */}
                    <div className="absolute inset-0 flex pointer-events-none">
                      {dates.map((date, index) => (
                        <div
                          key={index}
                          className={`
                            flex-shrink-0 border-r border-border/30 dark:border-border-dark/30
                            ${date.isWeekend ? "bg-surface/50 dark:bg-surface-dark/30" : ""}
                            ${date.isToday ? "bg-primary/5" : ""}
                          `}
                          style={{ minWidth: `${cellWidth}px`, width: `${cellWidth}px`, height: `${visibleItems.length * 40}px` }}
                        />
                      ))}
                    </div>

                    {/* 오늘 표시선 */}
                    {todayIndex >= 0 && (
                      <div
                        className="absolute top-0 bottom-0 w-0.5 bg-error z-10"
                        style={{
                          left: `${todayIndex * cellWidth + cellWidth / 2}px`,
                          height: `${visibleItems.length * 40}px`,
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

                    const barWidth = Math.max((adjustedEndIndex - adjustedStartIndex + 1) * cellWidth - 8, cellWidth * 0.8);
                    const barLeft = adjustedStartIndex * cellWidth + 4;

                    return (
                      <div
                        key={item.id}
                        data-gantt-id={item.id}
                        className="h-10 border-b border-border/30 dark:border-border-dark/30 relative flex items-center"
                      >
                        <div
                          data-gantt-bar
                          className={`
                            absolute h-6 rounded transition-all group
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
                              {barWidth > cellWidth * 2.5 ? `${item.code} ${item.name}` : barWidth > cellWidth * 1.2 ? item.code : ""}
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
            </div>
          )}
        </>
      )}

      {/* 일괄 배정 모달 */}
      <BulkAssignModal
        isOpen={showBulkAssignModal}
        checkedCount={checkedIds.size}
        teamMembers={teamMembers}
        selectedAssigneeIds={bulkAssigneeIds}
        onAssigneeChange={setBulkAssigneeIds}
        onAssign={handleBulkAssign}
        onClose={() => setShowBulkAssignModal(false)}
      />

      {/* WBS 항목 추가/수정 모달 */}
      <WbsFormModal
        isOpen={showAddModal}
        editingItem={editingItem}
        teamMembers={teamMembers}
        formData={newItem}
        onFormChange={(data) => setNewItem({ ...newItem, ...data })}
        onSubmit={handleSubmit}
        onClose={() => {
          setShowAddModal(false);
          setEditingItem(null);
        }}
        isSubmitting={createWbs.isPending || updateWbs.isPending}
      />

      {/* 산출물 미리보기 모달 */}
      <DeliverablePreviewModal
        url={deliverablePreviewUrl}
        onClose={() => setDeliverablePreviewUrl(null)}
      />

      {/* 삭제 확인 모달 */}
      <ConfirmModal
        isOpen={showDeleteConfirm}
        title="WBS 항목 삭제"
        message={`"${deletingItemName}" 항목과 모든 하위 항목이 삭제됩니다.\n\n이 작업은 되돌릴 수 없습니다. 계속하시겠습니까?`}
        onConfirm={handleConfirmDelete}
        onCancel={() => {
          setShowDeleteConfirm(false);
          setDeletingItemId(null);
          setDeletingItemName("");
        }}
        confirmText="삭제"
        cancelText="취소"
        variant="danger"
        isLoading={deleteWbs.isPending}
      />
    </div>
  );
}
