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
 * │ 헤더: 📍 마일스톤 타임라인  [+ 행 추가] [+ 추가]  │
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
  closestCenter,
} from "@dnd-kit/core";
import { Icon } from "@/components/ui";
import {
  TimelineHeader,
  getTodayPosition,
  getDateFromPosition,
  getPercentFromMouseX,
  getTotalDays,
} from "./TimelineHeader";
import {
  TimelineRowItem,
  AddRowButton,
  UnassignedRowItem,
  ROW_HEIGHT,
} from "./TimelineRowItem";
import { MilestoneBarOverlay, calculateMilestonePosition } from "./MilestoneBar";
import { MilestoneModal } from "./MilestoneModal";
import { RowModal } from "./RowModal";
import { useMilestones, useUpdateMilestone } from "@/hooks/useMilestones";
import {
  useTimelineRows,
  useCreateTimelineRow,
  useUpdateTimelineRow,
  useDeleteTimelineRow,
} from "@/hooks/useTimelineRows";
import type { Milestone, TimelineRow } from "@/lib/api";

/** 라벨 영역 너비 */
const LABEL_WIDTH = 120;

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

  // 뮤테이션 훅
  const updateMilestone = useUpdateMilestone();
  const createRow = useCreateTimelineRow();
  const updateRow = useUpdateTimelineRow();
  const deleteRow = useDeleteTimelineRow();

  // 모달 상태
  const [isMilestoneModalOpen, setIsMilestoneModalOpen] = useState(false);
  const [selectedMilestone, setSelectedMilestone] = useState<Milestone | null>(
    null
  );
  const [isRowModalOpen, setIsRowModalOpen] = useState(false);
  const [selectedRow, setSelectedRow] = useState<TimelineRow | null>(null);

  // 드래그 상태
  const [activeMilestone, setActiveMilestone] = useState<Milestone | null>(null);

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

  // 드래그 시작 핸들러
  const handleDragStart = useCallback(
    (event: DragStartEvent) => {
      const { active } = event;
      const milestoneId = String(active.id).replace("milestone-", "");
      const milestone = milestones.find((m) => m.id === milestoneId);
      if (milestone) {
        setActiveMilestone(milestone);
      }
    },
    [milestones]
  );

  /**
   * 드래그 종료 핸들러
   * 1. 행 간 드래그: rowId 변경
   * 2. 같은 행 내 좌우 드래그: startDate/endDate 변경 (기간 유지)
   */
  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, delta } = event;
      setActiveMilestone(null);

      const milestoneId = String(active.id).replace("milestone-", "");
      const milestone = milestones.find((m) => m.id === milestoneId);

      if (!milestone) return;

      // 드롭 대상이 행인 경우 (행 간 드래그)
      if (event.over && String(event.over.id).startsWith("row-")) {
        const newRowId = String(event.over.id).replace("row-", "");

        // 같은 행이면 무시
        if (milestone.rowId === newRowId) return;

        // 행 변경
        updateMilestone.mutate({
          id: milestone.id,
          data: { rowId: newRowId },
        });
        return;
      }

      // 같은 행 내 수평 드래그 (X축 이동이 일정 이상)
      if (Math.abs(delta.x) > 5 && Math.abs(delta.y) < 50) {
        // 타임라인 컨테이너 너비 가져오기
        const container = document.querySelector(".timeline-container");
        if (!container) return;

        const containerWidth = container.getBoundingClientRect().width;

        // 컨테이너가 너무 작으면 무시
        if (containerWidth === 0) return;

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

        // 타임라인 범위 검증
        if (newStart < timelineStart || newEnd > timelineEnd) return;

        // 날짜가 변경되었을 때만 업데이트
        if (
          newStart.toISOString().split("T")[0] !==
            currentStart.toISOString().split("T")[0] ||
          newEnd.toISOString().split("T")[0] !==
            currentEnd.toISOString().split("T")[0]
        ) {
          updateMilestone.mutate({
            id: milestone.id,
            data: {
              startDate: newStart.toISOString().split("T")[0],
              endDate: newEnd.toISOString().split("T")[0],
            },
          });
        }
      }
    },
    [milestones, updateMilestone, timelineStart, timelineEnd]
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

  // 행 삭제 클릭
  const handleDeleteRow = useCallback(
    (row: TimelineRow) => {
      if (!confirm(`"${row.name}" 행을 삭제하시겠습니까?\n행에 속한 마일스톤은 미배정 상태가 됩니다.`)) {
        return;
      }
      deleteRow.mutate({ id: row.id, projectId });
    },
    [deleteRow, projectId]
  );

  // 행 모달 닫기
  const handleCloseRowModal = useCallback(() => {
    setIsRowModalOpen(false);
    setSelectedRow(null);
  }, []);

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
    async (data: { name: string; color: string }) => {
      if (selectedRow) {
        // 수정
        await updateRow.mutateAsync({
          id: selectedRow.id,
          data: { name: data.name, color: data.color },
        });
      } else {
        // 생성
        await createRow.mutateAsync({
          name: data.name,
          color: data.color,
          projectId,
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
            행 추가
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

      {/* 타임라인 영역 */}
      {isLoading ? (
        <div className="h-40 flex items-center justify-center text-slate-500">
          로딩 중...
        </div>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
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

            {/* 행들 */}
            <div>
              {rows
                .sort((a, b) => a.order - b.order)
                .map((row) => (
                  <TimelineRowItem
                    key={row.id}
                    row={row}
                    milestones={milestonesByRow.grouped[row.id] || []}
                    timelineStart={timelineStart}
                    timelineEnd={timelineEnd}
                    labelWidth={LABEL_WIDTH}
                    onMilestoneClick={handleMilestoneClick}
                    onRowEdit={handleEditRow}
                    onRowDelete={handleDeleteRow}
                    draggingMilestoneId={activeMilestone?.id}
                    onResizeStart={handleResizeStart}
                    resizingMilestoneId={resizingMilestone?.id}
                    resizingMilestone={resizingMilestone}
                  />
                ))}

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

              {/* 행 추가 버튼 */}
              <AddRowButton onClick={handleAddRow} labelWidth={LABEL_WIDTH} />
            </div>

            {/* 행이 없고 마일스톤도 없을 때 안내 */}
            {rows.length === 0 && milestones.length === 0 && (
              <div className="py-8 text-center text-slate-400 dark:text-slate-500">
                <p className="mb-2">아직 행이나 마일스톤이 없습니다.</p>
                <p className="text-sm">위의 버튼을 클릭하여 추가해 주세요.</p>
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
      />
    </div>
  );
}
