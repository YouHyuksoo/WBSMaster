/**
 * @file src/components/dashboard/MilestoneTimeline.tsx
 * @description
 * 마일스톤 타임라인 메인 컴포넌트입니다.
 * 프로젝트의 마일스톤을 월별 타임라인으로 시각화하며,
 * 다중 행 구조와 드래그 & 드롭을 지원합니다.
 *
 * 초보자 가이드:
 * 1. **projectId**: 표시할 프로젝트 ID
 * 2. **TimelineHeader**: 월별 그리드 헤더
 * 3. **TimelineRowItem**: 각 행 (마일스톤이 배치되는 영역)
 * 4. **DndContext**: 드래그 앤 드롭 컨텍스트
 *
 * 구조:
 * ┌───────────────────────────────────────────────────┐
 * │ 헤더: 📍 마일스톤 타임라인  [+ 그룹행 추가] [+ 추가]│
 * ├─────────┬─────────────────────────────────────────┤
 * │  기간   │   1월    2월    3월    4월    5월   ... │
 * ├─────────┼─────────────────────────────────────────┤
 * │ 태스크  │ ████████  ████████████                  │
 * ├─────────┼─────────────────────────────────────────┤
 * │ 인프라  │      █████████████                      │
 * ├─────────┼─────────────────────────────────────────┤
 * │ + 행추가│                                         │
 * └─────────┴─────────────────────────────────────────┘
 */

"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import {
  DndContext,
  DragEndEvent,
  DragStartEvent,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  pointerWithin,
  rectIntersection,
  useDraggable,
  useDroppable,
  CollisionDetection,
} from "@dnd-kit/core";
import { Icon } from "@/components/ui";
import {
  TimelineHeader,
  TimelineGridBackground,
  getTodayPosition,
  getDateFromPosition,
  getPercentFromMouseX,
  getTotalDays,
  getDatePosition,
} from "./TimelineHeader";
import {
  TimelineRowItem,
  UnassignedRowItem,
  ROW_HEIGHT,
} from "./TimelineRowItem";
import { MilestoneBar, MilestoneBarOverlay, calculateMilestonePosition } from "./MilestoneBar";
import { MilestoneModal } from "./MilestoneModal";
import { RowModal } from "./RowModal";
import { PinpointModal } from "./PinpointModal";
import { PinpointMarker, PinpointMarkerOverlay } from "./PinpointMarker";
import { useMilestones, useUpdateMilestone } from "@/hooks/useMilestones";
import {
  useTimelineRows,
  useCreateTimelineRow,
  useUpdateTimelineRow,
  useDeleteTimelineRow,
} from "@/hooks/useTimelineRows";
import {
  usePinpoints,
  useCreatePinpoint,
  useUpdatePinpoint,
  useDeletePinpoint,
} from "@/hooks/usePinpoints";
import type { Milestone, TimelineRow, Pinpoint } from "@/lib/api";

/** 라벨 영역 너비 */
const LABEL_WIDTH = 120;

/**
 * 드롭 가능한 행 영역 컴포넌트
 * 마일스톤을 드래그하여 다른 행으로 이동할 수 있게 해줍니다.
 */
interface DroppableRowAreaProps {
  /** 행 ID */
  rowId: string;
  /** 자식 요소 */
  children: React.ReactNode;
  /** 추가 클래스 */
  className?: string;
  /** 스타일 */
  style?: React.CSSProperties;
  /** 클릭 핸들러 */
  onClick?: (e: React.MouseEvent) => void;
}

function DroppableRowArea({ rowId, children, className, style, onClick }: DroppableRowAreaProps) {
  const { setNodeRef, isOver, active } = useDroppable({
    id: `row-${rowId}`,
  });

  // 마일스톤이나 핀포인트를 드래그 중일 때만 드롭 피드백 표시
  const showDropFeedback = isOver && active && (
    String(active.id).startsWith("milestone-") ||
    String(active.id).startsWith("pinpoint-")
  );

  return (
    <div
      ref={setNodeRef}
      className={`${className} ${showDropFeedback ? "!bg-blue-200/70 dark:!bg-blue-800/50 ring-2 ring-blue-400 ring-inset" : ""}`}
      style={style}
      onClick={onClick}
    >
      {children}
    </div>
  );
}

/**
 * 드래그 가능한 부모 행 라벨 컴포넌트
 * 그룹(부모 행)을 드래그하여 순서를 변경할 수 있게 해줍니다.
 */
interface DraggableRowLabelProps {
  /** 행 데이터 */
  row: TimelineRow;
  /** 그룹 높이 */
  groupHeight: number;
  /** 선택 여부 */
  isSelected: boolean;
  /** 클릭 핸들러 */
  onClick: () => void;
  /** 라벨 너비 */
  labelWidth: number;
}

function DraggableRowLabel({ row, groupHeight, isSelected, onClick, labelWidth }: DraggableRowLabelProps) {
  // 드래그 가능 설정
  const {
    attributes,
    listeners,
    setNodeRef: setDragRef,
    isDragging,
  } = useDraggable({
    id: `row-${row.id}`,
  });

  // 드롭 가능 설정 (다른 행이 이 위로 드롭될 수 있음)
  const { setNodeRef: setDropRef, isOver } = useDroppable({
    id: `row-drop-${row.id}`,
  });

  // 행 색상을 연하게 만들어 배경으로 사용
  const bgColorStyle = {
    backgroundColor: `${row.color}20`, // 20 = 12.5% opacity in hex
  };

  return (
    <div
      ref={(node) => {
        setDragRef(node);
        setDropRef(node);
      }}
      className={`flex-shrink-0 flex items-center justify-between relative border-r border-slate-200 dark:border-slate-700 transition-all cursor-pointer ${
        isSelected
          ? "ring-2 ring-blue-500 ring-inset"
          : "hover:brightness-95 dark:hover:brightness-110"
      } ${isDragging ? "opacity-50 shadow-lg z-50" : ""} ${
        isOver ? "ring-2 ring-green-500 ring-inset" : ""
      }`}
      style={{
        width: labelWidth,
        height: groupHeight,
        paddingLeft: "24px",
        ...bgColorStyle,
      }}
      onClick={onClick}
    >
      {/* 드래그 핸들 아이콘 */}
      <div
        className="absolute left-1 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 cursor-grab active:cursor-grabbing select-none p-1"
        {...attributes}
        {...listeners}
      >
        ⋮⋮
      </div>
      <div className="flex items-center gap-2 min-w-0 px-1">
        <div
          className="w-3 h-3 rounded-full flex-shrink-0 border border-white/50 shadow-sm"
          style={{ backgroundColor: row.color }}
        />
        <span className="text-sm font-medium text-slate-700 dark:text-slate-200 truncate">
          {row.name}
        </span>
      </div>
    </div>
  );
}

interface MilestoneTimelineProps {
  /** 프로젝트 ID */
  projectId: string;
  /** 프로젝트 시작일 */
  startDate: string | null;
  /** 프로젝트 종료일 */
  endDate: string | null;
}

/**
 * 마일스톤 타임라인 컴포넌트
 */
export function MilestoneTimeline({
  projectId,
  startDate: projectStartDate,
  endDate: projectEndDate,
}: MilestoneTimelineProps) {
  // 마일스톤 목록 조회
  const { data: milestones = [], isLoading: milestonesLoading } = useMilestones({
    projectId,
  });

  // 타임라인 행 목록 조회
  const { data: rows = [], isLoading: rowsLoading } = useTimelineRows(projectId);

  // 핀포인트 목록 조회
  const { data: pinpoints = [] } = usePinpoints({ projectId });

  // 뮤테이션 훅
  const updateMilestone = useUpdateMilestone();
  const createRow = useCreateTimelineRow();
  const updateRow = useUpdateTimelineRow();
  const deleteRow = useDeleteTimelineRow();
  const createPinpoint = useCreatePinpoint();
  const deletePinpoint = useDeletePinpoint();
  const updatePinpoint = useUpdatePinpoint();

  // 모달 상태
  const [isMilestoneModalOpen, setIsMilestoneModalOpen] = useState(false);
  const [selectedMilestone, setSelectedMilestone] = useState<Milestone | null>(
    null
  );
  const [isRowModalOpen, setIsRowModalOpen] = useState(false);
  const [selectedRow, setSelectedRow] = useState<TimelineRow | null>(null);
  const [isPinpointModalOpen, setIsPinpointModalOpen] = useState(false);
  const [selectedPinpointRowId, setSelectedPinpointRowId] = useState<string | null>(null);
  const [selectedPinpointForEdit, setSelectedPinpointForEdit] = useState<Pinpoint | null>(null);
  const [pinpointDate, setPinpointDate] = useState<string>("");
  const [selectedRowId, setSelectedRowId] = useState<string | null>(null); // 선택된 행 (메뉴 표시용)
  const [selectedMilestoneId, setSelectedMilestoneId] = useState<string | null>(null); // 선택된 마일스톤
  const [selectedPinpointId, setSelectedPinpointId] = useState<string | null>(null); // 선택된 핀포인트

  // 삭제 확인 모달
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{
    type: "row" | "pinpoint";
    id: string;
    name: string;
    rowId?: string; // 핀포인트 삭제 시 필요
  } | null>(null);

  // 알림 모달 상태
  const [alertMessage, setAlertMessage] = useState<string | null>(null);

  // 드래그 상태 (마일스톤)
  const [activeMilestone, setActiveMilestone] = useState<Milestone | null>(null);
  // 드래그 상태 (핀포인트)
  const [activePinpoint, setActivePinpoint] = useState<Pinpoint | null>(null);

  // 행 hover 상태
  const [hoveredRowId, setHoveredRowId] = useState<string | null>(null);

  // 리사이즈 상태 (좌우 핸들 드래그)
  const [resizingMilestone, setResizingMilestone] = useState<{
    id: string;
    direction: "left" | "right";
    startX: number;
    startDate: Date;
    endDate: Date;
    containerRect: DOMRect;
  } | null>(null);

  // 드래그 센서 설정
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5, // 5px 이동해야 드래그 시작
      },
    })
  );

  // 타임라인 시작/종료일 계산
  const { timelineStart, timelineEnd } = useMemo(() => {
    const now = new Date();
    const currentYear = now.getFullYear();

    // 프로젝트 날짜가 있으면 사용, 없으면 현재 연도 기준
    const start = projectStartDate
      ? new Date(projectStartDate)
      : new Date(currentYear, 0, 1);

    const end = projectEndDate
      ? new Date(projectEndDate)
      : new Date(currentYear, 11, 31);

    return { timelineStart: start, timelineEnd: end };
  }, [projectStartDate, projectEndDate]);

  // 행별 마일스톤 그룹핑
  const milestonesByRow = useMemo(() => {
    const grouped: Record<string, Milestone[]> = {};
    const unassigned: Milestone[] = [];

    // 먼저 모든 행에 빈 배열 초기화
    rows.forEach((row) => {
      grouped[row.id] = [];
    });

    // 마일스톤을 행에 할당
    milestones.forEach((milestone) => {
      if (milestone.rowId && grouped[milestone.rowId]) {
        grouped[milestone.rowId].push(milestone);
      } else {
        unassigned.push(milestone);
      }
    });

    return { grouped, unassigned };
  }, [milestones, rows]);

  /**
   * 행 렌더링 (그룹별 병합 표시)
   * 같은 parentId를 가진 행들을 그룹으로 묶어서 표시
   * 정렬: order 기준, 동일 시 createdAt 기준
   */
  const displayRows = useMemo(() => {
    const result: (TimelineRow & { isChild?: boolean })[] = [];

    // 안정적인 정렬 함수: order 기준, 동일 시 createdAt 기준
    const stableSort = (a: TimelineRow, b: TimelineRow) => {
      if (a.order !== b.order) return a.order - b.order;
      // order가 같으면 createdAt으로 정렬 (오래된 것이 먼저)
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    };

    // 부모 행들만 필터링 (parentId가 null인 행들)
    const parentRows = rows
      .filter((row) => !row.parentId)
      .sort(stableSort);

    // 각 부모와 자식 행들을 그룹으로 표시
    parentRows.forEach((parent) => {
      // 부모 행 추가
      result.push({ ...parent, isChild: false });

      // 같은 parentId를 가진 자식 행들 추가
      const children = rows
        .filter((row) => row.parentId === parent.id)
        .sort(stableSort);

      children.forEach((child) => {
        result.push({ ...child, isChild: true });
      });
    });

    return result;
  }, [rows]);

  // 드래그 시작 핸들러
  const handleDragStart = useCallback(
    (event: DragStartEvent) => {
      const { active } = event;
      const id = String(active.id);

      // 마일스톤 드래그
      if (id.startsWith("milestone-")) {
        const milestoneId = id.replace("milestone-", "");
        const milestone = milestones.find((m) => m.id === milestoneId);
        if (milestone) {
          setActiveMilestone(milestone);
          setActivePinpoint(null);
        }
      }

      // 핀포인트 드래그
      if (id.startsWith("pinpoint-")) {
        const pinpointId = id.replace("pinpoint-", "");
        const pinpoint = pinpoints.find((p) => p.id === pinpointId);
        if (pinpoint) {
          setActivePinpoint(pinpoint);
          setActiveMilestone(null);
        }
      }
    },
    [milestones, pinpoints]
  );

  /**
   * 드래그 종료 핸들러
   * 1. 행 드래그: 행 순서 변경
   * 2. 마일스톤 드래그: rowId + startDate/endDate 동시 변경
   * 3. 핀포인트 드래그: rowId + date 동시 변경
   */
  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over, delta } = event;
      setActiveMilestone(null);
      setActivePinpoint(null);

      const activeId = String(active.id);

      // 행 순서 변경 (부모 행만)
      if (activeId.startsWith("row-") && !activeId.startsWith("row-drop-") && over) {
        const activeRowId = activeId.replace("row-", "");
        const overId = String(over.id);
        // row-drop-xxx 또는 row-xxx 형식에서 ID 추출
        const overRowId = overId.replace("row-drop-", "").replace("row-", "");

        if (activeRowId !== overRowId) {
          const activeRow = rows.find((r) => r.id === activeRowId && !r.parentId);
          const overRow = rows.find((r) => r.id === overRowId && !r.parentId);

          if (activeRow && overRow) {
            // 순서 교환
            updateRow.mutate({
              id: activeRow.id,
              data: { order: overRow.order },
            });
            updateRow.mutate({
              id: overRow.id,
              data: { order: activeRow.order },
            });
          }
        }
        return;
      }

      // 핀포인트 드래그
      if (activeId.startsWith("pinpoint-")) {
        const pinpointId = activeId.replace("pinpoint-", "");
        const pinpoint = pinpoints.find((p) => p.id === pinpointId);

        if (!pinpoint) return;

        // 업데이트할 데이터 객체
        const pinpointUpdateData: {
          rowId?: string;
          date?: string;
        } = {};

        // 1. 행 변경 확인 (드롭 대상이 다른 행인 경우)
        if (over && String(over.id).startsWith("row-")) {
          const newRowId = String(over.id).replace("row-", "");
          if (pinpoint.rowId !== newRowId) {
            pinpointUpdateData.rowId = newRowId;
          }
        }

        // 2. 좌우 이동 확인 (X축 이동이 일정 이상)
        if (Math.abs(delta.x) > 5) {
          const container = document.querySelector(".timeline-container");
          if (container) {
            const containerWidth = container.getBoundingClientRect().width;

            if (containerWidth > 0) {
              // 마우스 X 이동을 퍼센트로 변환
              const deltaPercent = (delta.x / containerWidth) * 100;

              // 현재 날짜
              const currentDate = new Date(pinpoint.date);

              // 타임라인 전체 일수
              const totalDays = getTotalDays(timelineStart, timelineEnd);

              // 퍼센트 변화를 일수로 변환
              const daysDelta = Math.round((deltaPercent / 100) * totalDays);

              // 새로운 날짜 계산
              const newDate = new Date(currentDate);
              newDate.setDate(newDate.getDate() + daysDelta);

              // 타임라인 범위 내에서만 날짜 변경
              if (newDate >= timelineStart && newDate <= timelineEnd) {
                const newDateStr = newDate.toISOString().split("T")[0];

                // 날짜가 실제로 변경되었을 때만 추가
                if (newDateStr !== currentDate.toISOString().split("T")[0]) {
                  pinpointUpdateData.date = newDateStr;
                }
              }
            }
          }
        }

        // 3. 변경사항이 있으면 한 번에 업데이트
        if (Object.keys(pinpointUpdateData).length > 0) {
          updatePinpoint.mutate({
            id: pinpoint.id,
            data: pinpointUpdateData,
          });
        }
        return;
      }

      // 마일스톤 드래그
      if (activeId.startsWith("milestone-")) {
        const milestoneId = activeId.replace("milestone-", "");
        const milestone = milestones.find((m) => m.id === milestoneId);

        if (!milestone) return;

        // 업데이트할 데이터 객체
        const milestoneUpdateData: {
          rowId?: string;
          startDate?: string;
          endDate?: string;
        } = {};

        // 1. 행 변경 확인 (드롭 대상이 다른 행인 경우)
        if (over && String(over.id).startsWith("row-")) {
          const newRowId = String(over.id).replace("row-", "");
          if (milestone.rowId !== newRowId) {
            milestoneUpdateData.rowId = newRowId;
          }
        }

        // 2. 좌우 이동 확인 (X축 이동이 일정 이상)
        if (Math.abs(delta.x) > 5) {
          const container = document.querySelector(".timeline-container");
          if (container) {
            const containerWidth = container.getBoundingClientRect().width;

            if (containerWidth > 0) {
              // 마우스 X 이동을 퍼센트로 변환
              const deltaPercent = (delta.x / containerWidth) * 100;

              // 현재 기간의 길이 계산
              const currentStart = new Date(milestone.startDate);
              const currentEnd = new Date(milestone.endDate);
              const duration = currentEnd.getTime() - currentStart.getTime();

              // 타임라인 전체 일수
              const totalDays = getTotalDays(timelineStart, timelineEnd);

              // 퍼센트 변화를 일수로 변환
              const daysDelta = Math.round((deltaPercent / 100) * totalDays);

              // 새로운 시작/종료일 계산
              const newStart = new Date(currentStart);
              newStart.setDate(newStart.getDate() + daysDelta);
              const newEnd = new Date(newStart.getTime() + duration);

              // 타임라인 범위 내에서만 날짜 변경
              if (newStart >= timelineStart && newEnd <= timelineEnd) {
                const newStartStr = newStart.toISOString().split("T")[0];
                const newEndStr = newEnd.toISOString().split("T")[0];

                // 날짜가 실제로 변경되었을 때만 추가
                if (
                  newStartStr !== currentStart.toISOString().split("T")[0] ||
                  newEndStr !== currentEnd.toISOString().split("T")[0]
                ) {
                  milestoneUpdateData.startDate = newStartStr;
                  milestoneUpdateData.endDate = newEndStr;
                }
              }
            }
          }
        }

        // 3. 변경사항이 있으면 한 번에 업데이트
        if (Object.keys(milestoneUpdateData).length > 0) {
          updateMilestone.mutate({
            id: milestone.id,
            data: milestoneUpdateData,
          });
        }
      }
    },
    [milestones, pinpoints, updateMilestone, updatePinpoint, timelineStart, timelineEnd, rows, updateRow]
  );

  // 마일스톤 클릭 핸들러
  const handleMilestoneClick = useCallback((milestone: Milestone) => {
    setSelectedMilestone(milestone);
    setIsMilestoneModalOpen(true);
  }, []);

  // 새 마일스톤 추가
  const handleAddMilestone = useCallback(() => {
    setSelectedMilestone(null);
    setIsMilestoneModalOpen(true);
  }, []);

  // 마일스톤 모달 닫기
  const handleCloseMilestoneModal = useCallback(() => {
    setIsMilestoneModalOpen(false);
    setSelectedMilestone(null);
  }, []);

  // 행 추가 클릭
  const handleAddRow = useCallback(() => {
    setSelectedRow(null);
    setIsRowModalOpen(true);
  }, []);

  // 행 수정 클릭
  const handleEditRow = useCallback((row: TimelineRow) => {
    setSelectedRow(row);
    setIsRowModalOpen(true);
  }, []);

  // 자식 행 추가 클릭
  const handleAddChildRow = useCallback(
    (parentRowId: string) => {
      // 부모 행 찾기
      const parentRow = rows.find((r) => r.id === parentRowId);
      if (!parentRow) return;

      // 부모와 동일한 색상으로 자식 행 생성 (모달 없이 바로 생성)
      createRow.mutate({
        name: `${parentRow.name}-${Math.floor(Math.random() * 1000)}`,
        color: parentRow.color,
        projectId,
        parentId: parentRowId,
      });
    },
    [rows, createRow, projectId]
  );

  // 행 삭제 클릭
  const handleDeleteRow = useCallback(
    (row: TimelineRow) => {
      setDeleteTarget({
        type: "row",
        id: row.id,
        name: row.name,
      });
      setDeleteConfirmOpen(true);
    },
    []
  );

  // 행 모달 닫기
  const handleCloseRowModal = useCallback(() => {
    setIsRowModalOpen(false);
    setSelectedRow(null);
  }, []);


  // 핀포인트 저장 (신규/수정)
  const handleSavePinpoint = useCallback(
    async (data: {
      name: string;
      date: string;
      color: string;
      description?: string;
    }) => {
      if (selectedPinpointForEdit) {
        // 수정 모드
        await updatePinpoint.mutateAsync({
          id: selectedPinpointForEdit.id,
          data: {
            name: data.name,
            date: data.date,
            color: data.color,
            description: data.description,
          },
        });
      } else if (selectedPinpointRowId) {
        // 신규 모드
        await createPinpoint.mutateAsync({
          name: data.name,
          date: data.date,
          color: data.color,
          description: data.description,
          projectId,
          rowId: selectedPinpointRowId,
        });
      }

      setIsPinpointModalOpen(false);
      setSelectedPinpointRowId(null);
      setSelectedPinpointForEdit(null);
      setPinpointDate("");
    },
    [selectedPinpointRowId, selectedPinpointForEdit, createPinpoint, updatePinpoint, projectId]
  );

  // 핀포인트 수정 클릭
  const handleEditPinpoint = useCallback(
    (pinpointId: string) => {
      const pinpoint = pinpoints.find((p) => p.id === pinpointId);
      if (pinpoint) {
        setSelectedPinpointForEdit(pinpoint);
        setPinpointDate(pinpoint.date);
        setIsPinpointModalOpen(true);
      }
    },
    [pinpoints]
  );

  // 핀포인트 삭제 (optimistic delete - 즉시 반영)
  const handleDeletePinpoint = useCallback(
    (pinpointId: string, rowId: string) => {
      // 즉시 UI에서 제거 (optimistic delete)
      const pinpoint = pinpoints.find((p) => p.id === pinpointId);

      // UI 상태 초기화
      setSelectedPinpointId(null);

      // 서버에 삭제 요청 (비동기)
      if (pinpoint) {
        deletePinpoint.mutate({
          id: pinpointId,
          projectId,
          rowId,
        });
      }
    },
    [pinpoints, projectId, deletePinpoint]
  );

  // 삭제 확인 후 실제 삭제 처리
  const handleConfirmDelete = useCallback(() => {
    if (!deleteTarget) return;

    if (deleteTarget.type === "row") {
      deleteRow.mutate({ id: deleteTarget.id, projectId });
    } else if (deleteTarget.type === "pinpoint" && deleteTarget.rowId) {
      deletePinpoint.mutate({
        id: deleteTarget.id,
        projectId,
        rowId: deleteTarget.rowId,
      });
    }

    setDeleteConfirmOpen(false);
    setDeleteTarget(null);
  }, [deleteTarget, deleteRow, deletePinpoint, projectId]);


  /**
   * 마일스톤 리사이즈 시작 핸들러
   * @param milestoneId - 리사이즈할 마일스톤 ID
   * @param direction - 리사이즈 방향 (left: 시작일, right: 종료일)
   * @param event - 마우스 이벤트
   */
  const handleResizeStart = useCallback(
    (milestoneId: string, direction: "left" | "right", event: React.MouseEvent) => {
      event.stopPropagation(); // 드래그 이벤트 차단

      const milestone = milestones.find((m) => m.id === milestoneId);
      if (!milestone) return;

      // 타임라인 컨테이너 Rect 가져오기
      const container = document.querySelector(".timeline-container");
      if (!container) return;

      setResizingMilestone({
        id: milestoneId,
        direction,
        startX: event.clientX,
        startDate: new Date(milestone.startDate),
        endDate: new Date(milestone.endDate),
        containerRect: container.getBoundingClientRect(),
      });
    },
    [milestones]
  );

  // 행 저장 핸들러
  const handleSaveRow = useCallback(
    async (data: { name: string; color: string; parentId?: string | null }) => {
      if (selectedRow && selectedRow.id) {
        // 수정 (id가 있는 경우)
        await updateRow.mutateAsync({
          id: selectedRow.id,
          data: {
            name: data.name,
            color: data.color,
            ...(data.parentId !== undefined && { parentId: data.parentId }),
          },
        });
      } else {
        // 생성
        await createRow.mutateAsync({
          name: data.name,
          color: data.color,
          projectId,
          parentId: data.parentId || undefined,
        });
      }
      handleCloseRowModal();
    },
    [selectedRow, updateRow, createRow, projectId, handleCloseRowModal]
  );

  /**
   * 리사이즈 중 마우스 이동 처리
   * 마우스 X 위치를 날짜로 변환하고 로컬 상태만 업데이트 (실시간 피드백)
   * API 저장은 mouseup에서만 수행
   */
  useEffect(() => {
    if (!resizingMilestone) return;

    const handleMouseMove = (e: MouseEvent) => {
      const { direction, containerRect, startDate, endDate } = resizingMilestone;

      // 마우스 X를 퍼센트로 변환
      const newPercent = getPercentFromMouseX(e.clientX, containerRect);

      // 퍼센트를 날짜로 변환
      const newDate = getDateFromPosition(newPercent, timelineStart, timelineEnd);

      // 최소 너비 검증 (1일)
      let updatedStartDate = startDate;
      let updatedEndDate = endDate;

      if (direction === "left") {
        // 좌측 리사이즈: startDate 변경
        // 종료일보다 1일 전까지만 허용
        const maxStart = new Date(endDate);
        maxStart.setDate(maxStart.getDate() - 1);
        updatedStartDate = newDate > maxStart ? maxStart : newDate;
      } else {
        // 우측 리사이즈: endDate 변경
        // 시작일보다 1일 후부터만 허용
        const minEnd = new Date(startDate);
        minEnd.setDate(minEnd.getDate() + 1);
        updatedEndDate = newDate < minEnd ? minEnd : newDate;
      }

      // 로컬 상태만 업데이트 (실시간 UI 피드백)
      setResizingMilestone((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          startDate: updatedStartDate,
          endDate: updatedEndDate,
        };
      });
    };

    const handleMouseUp = () => {
      // mouseup 시에만 API 호출하여 최종 상태 저장
      if (resizingMilestone) {
        updateMilestone.mutate({
          id: resizingMilestone.id,
          data: {
            startDate: resizingMilestone.startDate.toISOString().split("T")[0],
            endDate: resizingMilestone.endDate.toISOString().split("T")[0],
          },
        });
      }
      setResizingMilestone(null);
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [resizingMilestone, updateMilestone, timelineStart, timelineEnd]);

  // 로딩 상태
  const isLoading = milestonesLoading || rowsLoading;

  return (
    <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
      {/* 헤더 */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-slate-700">
        <div className="flex items-center gap-2">
          <span className="text-lg">📍</span>
          <h3 className="font-semibold text-slate-900 dark:text-slate-100">
            마일스톤 타임라인
          </h3>
          <span className="text-sm text-slate-500 dark:text-slate-400">
            ({milestones.length}개)
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleAddRow}
            className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 rounded-md transition-colors"
          >
            <Icon name="add" size="sm" />
            그룹행 추가
          </button>
          <button
            onClick={() => {
              if (!selectedRowId) {
                setAlertMessage("핀포인트를 추가하려면 먼저 그룹을 선택해주세요.");
                return;
              }
              setPinpointDate(new Date().toISOString().split("T")[0]);
              setSelectedPinpointRowId(selectedRowId);
              setIsPinpointModalOpen(true);
            }}
            className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 rounded-md transition-colors"
          >
            <Icon name="add" size="sm" />
            핀포인트
          </button>
          <button
            onClick={handleAddMilestone}
            className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-white bg-blue-500 hover:bg-blue-600 rounded-md transition-colors"
          >
            <Icon name="add" size="sm" />
            마일스톤 추가
          </button>
        </div>
      </div>

      {/* 선택된 행 메뉴 (고정 표시) */}
      {selectedRowId && rows.find((r) => r.id === selectedRowId && !r.parentId) && (
        <div className="bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-4 py-2 flex items-center gap-2">
          <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
            {rows.find((r) => r.id === selectedRowId)?.name}
          </span>
          <div className="flex items-center gap-1 ml-auto">
            <button
              onClick={() => {
                const selectedRow = rows.find((r) => r.id === selectedRowId);
                if (selectedRow) {
                  handleAddChildRow(selectedRowId);
                  setSelectedRowId(null);
                }
              }}
              className="px-2 py-1 text-xs font-medium text-slate-600 dark:text-slate-400 bg-white dark:bg-slate-700 hover:bg-slate-100 dark:hover:bg-slate-600 border border-slate-200 dark:border-slate-600 rounded transition-colors"
              title="행 추가"
            >
              ➕ 행 추가
            </button>
            <button
              onClick={() => {
                const selectedRow = rows.find((r) => r.id === selectedRowId);
                if (selectedRow) {
                  handleEditRow(selectedRow);
                  setSelectedRowId(null);
                }
              }}
              className="px-2 py-1 text-xs font-medium text-slate-600 dark:text-slate-400 bg-white dark:bg-slate-700 hover:bg-slate-100 dark:hover:bg-slate-600 border border-slate-200 dark:border-slate-600 rounded transition-colors"
              title="행 수정"
            >
              ✏️ 수정
            </button>
            <button
              onClick={() => {
                const selectedRow = rows.find((r) => r.id === selectedRowId);
                if (selectedRow) {
                  handleDeleteRow(selectedRow);
                  setSelectedRowId(null);
                }
              }}
              className="px-2 py-1 text-xs font-medium text-red-600 dark:text-red-400 bg-white dark:bg-slate-700 hover:bg-red-50 dark:hover:bg-red-900/20 border border-red-200 dark:border-red-900 rounded transition-colors"
              title="행 삭제"
            >
              🗑️ 삭제
            </button>
            <button
              onClick={() => setSelectedRowId(null)}
              className="ml-2 px-2 py-1 text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
              title="닫기"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* 선택된 핀포인트 메뉴 (고정 표시) */}
      {selectedPinpointId && (() => {
        const selectedPinpoint = pinpoints.find((p) => p.id === selectedPinpointId);
        return (
          <div className="bg-amber-50 dark:bg-amber-900/20 border-b border-amber-200 dark:border-amber-800 px-4 py-2 flex items-center gap-2">
            <span className="text-sm font-medium text-amber-900 dark:text-amber-100">
              📍 {selectedPinpoint?.name}
            </span>
            <div className="flex items-center gap-1 ml-auto">
              <button
                onClick={() => handleEditPinpoint(selectedPinpointId)}
                className="px-2 py-1 text-xs font-medium text-blue-600 dark:text-blue-400 bg-white dark:bg-slate-700 hover:bg-blue-50 dark:hover:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded transition-colors"
                title="핀포인트 수정"
              >
                ✏️ 수정
              </button>
              <button
                onClick={() => {
                  if (selectedPinpoint) {
                    handleDeletePinpoint(selectedPinpointId, selectedPinpoint.rowId);
                  }
                }}
                className="px-2 py-1 text-xs font-medium text-red-600 dark:text-red-400 bg-white dark:bg-slate-700 hover:bg-red-50 dark:hover:bg-red-900/20 border border-red-200 dark:border-red-800 rounded transition-colors"
                title="핀포인트 삭제"
              >
                🗑️ 삭제
              </button>
              <button
                onClick={() => setSelectedPinpointId(null)}
                className="ml-2 px-2 py-1 text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
                title="닫기"
              >
                ✕
              </button>
            </div>
          </div>
        );
      })()}

      {/* 타임라인 영역 */}
      {isLoading ? (
        <div className="h-40 flex items-center justify-center text-slate-500">
          로딩 중...
        </div>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={pointerWithin}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <div className="overflow-x-auto">
            {/* 월별 헤더 */}
            <TimelineHeader
              startDate={timelineStart}
              endDate={timelineEnd}
              labelWidth={LABEL_WIDTH}
              showTodayLine={true}
            />

            {/* 행들 (그룹별 셀 병합 표시) */}
            <div>
              {displayRows.map((row) => {
                // 부모 행만 처리 (자식은 부모와 함께 렌더링)
                if (row.isChild) return null;

                // 자식 행들 가져오기
                const children = rows.filter((r) => r.parentId === row.id);
                const groupHeight = ROW_HEIGHT * (children.length + 1);
                const allRowsInGroup = [row, ...children]; // 부모 + 자식

                const isGroupHovered = hoveredRowId === row.id;

                return (
                  <div
                    key={row.id}
                    className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors"
                  >
                    {/* 그룹 컨테이너: 부모 라벨이 자식들에 걸쳐 병합됨 */}
                    <div className="flex">
                      {/* 부모 라벨 - 전체 그룹 높이 (드래그 가능) */}
                      <DraggableRowLabel
                        row={row}
                        groupHeight={groupHeight}
                        isSelected={selectedRowId === row.id}
                        onClick={() => setSelectedRowId(row.id)}
                        labelWidth={LABEL_WIDTH}
                      />

                      {/* 그룹의 모든 행들 (부모 + 자식) - DroppableRowArea로 드롭 영역 설정 */}
                      <div className="flex-1">
                        {allRowsInGroup.map((currentRow, rowIdx) => (
                          <DroppableRowArea
                            key={currentRow.id}
                            rowId={currentRow.id}
                            className={`flex relative overflow-visible timeline-container transition-shadow hover:shadow-[inset_0_0_0_9999px_rgba(0,0,0,0.04)] dark:hover:shadow-[inset_0_0_0_9999px_rgba(255,255,255,0.05)] border-b border-slate-200 dark:border-slate-700`}
                            style={{
                              height: ROW_HEIGHT,
                              backgroundColor: `${row.color}10`, // 그룹 색상 배경 (6% opacity)
                            }}
                            onClick={(e) => {
                              // 핀포인트 선택 해제
                              if (selectedPinpointId) {
                                setSelectedPinpointId(null);
                              }
                            }}
                          >
                            {/* 월별 그리드 배경 */}
                            <TimelineGridBackground
                              startDate={timelineStart}
                              endDate={timelineEnd}
                            />

                            {/* 마일스톤 막대들 */}
                            {milestonesByRow.grouped[currentRow.id]?.map((milestone) => {
                              // 리사이징 중인 마일스톤은 현재 상태의 dates 사용
                              const isResizing = resizingMilestone?.id === milestone.id;
                              const startDate = isResizing
                                ? resizingMilestone.startDate
                                : new Date(milestone.startDate);
                              const endDate = isResizing
                                ? resizingMilestone.endDate
                                : new Date(milestone.endDate);

                              const { position, width } = calculateMilestonePosition(
                                startDate,
                                endDate,
                                timelineStart,
                                timelineEnd
                              );

                              return (
                                <MilestoneBar
                                  key={milestone.id}
                                  id={milestone.id}
                                  name={milestone.name}
                                  description={milestone.description ?? undefined}
                                  startDate={milestone.startDate}
                                  endDate={milestone.endDate}
                                  status={milestone.status}
                                  color={milestone.color}
                                  position={position}
                                  width={width}
                                  onClick={() => handleMilestoneClick(milestone)}
                                  isDragging={activeMilestone?.id === milestone.id}
                                  isResizing={isResizing}
                                  onResizeStart={(direction, event) =>
                                    handleResizeStart(milestone.id, direction, event)
                                  }
                                />
                              );
                            })}

                            {/* 핀포인트 마커들 */}
                            {pinpoints
                              .filter((p) => p.rowId === currentRow.id)
                              .map((pinpoint) => {
                                const pinpointDate = new Date(pinpoint.date);
                                const position = getDatePosition(
                                  pinpointDate,
                                  timelineStart,
                                  timelineEnd
                                );
                                return (
                                  <PinpointMarker
                                    key={pinpoint.id}
                                    id={pinpoint.id}
                                    name={pinpoint.name}
                                    date={pinpoint.date}
                                    color={pinpoint.color}
                                    position={position}
                                    description={pinpoint.description}
                                    rowId={currentRow.id}
                                    isSelected={selectedPinpointId === pinpoint.id}
                                    isDragging={activePinpoint?.id === pinpoint.id}
                                    onSelect={() => setSelectedPinpointId(pinpoint.id)}
                                    onDeselect={() => setSelectedPinpointId(null)}
                                    onEdit={() => handleEditPinpoint(pinpoint.id)}
                                    onDelete={() =>
                                      handleDeletePinpoint(pinpoint.id, currentRow.id)
                                    }
                                  />
                                );
                              })}
                          </DroppableRowArea>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* 미배정 마일스톤 행 */}
              <UnassignedRowItem
                milestones={milestonesByRow.unassigned}
                timelineStart={timelineStart}
                timelineEnd={timelineEnd}
                labelWidth={LABEL_WIDTH}
                onMilestoneClick={handleMilestoneClick}
                draggingMilestoneId={activeMilestone?.id}
                onResizeStart={handleResizeStart}
                resizingMilestoneId={resizingMilestone?.id}
                resizingMilestone={resizingMilestone}
              />

            </div>

            {/* 행이 없고 마일스톤도 없을 때 안내 */}
            {rows.length === 0 && milestones.length === 0 && (
              <div className="py-8 text-center text-slate-400 dark:text-slate-500">
                <p className="mb-2">아직 행이나 마일스톤이 없습니다.</p>
                <p className="text-sm">상단의 [그룹행 추가] 또는 [마일스톤 추가] 버튼을 클릭하여 추가해 주세요.</p>
              </div>
            )}
          </div>

          {/* 드래그 오버레이 */}
          <DragOverlay>
            {activeMilestone && (
              <MilestoneBarOverlay
                name={activeMilestone.name}
                color={activeMilestone.color}
                status={activeMilestone.status}
              />
            )}
            {activePinpoint && (
              <PinpointMarkerOverlay
                name={activePinpoint.name}
                color={activePinpoint.color}
              />
            )}
          </DragOverlay>
        </DndContext>
      )}

      {/* 마일스톤 모달 */}
      <MilestoneModal
        isOpen={isMilestoneModalOpen}
        onClose={handleCloseMilestoneModal}
        milestone={selectedMilestone}
        projectId={projectId}
        rows={rows}
      />

      {/* 행 모달 */}
      <RowModal
        isOpen={isRowModalOpen}
        onClose={handleCloseRowModal}
        row={selectedRow}
        onSave={handleSaveRow}
        isLoading={createRow.isPending || updateRow.isPending}
        availableRows={rows}
      />

      {/* 핀포인트 모달 */}
      <PinpointModal
        isOpen={isPinpointModalOpen}
        onClose={() => {
          setIsPinpointModalOpen(false);
          setSelectedPinpointRowId(null);
          setSelectedPinpointForEdit(null);
          setPinpointDate("");
        }}
        onSave={handleSavePinpoint}
        pinpoint={selectedPinpointForEdit}
        defaultDate={pinpointDate}
        isLoading={createPinpoint.isPending || updatePinpoint.isPending}
      />

      {/* 삭제 확인 모달 */}
      {deleteConfirmOpen && deleteTarget && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-lg max-w-sm p-6">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-2">
              삭제 확인
            </h3>
            <p className="text-slate-700 dark:text-slate-300 mb-6">
              {deleteTarget.type === "row"
                ? `"${deleteTarget.name}" 행을 삭제하시겠습니까? 행에 속한 마일스톤은 미배정 상태가 됩니다.`
                : `핀포인트 "${deleteTarget.name}"을 삭제하시겠습니까?`}
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => {
                  setDeleteConfirmOpen(false);
                  setDeleteTarget(null);
                }}
                className="px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 rounded-md transition-colors"
              >
                취소
              </button>
              <button
                onClick={handleConfirmDelete}
                className="px-4 py-2 text-sm font-medium text-white bg-red-500 hover:bg-red-600 rounded-md transition-colors"
              >
                삭제
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 알림 모달 */}
      {alertMessage && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-lg max-w-sm p-6">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-2">
              알림
            </h3>
            <p className="text-slate-700 dark:text-slate-300 mb-6">
              {alertMessage}
            </p>
            <div className="flex justify-end">
              <button
                onClick={() => setAlertMessage(null)}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-500 hover:bg-blue-600 rounded-md transition-colors"
              >
                확인
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
