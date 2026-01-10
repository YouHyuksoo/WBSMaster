/**
 * @file src/components/dashboard/MilestoneBar.tsx
 * @description
 * 마일스톤 기간 막대 컴포넌트입니다.
 * 타임라인에서 마일스톤을 기간 막대로 표시하며, 드래그 이동과 리사이즈가 가능합니다.
 *
 * 초보자 가이드:
 * 1. **position, width**: 타임라인 내 위치와 너비 (퍼센트)
 * 2. **onDrag**: 드래그 시 호출되는 콜백
 * 3. **onResize**: 양쪽 끝 리사이즈 시 호출되는 콜백
 *
 * 수정 방법:
 * - 막대 높이 변경: h- 클래스 수정
 * - 색상 변경: backgroundColor 스타일 수정
 * - 리사이즈 핸들 스타일: resize-handle 클래스 수정
 */

"use client";

import { useMemo, useCallback, useState, useRef } from "react";
import { useDraggable } from "@dnd-kit/core";
import type { MilestoneStatus } from "@/lib/api";

interface MilestoneBarProps {
  /** 마일스톤 ID */
  id: string;
  /** 마일스톤 이름 */
  name: string;
  /** 시작일 */
  startDate: string;
  /** 종료일 */
  endDate: string;
  /** 상태 */
  status: MilestoneStatus;
  /** 색상 */
  color: string;
  /** 타임라인 내 시작 위치 (퍼센트) */
  position: number;
  /** 타임라인 내 너비 (퍼센트) */
  width: number;
  /** 클릭 핸들러 */
  onClick?: () => void;
  /** 드래그 중 여부 (외부에서 제어) */
  isDragging?: boolean;
  /** 리사이즈 중 여부 (외부에서 제어) */
  isResizing?: boolean;
  /** 리사이즈 시작 핸들러 (좌측/우측) */
  onResizeStart?: (direction: "left" | "right", event: React.MouseEvent) => void;
}

/** 상태별 스타일 */
const STATUS_STYLES: Record<MilestoneStatus, string> = {
  PENDING: "opacity-60",
  IN_PROGRESS: "opacity-100",
  COMPLETED: "opacity-80",
  DELAYED: "opacity-90 border-2 border-red-500 border-dashed",
};

/**
 * 마일스톤 기간 막대 컴포넌트
 */
export function MilestoneBar({
  id,
  name,
  startDate,
  endDate,
  status,
  color,
  position,
  width,
  onClick,
  isDragging = false,
  isResizing = false,
  onResizeStart,
}: MilestoneBarProps) {
  // 리사이즈 호버 상태
  const [hoverSide, setHoverSide] = useState<"left" | "right" | null>(null);

  // @dnd-kit 드래그 훅
  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id: `milestone-${id}`,
    disabled: isResizing, // 리사이즈 중이면 드래그 비활성화
    data: {
      type: "milestone",
      id,
      startDate,
      endDate,
    },
  });

  // 드래그 스타일
  const dragStyle = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
      }
    : undefined;

  // 날짜 포맷팅
  const formattedDates = useMemo(() => {
    const start = new Date(startDate).toLocaleDateString("ko-KR", {
      month: "short",
      day: "numeric",
    });
    const end = new Date(endDate).toLocaleDateString("ko-KR", {
      month: "short",
      day: "numeric",
    });
    return `${start} ~ ${end}`;
  }, [startDate, endDate]);

  /**
   * 리사이즈 핸들 마우스 다운
   * 이벤트 전파를 차단하고 리사이즈 시작 콜백을 호출합니다.
   */
  const handleResizeMouseDown = useCallback(
    (e: React.MouseEvent, direction: "left" | "right") => {
      e.stopPropagation(); // 드래그 이벤트 방지
      e.preventDefault(); // 기본 동작 방지
      onResizeStart?.(direction, e);
    },
    [onResizeStart]
  );

  return (
    <div
      ref={setNodeRef}
      className={`
        absolute top-1 h-10 rounded-md cursor-pointer
        flex items-center px-2 gap-1 overflow-hidden
        transition-shadow duration-150
        hover:shadow-lg hover:z-20
        ${STATUS_STYLES[status]}
        ${isDragging ? "shadow-xl z-50 opacity-90" : ""}
        ${isResizing ? "shadow-xl z-40 opacity-95" : ""}
      `}
      style={{
        left: `${position}%`,
        width: `${Math.max(width, 2)}%`, // 최소 너비 2%
        backgroundColor: color,
        ...dragStyle,
      }}
      onClick={onClick}
      {...attributes}
    >
      {/* 좌측 리사이즈 핸들 */}
      <div
        className={`
          absolute left-0 top-0 bottom-0 w-2 cursor-ew-resize
          flex items-center justify-center
          opacity-0 hover:opacity-100 transition-opacity
          bg-black/20 rounded-l-md
        `}
        onMouseDown={(e) => handleResizeMouseDown(e, "left")}
        onMouseEnter={() => setHoverSide("left")}
        onMouseLeave={() => setHoverSide(null)}
      >
        <div className="w-0.5 h-4 bg-white/70 rounded" />
      </div>

      {/* 막대 내용 - 드래그 리스너는 중앙 콘텐츠에만 적용 */}
      <div className="flex-1 min-w-0 flex items-center gap-1 px-1" {...listeners}>
        {/* 상태 아이콘 */}
        <span className="flex-shrink-0 text-white/90 text-xs">
          {status === "COMPLETED" && "✓"}
          {status === "IN_PROGRESS" && "▶"}
          {status === "PENDING" && "○"}
          {status === "DELAYED" && "⚠"}
        </span>

        {/* 마일스톤 이름 */}
        <span className="text-white font-medium text-xs truncate">
          {name}
        </span>
      </div>

      {/* 우측 리사이즈 핸들 */}
      <div
        className={`
          absolute right-0 top-0 bottom-0 w-2 cursor-ew-resize
          flex items-center justify-center
          opacity-0 hover:opacity-100 transition-opacity
          bg-black/20 rounded-r-md
        `}
        onMouseDown={(e) => handleResizeMouseDown(e, "right")}
        onMouseEnter={() => setHoverSide("right")}
        onMouseLeave={() => setHoverSide(null)}
      >
        <div className="w-0.5 h-4 bg-white/70 rounded" />
      </div>

      {/* 툴팁 (호버 시 표시) */}
      <div
        className={`
          absolute bottom-full left-1/2 -translate-x-1/2 mb-1
          px-2 py-1 bg-slate-900 text-white text-xs rounded
          whitespace-nowrap pointer-events-none
          opacity-0 group-hover:opacity-100 transition-opacity
          z-30
        `}
      >
        {name}
        <br />
        {formattedDates}
      </div>
    </div>
  );
}

/**
 * 드래그 오버레이용 마일스톤 막대
 * DragOverlay 내에서 사용되어 드래그 중 미리보기를 표시
 */
export function MilestoneBarOverlay({
  name,
  color,
  status,
}: {
  name: string;
  color: string;
  status: MilestoneStatus;
}) {
  return (
    <div
      className={`
        h-10 rounded-md cursor-grabbing
        flex items-center px-3 gap-2 overflow-hidden
        shadow-xl opacity-95
        ${STATUS_STYLES[status]}
      `}
      style={{
        backgroundColor: color,
        minWidth: "120px",
      }}
    >
      <span className="flex-shrink-0 text-white/90 text-xs">
        {status === "COMPLETED" && "✓"}
        {status === "IN_PROGRESS" && "▶"}
        {status === "PENDING" && "○"}
        {status === "DELAYED" && "⚠"}
      </span>
      <span className="text-white font-medium text-sm truncate">{name}</span>
    </div>
  );
}

/**
 * 마일스톤 위치 및 너비 계산 유틸
 * @param startDate - 마일스톤 시작일
 * @param endDate - 마일스톤 종료일
 * @param timelineStart - 타임라인 시작일
 * @param timelineEnd - 타임라인 종료일
 * @returns { position: number, width: number } 퍼센트 값
 */
export function calculateMilestonePosition(
  startDate: Date,
  endDate: Date,
  timelineStart: Date,
  timelineEnd: Date
): { position: number; width: number } {
  const totalDays =
    Math.ceil(
      (timelineEnd.getTime() - timelineStart.getTime()) / (1000 * 60 * 60 * 24)
    ) + 1;

  const startDays = Math.ceil(
    (startDate.getTime() - timelineStart.getTime()) / (1000 * 60 * 60 * 24)
  );
  const endDays = Math.ceil(
    (endDate.getTime() - timelineStart.getTime()) / (1000 * 60 * 60 * 24)
  );

  const position = Math.max(0, (startDays / totalDays) * 100);
  const width = Math.max(1, ((endDays - startDays + 1) / totalDays) * 100);

  return {
    position: Math.min(position, 100),
    width: Math.min(width, 100 - position),
  };
}
