/**
 * @file src/components/dashboard/PinpointMarker.tsx
 * @description
 * 타임라인 상의 핀포인트를 표시하는 삼각형 마커 컴포넌트입니다.
 * 클릭하면 정보가 고정으로 표시되며, @dnd-kit 기반 드래그로 위치 이동이 가능합니다.
 *
 * 초보자 가이드:
 * 1. **마커 클릭**: 정보박스 고정 표시
 * 2. **마커 드래그**: @dnd-kit 기반으로 행 간 이동 + 날짜 변경 동시 지원
 * 3. **삭제 버튼**: 정보박스의 휴지통 아이콘 클릭
 *
 * 수정 방법:
 * - 마커 크기 변경: borderLeft/borderRight/borderTop 값 수정
 * - 색상 변경: color props로 처리
 */

"use client";

import { useDraggable } from "@dnd-kit/core";

interface PinpointMarkerProps {
  id: string;
  name: string;
  date: string;
  color: string;
  position: number; // 퍼센트 (0-100)
  description?: string | null; // 설명
  rowId?: string; // 속한 행 ID
  isSelected?: boolean; // 선택 상태 (외부에서 관리)
  isDragging?: boolean; // 드래그 중 여부 (외부에서 관리)
  onSelect?: () => void; // 마커 선택
  onDeselect?: () => void; // 선택 해제
  onEdit?: () => void; // 수정 버튼 클릭
  onDelete?: () => void; // 삭제 버튼 클릭
}

export function PinpointMarker({
  id,
  name,
  date,
  color,
  position,
  description,
  rowId,
  isSelected = false,
  isDragging = false,
  onSelect,
  onDeselect,
  onEdit,
  onDelete,
}: PinpointMarkerProps) {
  // @dnd-kit 드래그 훅
  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id: `pinpoint-${id}`,
    data: {
      type: "pinpoint",
      id,
      date,
      rowId,
    },
  });

  // 드래그 스타일
  const dragStyle = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
        zIndex: 100,
      }
    : undefined;

  // 날짜 포맷팅
  const formattedDate = new Date(date).toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

  // 마커 클릭 - 선택 상태 토글
  const handleMarkerClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (isSelected) {
      onDeselect?.();
    } else {
      onSelect?.();
    }
  };

  return (
    <div
      ref={setNodeRef}
      className="absolute top-0"
      style={{
        left: `${position}%`,
        transform: dragStyle?.transform || `translateX(-50%)`,
        zIndex: dragStyle?.zIndex || (isSelected ? 50 : 10),
      }}
      onClick={(e) => {
        e.stopPropagation();
      }}
      {...attributes}
    >
      {/* 삼각형 마커 - 드래그 가능 영역 */}
      <div
        {...listeners}
        onClick={handleMarkerClick}
        className={`w-0 h-0 transition-all cursor-grab active:cursor-grabbing hover:drop-shadow-lg ${
          isDragging ? "opacity-50" : ""
        }`}
        style={{
          borderLeft: "6px solid transparent",
          borderRight: "6px solid transparent",
          borderTop: `12px solid ${color}`,
          filter: isDragging
            ? "drop-shadow(0 2px 8px rgba(0,0,0,0.4))"
            : isSelected
              ? "drop-shadow(0 2px 6px rgba(0,0,0,0.3))"
              : "drop-shadow(0 1px 2px rgba(0,0,0,0.1))",
        }}
        title={`${name} - ${formattedDate}`}
      />

      {/* 설명 박스 (마커 아래에 항상 표시) */}
      <div
        className="absolute left-1/2 -translate-x-1/2 top-3 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded shadow-sm z-40 min-w-max"
        style={{
          padding: "4px 8px",
          maxWidth: "180px",
        }}
      >
        <div className="text-xs">
          <div className="font-semibold text-slate-900 dark:text-slate-100 truncate">
            {name}
          </div>
          <div className="text-slate-500 dark:text-slate-400 text-xs">
            {formattedDate}
          </div>
          {description && (
            <div className="text-slate-600 dark:text-slate-300 text-xs mt-1 break-words max-h-20 overflow-y-auto">
              {description}
            </div>
          )}
        </div>
      </div>

      {/* 선택 시 수정/삭제 버튼 */}
      {isSelected && (
        <div className="absolute left-1/2 -translate-x-1/2 top-20 flex justify-center gap-2">
          {onEdit && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onEdit();
              }}
              className="p-1.5 text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded transition-colors"
              title={`${name} 수정`}
            >
              <svg
                className="w-5 h-5"
                fill="currentColor"
                viewBox="0 0 16 16"
              >
                <path d="M12.146.292a.5.5 0 0 1 .708 0l2.854 2.854a.5.5 0 0 1 0 .708l-10.5 10.5a.5.5 0 0 1-.168.11l-5 1.5a.5.5 0 0 1-.65-.65l1.5-5a.5.5 0 0 1 .11-.168l10.5-10.5zM11.207 2.5 13.5 4.793 14.793 3.5 12.5 1.207 11.207 2.5z"/>
              </svg>
            </button>
          )}
          {onDelete && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
                onDeselect?.();
              }}
              className="p-1.5 text-red-500 hover:text-red-600 dark:text-red-400 dark:hover:text-red-300 hover:bg-red-100 dark:hover:bg-red-900/30 rounded transition-colors"
              title={`${name} 삭제`}
            >
              <svg
                className="w-5 h-5"
                fill="currentColor"
                viewBox="0 0 16 16"
              >
                <path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0V6z" />
                <path
                  fillRule="evenodd"
                  d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1v1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4H4.118zM2.5 1v1h11V1h-11z"
                />
              </svg>
            </button>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * 핀포인트 드래그 오버레이용 컴포넌트
 * DragOverlay 내에서 사용되어 드래그 중 미리보기를 표시
 */
export function PinpointMarkerOverlay({
  name,
  color,
}: {
  name: string;
  color: string;
}) {
  return (
    <div className="relative">
      {/* 삼각형 마커 */}
      <div
        className="w-0 h-0"
        style={{
          borderLeft: "8px solid transparent",
          borderRight: "8px solid transparent",
          borderTop: `16px solid ${color}`,
          filter: "drop-shadow(0 2px 8px rgba(0,0,0,0.4))",
        }}
      />
      {/* 이름 표시 */}
      <div className="absolute left-1/2 -translate-x-1/2 top-4 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded shadow-lg px-2 py-1 whitespace-nowrap">
        <span className="text-xs font-medium text-slate-900 dark:text-slate-100">
          {name}
        </span>
      </div>
    </div>
  );
}
