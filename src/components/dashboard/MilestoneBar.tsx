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
  /** 설명 */
  description?: string;
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
 * 배경색의 밝기를 계산하여 텍스트 색상 결정
 * @param hexColor - HEX 색상 코드 (#RRGGBB)
 * @returns 밝은 배경이면 true, 어두운 배경이면 false
 */
function isLightBackground(hexColor: string): boolean {
  // HEX 색상에서 RGB 추출
  const hex = hexColor.replace("#", "");
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);

  // 상대적 휘도 계산 (YIQ 공식)
  const brightness = (r * 299 + g * 587 + b * 114) / 1000;

  // 밝기가 150 이상이면 밝은 배경
  return brightness > 150;
}

/**
 * 마일스톤 기간 막대 컴포넌트
 */
export function MilestoneBar({
  id,
  name,
  description,
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
  // 툴팁 호버 상태
  const [isHovered, setIsHovered] = useState(false);

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
      year: "numeric",
      month: "short",
      day: "numeric",
    });
    const end = new Date(endDate).toLocaleDateString("ko-KR", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
    return `${start} ~ ${end}`;
  }, [startDate, endDate]);

  // 기간 일수 계산
  const durationDays = useMemo(() => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diff = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    return diff;
  }, [startDate, endDate]);

  // 상태 한글명
  const statusLabel = useMemo(() => {
    const labels: Record<MilestoneStatus, string> = {
      PENDING: "대기",
      IN_PROGRESS: "진행중",
      COMPLETED: "완료",
      DELAYED: "지연",
    };
    return labels[status];
  }, [status]);

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

  /**
   * 클릭 핸들러 - 리사이징 중이면 모달 열기 방지
   */
  const handleClick = useCallback(() => {
    // 리사이징 중이면 onClick 무시 (모달 열기 방지)
    if (isResizing) return;
    onClick?.();
  }, [onClick, isResizing]);

  return (
    <div
      ref={setNodeRef}
      className={`
        absolute top-1 h-10 rounded-md cursor-pointer
        flex items-center px-2 gap-1
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
      onClick={handleClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
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
        onClick={(e) => e.stopPropagation()}
        onMouseEnter={() => setHoverSide("left")}
        onMouseLeave={() => setHoverSide(null)}
      >
        <div className="w-0.5 h-4 bg-white/70 rounded" />
      </div>

      {/* 막대 내용 - 드래그 리스너는 중앙 콘텐츠에만 적용 */}
      <div className="flex-1 min-w-0 flex items-center gap-1 px-1" {...listeners}>
        {/* 상태 아이콘 - 배경색에 따라 텍스트 색상 자동 조절 */}
        <span className={`flex-shrink-0 text-sm ${isLightBackground(color) ? "text-slate-700/90" : "text-white/90"}`}>
          {status === "COMPLETED" && "🟢"}
          {status === "IN_PROGRESS" && (
            <span className="inline-block animate-spin">🌀</span>
          )}
          {status === "PENDING" && "⚪"}
          {status === "DELAYED" && "🔴"}
        </span>

        {/* 마일스톤 이름 - 배경색에 따라 텍스트 색상 자동 조절 */}
        <span className={`font-medium text-xs truncate ${isLightBackground(color) ? "text-slate-800" : "text-white"}`}>
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
        onClick={(e) => e.stopPropagation()}
        onMouseEnter={() => setHoverSide("right")}
        onMouseLeave={() => setHoverSide(null)}
      >
        <div className="w-0.5 h-4 bg-white/70 rounded" />
      </div>

      {/* 툴팁 (호버 시 표시) - 차트 스타일 */}
      {isHovered && !isDragging && !isResizing && (
        <div
          className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50 pointer-events-none"
        >
          <div className="bg-slate-900 dark:bg-slate-800 text-white rounded-lg shadow-xl border border-slate-700 p-3 min-w-[200px] max-w-[280px]">
            {/* 헤더: 이름 + 상태 */}
            <div className="flex items-center justify-between gap-2 mb-2">
              <span className="font-semibold text-sm truncate">{name}</span>
              <span className={`text-xs px-2 py-0.5 rounded-full ${
                status === "COMPLETED" ? "bg-green-500/20 text-green-400" :
                status === "IN_PROGRESS" ? "bg-blue-500/20 text-blue-400" :
                status === "DELAYED" ? "bg-red-500/20 text-red-400" :
                "bg-slate-500/20 text-slate-400"
              }`}>
                {statusLabel}
              </span>
            </div>

            {/* 설명 */}
            {description && (
              <p className="text-xs text-slate-300 mb-2 line-clamp-2">{description}</p>
            )}

            {/* 기간 정보 */}
            <div className="flex items-center gap-2 text-xs text-slate-400 border-t border-slate-700 pt-2">
              <span>📅</span>
              <span>{formattedDates}</span>
              <span className="text-slate-500">|</span>
              <span className="text-blue-400 font-medium">{durationDays}일</span>
            </div>
          </div>
          {/* 화살표 */}
          <div className="absolute left-1/2 -translate-x-1/2 -bottom-1 w-2 h-2 bg-slate-900 dark:bg-slate-800 rotate-45 border-r border-b border-slate-700" />
        </div>
      )}
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
  // 배경색에 따라 텍스트 색상 결정
  const isLight = isLightBackground(color);
  const textColorClass = isLight ? "text-slate-800" : "text-white";
  const iconColorClass = isLight ? "text-slate-700/90" : "text-white/90";

  // 오버레이용 스타일
  const overlayStatusStyle = STATUS_STYLES[status];

  return (
    <div
      className={`
        h-10 rounded-md cursor-grabbing
        flex items-center px-3 gap-2 overflow-hidden
        shadow-xl opacity-95
        ${overlayStatusStyle}
      `}
      style={{
        backgroundColor: color,
        minWidth: "120px",
      }}
    >
      <span className={`flex-shrink-0 text-sm ${iconColorClass}`}>
        {status === "COMPLETED" && "🟢"}
        {status === "IN_PROGRESS" && (
          <span className="inline-block animate-spin">🌀</span>
        )}
        {status === "PENDING" && "⚪"}
        {status === "DELAYED" && "🔴"}
      </span>
      <span className={`font-medium text-sm truncate ${textColorClass}`}>{name}</span>
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
