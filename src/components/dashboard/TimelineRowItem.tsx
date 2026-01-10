/**
 * @file src/components/dashboard/TimelineRowItem.tsx
 * @description
 * 타임라인 행 컴포넌트입니다.
 * 왼쪽에 행 라벨, 오른쪽에 마일스톤 막대들이 배치됩니다.
 * 마일스톤을 드롭할 수 있는 영역으로 작동합니다.
 *
 * 초보자 가이드:
 * 1. **row**: 타임라인 행 데이터 (이름, 색상 등)
 * 2. **milestones**: 이 행에 속한 마일스톤 목록
 * 3. **labelWidth**: 왼쪽 라벨 영역 너비
 * 4. **onMilestoneClick**: 마일스톤 클릭 시 콜백
 *
 * 수정 방법:
 * - 행 높이 변경: ROW_HEIGHT 상수 수정
 * - 라벨 스타일 변경: 라벨 div 클래스 수정
 */

"use client";

import { useMemo, useState } from "react";
import { useDroppable } from "@dnd-kit/core";
import { Icon } from "@/components/ui";
import { MilestoneBar, calculateMilestonePosition } from "./MilestoneBar";
import { TimelineGridBackground } from "./TimelineHeader";
import type { Milestone, TimelineRow } from "@/lib/api";

/** 행 높이 상수 */
export const ROW_HEIGHT = 48; // px

interface TimelineRowItemProps {
  /** 타임라인 행 데이터 */
  row: TimelineRow;
  /** 이 행에 속한 마일스톤 목록 */
  milestones: Milestone[];
  /** 타임라인 시작일 */
  timelineStart: Date;
  /** 타임라인 종료일 */
  timelineEnd: Date;
  /** 왼쪽 라벨 영역 너비 (px) */
  labelWidth?: number;
  /** 마일스톤 클릭 핸들러 */
  onMilestoneClick?: (milestone: Milestone) => void;
  /** 행 수정 핸들러 */
  onRowEdit?: (row: TimelineRow) => void;
  /** 행 삭제 핸들러 */
  onRowDelete?: (row: TimelineRow) => void;
  /** 드래그 중인 마일스톤 ID */
  draggingMilestoneId?: string | null;
  /** 리사이즈 시작 핸들러 */
  onResizeStart?: (milestoneId: string, direction: "left" | "right", event: React.MouseEvent) => void;
  /** 리사이즈 중인 마일스톤 ID */
  resizingMilestoneId?: string | null;
  /** 리사이즈 중인 마일스톤 (현재 dates 포함) */
  resizingMilestone?: {
    id: string;
    direction: "left" | "right";
    startDate: Date;
    endDate: Date;
    containerRect: DOMRect;
  } | null;
  /** 자식 행 추가 핸들러 */
  onAddChildRow?: (parentRowId: string) => void;
  /** 자식 행 여부 (같은 그룹에 속함) */
  isChild?: boolean;
}

/**
 * 타임라인 행 컴포넌트
 */
export function TimelineRowItem({
  row,
  milestones,
  timelineStart,
  timelineEnd,
  labelWidth = 100,
  onMilestoneClick,
  onRowEdit,
  onRowDelete,
  draggingMilestoneId,
  onResizeStart,
  resizingMilestoneId,
  resizingMilestone,
  onAddChildRow,
  isChild = false,
}: TimelineRowItemProps) {
  // 호버 상태
  const [isHovered, setIsHovered] = useState(false);

  // @dnd-kit 드롭 영역
  const { isOver, setNodeRef } = useDroppable({
    id: `row-${row.id}`,
    data: {
      type: "row",
      rowId: row.id,
    },
  });

  /**
   * 마일스톤 위치 계산
   * 리사이징 중인 마일스톤은 현재 resizingMilestone의 dates를 사용해서 실시간 반영
   */
  const milestonesWithPosition = useMemo(() => {
    return milestones.map((milestone) => {
      // 리사이징 중인 마일스톤은 현재 리사이즈된 dates 사용
      const startDate =
        resizingMilestoneId === milestone.id && resizingMilestone
          ? resizingMilestone.startDate
          : new Date(milestone.startDate);

      const endDate =
        resizingMilestoneId === milestone.id && resizingMilestone
          ? resizingMilestone.endDate
          : new Date(milestone.endDate);

      const { position, width } = calculateMilestonePosition(
        startDate,
        endDate,
        timelineStart,
        timelineEnd
      );
      return { ...milestone, position, width };
    });
  }, [milestones, timelineStart, timelineEnd, resizingMilestoneId, resizingMilestone]);

  return (
    <div
      ref={setNodeRef}
      className={`
        flex border-b border-slate-200 dark:border-slate-700
        transition-colors duration-150
        ${isOver ? "bg-blue-50 dark:bg-blue-900/20" : ""}
      `}
      style={{ height: ROW_HEIGHT }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* 왼쪽 라벨 영역 (자식 행일 때는 숨김 - 부모가 병합) */}
      {!isChild && (
      <div
        className={`flex-shrink-0 flex items-center justify-between px-3 border-r border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900`}
        style={{ width: labelWidth }}
      >
        {/* 행 이름 + 색상 인디케이터 */}
        <div className="flex items-center gap-2 min-w-0">
          {!isChild && (
            <div
              className="w-2 h-2 rounded-full flex-shrink-0"
              style={{ backgroundColor: row.color }}
            />
          )}
          <span
            className={`truncate ${
              isChild
                ? "text-xs font-normal text-slate-600 dark:text-slate-400"
                : "text-sm font-medium text-slate-700 dark:text-slate-300"
            }`}
          >
            {isChild ? "→ " : ""}{row.name}
          </span>
          {row.isDefault && (
            <span className="text-[10px] text-slate-400 dark:text-slate-500">
              (기본)
            </span>
          )}
        </div>

        {/* 행 액션 버튼들 (호버 시 표시) */}
        {isHovered && !row.isDefault && (
          <div className="flex items-center gap-1 ml-1">
            {!isChild && (
              <button
                onClick={() => onAddChildRow?.(row.id)}
                className="p-1 text-slate-400 hover:text-blue-500 dark:hover:text-blue-400"
                title="같은 그룹 행 추가"
              >
                <Icon name="add" size="sm" />
              </button>
            )}
            <button
              onClick={() => onRowEdit?.(row)}
              className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
              title="행 수정"
            >
              <Icon name="edit" size="sm" />
            </button>
            <button
              onClick={() => onRowDelete?.(row)}
              className="p-1 text-slate-400 hover:text-red-500"
              title="행 삭제"
            >
              <Icon name="delete" size="sm" />
            </button>
          </div>
        )}
      </div>
      )}

      {/* 오른쪽 타임라인 영역 */}
      <div className="flex-1 relative overflow-hidden timeline-container">
        {/* 월별 그리드 배경 */}
        <TimelineGridBackground
          startDate={timelineStart}
          endDate={timelineEnd}
        />

        {/* 마일스톤 막대들 */}
        {milestonesWithPosition.map((milestone) => (
          <MilestoneBar
            key={milestone.id}
            id={milestone.id}
            name={milestone.name}
            startDate={milestone.startDate}
            endDate={milestone.endDate}
            status={milestone.status}
            color={milestone.color}
            position={milestone.position}
            width={milestone.width}
            onClick={() => onMilestoneClick?.(milestone)}
            isDragging={draggingMilestoneId === milestone.id}
            isResizing={resizingMilestoneId === milestone.id}
            onResizeStart={(direction, event) => onResizeStart?.(milestone.id, direction, event)}
          />
        ))}

        {/* 드롭 가능 영역 표시 */}
        {isOver && (
          <div className="absolute inset-0 border-2 border-dashed border-blue-400 bg-blue-50/30 dark:bg-blue-900/20 rounded pointer-events-none z-10" />
        )}

        {/* 빈 행 안내 */}
        {milestones.length === 0 && !isOver && (
          <div className="absolute inset-0 flex items-center justify-center text-xs text-slate-400 dark:text-slate-500 pointer-events-none">
            마일스톤을 드래그하여 추가하세요
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * 행 추가 버튼 컴포넌트
 */
export function AddRowButton({
  onClick,
  labelWidth = 100,
}: {
  onClick: () => void;
  labelWidth?: number;
}) {
  return (
    <div
      className="flex border-b border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer transition-colors"
      style={{ height: ROW_HEIGHT }}
      onClick={onClick}
    >
      {/* 왼쪽 라벨 영역 */}
      <div
        className="flex-shrink-0 flex items-center gap-2 px-3 border-r border-slate-200 dark:border-slate-700"
        style={{ width: labelWidth }}
      >
        <Icon name="add" size="sm" className="text-slate-400" />
        <span className="text-sm text-slate-400 dark:text-slate-500">
          행 추가
        </span>
      </div>

      {/* 오른쪽 빈 영역 */}
      <div className="flex-1 bg-slate-50/50 dark:bg-slate-800/20" />
    </div>
  );
}

/**
 * 할당되지 않은 마일스톤 행
 * rowId가 null인 마일스톤들을 표시
 */
export function UnassignedRowItem({
  milestones,
  timelineStart,
  timelineEnd,
  labelWidth = 100,
  onMilestoneClick,
  draggingMilestoneId,
  onResizeStart,
  resizingMilestoneId,
  resizingMilestone,
}: {
  milestones: Milestone[];
  timelineStart: Date;
  timelineEnd: Date;
  labelWidth?: number;
  onMilestoneClick?: (milestone: Milestone) => void;
  draggingMilestoneId?: string | null;
  onResizeStart?: (milestoneId: string, direction: "left" | "right", event: React.MouseEvent) => void;
  resizingMilestoneId?: string | null;
  resizingMilestone?: {
    id: string;
    direction: "left" | "right";
    startDate: Date;
    endDate: Date;
    containerRect: DOMRect;
  } | null;
}) {
  /**
   * 마일스톤 위치 계산
   * 리사이징 중인 마일스톤은 현재 resizingMilestone의 dates를 사용해서 실시간 반영
   */
  const milestonesWithPosition = useMemo(() => {
    return milestones.map((milestone) => {
      // 리사이징 중인 마일스톤은 현재 리사이즈된 dates 사용
      const startDate =
        resizingMilestoneId === milestone.id && resizingMilestone
          ? resizingMilestone.startDate
          : new Date(milestone.startDate);

      const endDate =
        resizingMilestoneId === milestone.id && resizingMilestone
          ? resizingMilestone.endDate
          : new Date(milestone.endDate);

      const { position, width } = calculateMilestonePosition(
        startDate,
        endDate,
        timelineStart,
        timelineEnd
      );
      return { ...milestone, position, width };
    });
  }, [milestones, timelineStart, timelineEnd, resizingMilestoneId, resizingMilestone]);

  if (milestones.length === 0) return null;

  return (
    <div
      className="flex border-b border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/30"
      style={{ height: ROW_HEIGHT }}
    >
      {/* 왼쪽 라벨 영역 */}
      <div
        className="flex-shrink-0 flex items-center gap-2 px-3 border-r border-slate-200 dark:border-slate-700"
        style={{ width: labelWidth }}
      >
        <div className="w-2 h-2 rounded-full flex-shrink-0 bg-slate-400" />
        <span className="text-sm font-medium text-slate-500 dark:text-slate-400 truncate">
          미배정
        </span>
      </div>

      {/* 오른쪽 타임라인 영역 */}
      <div className="flex-1 relative overflow-hidden timeline-container">
        {/* 월별 그리드 배경 */}
        <TimelineGridBackground
          startDate={timelineStart}
          endDate={timelineEnd}
        />

        {/* 마일스톤 막대들 */}
        {milestonesWithPosition.map((milestone) => (
          <MilestoneBar
            key={milestone.id}
            id={milestone.id}
            name={milestone.name}
            startDate={milestone.startDate}
            endDate={milestone.endDate}
            status={milestone.status}
            color={milestone.color}
            position={milestone.position}
            width={milestone.width}
            onClick={() => onMilestoneClick?.(milestone)}
            isDragging={draggingMilestoneId === milestone.id}
            isResizing={onResizeStart ? false : undefined}
            onResizeStart={(direction, event) => onResizeStart?.(milestone.id, direction, event)}
          />
        ))}
      </div>
    </div>
  );
}
