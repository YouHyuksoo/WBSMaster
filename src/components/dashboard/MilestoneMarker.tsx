/**
 * @file src/components/dashboard/MilestoneMarker.tsx
 * @description
 * 마일스톤 마커 컴포넌트입니다.
 * 타임라인 위에 개별 마일스톤을 마커로 표시합니다.
 *
 * 초보자 가이드:
 * 1. **position**: 타임라인 상의 위치 (퍼센트)
 * 2. **status**: 마일스톤 상태에 따른 색상 변경
 * 3. **onClick**: 클릭 시 상세/편집 모달 열기
 *
 * 상태별 색상:
 * - PENDING: 회색 (#94A3B8)
 * - IN_PROGRESS: 파랑 (#3B82F6)
 * - COMPLETED: 초록 (#10B981)
 * - DELAYED: 빨강 (#EF4444)
 */

"use client";

import { useState } from "react";
import type { MilestoneStatus } from "@/lib/api";

interface MilestoneMarkerProps {
  /** 마일스톤 ID */
  id: string;
  /** 마일스톤 이름 */
  name: string;
  /** 마일스톤 날짜 */
  date: string;
  /** 마일스톤 상태 */
  status: MilestoneStatus;
  /** 커스텀 색상 (선택) */
  color?: string;
  /** 타임라인 상 위치 (퍼센트) */
  position: number;
  /** 클릭 핸들러 */
  onClick?: () => void;
}

/** 상태별 기본 색상 */
const STATUS_COLORS: Record<MilestoneStatus, string> = {
  PENDING: "#94A3B8",
  IN_PROGRESS: "#3B82F6",
  COMPLETED: "#10B981",
  DELAYED: "#EF4444",
};

/** 상태별 한글 레이블 */
const STATUS_LABELS: Record<MilestoneStatus, string> = {
  PENDING: "대기",
  IN_PROGRESS: "진행 중",
  COMPLETED: "완료",
  DELAYED: "지연",
};

/**
 * 마일스톤 마커 컴포넌트
 */
export function MilestoneMarker({
  name,
  date,
  status,
  color,
  position,
  onClick,
}: MilestoneMarkerProps) {
  const [isHovered, setIsHovered] = useState(false);

  // 색상 결정: 커스텀 색상 > 상태별 색상
  const markerColor = color || STATUS_COLORS[status];

  // 날짜 포맷
  const formattedDate = new Date(date).toLocaleDateString("ko-KR", {
    month: "short",
    day: "numeric",
  });

  return (
    <div
      className="absolute top-1/2 -translate-y-1/2 cursor-pointer group"
      style={{ left: `${position}%` }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={onClick}
    >
      {/* 마커 포인트 */}
      <div
        className="w-4 h-4 rounded-full border-2 border-white dark:border-slate-900 shadow-md transition-transform group-hover:scale-125"
        style={{ backgroundColor: markerColor }}
      />

      {/* 연결선 */}
      <div
        className="absolute top-full left-1/2 -translate-x-1/2 w-0.5 h-6"
        style={{ backgroundColor: markerColor }}
      />

      {/* 레이블 (항상 표시) */}
      <div className="absolute top-full left-1/2 -translate-x-1/2 mt-7 whitespace-nowrap">
        <div className="text-[10px] font-medium text-slate-700 dark:text-slate-300 text-center max-w-[60px] truncate">
          {name}
        </div>
      </div>

      {/* 툴팁 (호버 시) */}
      {isHovered && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-slate-800 dark:bg-slate-700 text-white text-xs rounded shadow-lg whitespace-nowrap z-20">
          <div className="font-medium">{name}</div>
          <div className="text-slate-300 text-[10px]">{formattedDate}</div>
          <div
            className="text-[10px] mt-0.5"
            style={{ color: markerColor }}
          >
            {STATUS_LABELS[status]}
          </div>
          {/* 툴팁 화살표 */}
          <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-800 dark:border-t-slate-700" />
        </div>
      )}
    </div>
  );
}

/**
 * 마일스톤 연결선 컴포넌트
 * 여러 마일스톤을 연결하는 수평선
 */
export function MilestoneConnector({
  startPosition,
  endPosition,
  color = "#CBD5E1",
}: {
  startPosition: number;
  endPosition: number;
  color?: string;
}) {
  return (
    <div
      className="absolute top-1/2 -translate-y-1/2 h-0.5"
      style={{
        left: `${startPosition}%`,
        width: `${endPosition - startPosition}%`,
        backgroundColor: color,
      }}
    />
  );
}
