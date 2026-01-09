/**
 * @file src/app/dashboard/wbs/constants.ts
 * @description
 * WBS 페이지에서 사용하는 상수들을 정의합니다.
 * 레벨명, 색상, 상태 등의 상수를 관리합니다.
 *
 * 초보자 가이드:
 * 1. **levelNames**: WBS 레벨별 한글 표시명
 * 2. **levelColors**: 레벨별 배경 색상 (Tailwind CSS)
 * 3. **statusColors**: 상태별 배경 색상
 * 4. **statusNames**: 상태별 한글 표시명
 *
 * 수정 방법:
 * - 새 레벨 추가: levelNames, levelColors에 항목 추가
 * - 새 상태 추가: statusColors, statusNames에 항목 추가
 */

import type { WbsLevel } from "@/lib/api";

/** 레벨별 표시명 (짧은 버전) */
export const levelNames: Record<WbsLevel, string> = {
  LEVEL1: "대",
  LEVEL2: "중",
  LEVEL3: "소",
  LEVEL4: "단",
};

/** 레벨별 전체 표시명 */
export const levelFullNames: Record<WbsLevel, string> = {
  LEVEL1: "대분류",
  LEVEL2: "중분류",
  LEVEL3: "소분류",
  LEVEL4: "단위업무",
};

/** 레벨별 색상 */
export const levelColors: Record<WbsLevel, string> = {
  LEVEL1: "bg-blue-500",
  LEVEL2: "bg-green-500",
  LEVEL3: "bg-yellow-500",
  LEVEL4: "bg-purple-500",
};

/** 상태별 색상 */
export const statusColors: Record<string, string> = {
  PENDING: "bg-gray-400",
  IN_PROGRESS: "bg-primary",
  HOLDING: "bg-warning",
  COMPLETED: "bg-success",
  CANCELLED: "bg-error",
  DELAYED: "bg-rose-500",
};

/** 상태 표시명 */
export const statusNames: Record<string, string> = {
  PENDING: "대기",
  IN_PROGRESS: "진행중",
  HOLDING: "보류",
  COMPLETED: "완료",
  CANCELLED: "취소",
  DELAYED: "지연",
};

/** 간트 차트 줌 레벨 (셀 너비 px) */
export const zoomLevels = [20, 30, 40, 60, 80];

/** 기본 줌 인덱스 */
export const defaultZoomIndex = 2;

/** 기본 패널 너비 */
export const defaultPanelWidth = 560;

/** 최소/최대 패널 너비 */
export const minPanelWidth = 400;
export const maxPanelWidth = 1000;

/** 행 높이 (px) */
export const rowHeight = 40;
