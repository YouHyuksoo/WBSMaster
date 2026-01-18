/**
 * @file src/app/dashboard/as-is-analysis/constants.ts
 * @description
 * AS-IS 현행 분석 시스템의 상수 정의 파일입니다.
 *
 * 초보자 가이드:
 * 1. **MAJOR_CATEGORIES**: 대분류 카테고리 설정 (아이콘, 색상 포함)
 * 2. **CURRENT_METHODS**: 현행 방식 설정 (라벨, 색상 포함)
 * 3. **SECTION_STYLES**: 섹션별 스타일 설정 (아이콘, 색상)
 * 4. **ISSUE_TYPES**: 이슈 타입 설정
 */

import type { AsIsMajorCategory, AsIsCurrentMethod, AsIsIssueType, Priority } from "./types";

// ============================================
// 대분류 카테고리 설정
// ============================================

export interface MajorCategoryConfig {
  label: string;
  labelEn: string;
  icon: string;
  color: string;
  bgColor: string;
}

/** 대분류 카테고리 설정 */
export const MAJOR_CATEGORIES: Record<AsIsMajorCategory, MajorCategoryConfig> = {
  MATERIAL: {
    label: "자재관리",
    labelEn: "MATERIAL",
    icon: "inventory_2",
    color: "text-blue-600",
    bgColor: "bg-blue-50",
  },
  PRODUCTION: {
    label: "생산관리",
    labelEn: "PRODUCTION",
    icon: "precision_manufacturing",
    color: "text-green-600",
    bgColor: "bg-green-50",
  },
  QUALITY: {
    label: "품질관리",
    labelEn: "QUALITY",
    icon: "verified",
    color: "text-purple-600",
    bgColor: "bg-purple-50",
  },
  EQUIPMENT: {
    label: "설비관리",
    labelEn: "EQUIPMENT",
    icon: "build",
    color: "text-orange-600",
    bgColor: "bg-orange-50",
  },
  INVENTORY: {
    label: "재고관리",
    labelEn: "INVENTORY",
    icon: "warehouse",
    color: "text-cyan-600",
    bgColor: "bg-cyan-50",
  },
  SHIPMENT: {
    label: "출하관리",
    labelEn: "SHIPMENT",
    icon: "local_shipping",
    color: "text-teal-600",
    bgColor: "bg-teal-50",
  },
  OTHER: {
    label: "기타",
    labelEn: "OTHER",
    icon: "more_horiz",
    color: "text-slate-600",
    bgColor: "bg-slate-50",
  },
};

/** 대분류 카테고리 옵션 (select용) */
export const MAJOR_CATEGORY_OPTIONS = Object.entries(MAJOR_CATEGORIES).map(
  ([value, config]) => ({
    value: value as AsIsMajorCategory,
    label: config.label,
    labelEn: config.labelEn,
    icon: config.icon,
  })
);

// ============================================
// 현행 방식 설정
// ============================================

export interface CurrentMethodConfig {
  label: string;
  icon: string;
  color: string;
  bgColor: string;
  description: string;
}

/** 현행 방식 설정 */
export const CURRENT_METHODS: Record<AsIsCurrentMethod, CurrentMethodConfig> = {
  MANUAL: {
    label: "수기",
    icon: "edit_note",
    color: "text-amber-600",
    bgColor: "bg-amber-50",
    description: "수기로 작성/관리",
  },
  EXCEL: {
    label: "엑셀",
    icon: "table_chart",
    color: "text-green-600",
    bgColor: "bg-green-50",
    description: "Excel로 관리",
  },
  SYSTEM: {
    label: "시스템",
    icon: "computer",
    color: "text-blue-600",
    bgColor: "bg-blue-50",
    description: "기존 시스템 사용",
  },
  MIXED: {
    label: "혼합",
    icon: "merge_type",
    color: "text-purple-600",
    bgColor: "bg-purple-50",
    description: "여러 방식 혼용",
  },
};

/** 현행 방식 옵션 (select용) */
export const CURRENT_METHOD_OPTIONS = Object.entries(CURRENT_METHODS).map(
  ([value, config]) => ({
    value: value as AsIsCurrentMethod,
    label: config.label,
    icon: config.icon,
    description: config.description,
  })
);

// ============================================
// 섹션별 스타일 설정
// ============================================

export interface SectionStyleConfig {
  label: string;
  labelEn: string;
  icon: string;
  color: string;
  bgColor: string;
  borderColor: string;
}

/** 섹션 스타일 설정 */
export const SECTION_STYLES: Record<string, SectionStyleConfig> = {
  // 기본 정보
  basicInfo: {
    label: "기본 정보",
    labelEn: "BASIC INFO",
    icon: "description",
    color: "#4299e1",
    bgColor: "bg-blue-50",
    borderColor: "border-blue-200",
  },
  // 프로세스 관련
  processDefinition: {
    label: "업무 프로세스 정의서",
    labelEn: "PROCESS DEFINITION",
    icon: "account_tree",
    color: "#48bb78",
    bgColor: "bg-green-50",
    borderColor: "border-green-200",
  },
  processMap: {
    label: "업무 프로세스 맵",
    labelEn: "PROCESS MAP",
    icon: "schema",
    color: "#48bb78",
    bgColor: "bg-green-50",
    borderColor: "border-green-200",
  },
  // R&R
  responsibility: {
    label: "R&R 정의",
    labelEn: "R&R DEFINITION",
    icon: "group",
    color: "#9f7aea",
    bgColor: "bg-purple-50",
    borderColor: "border-purple-200",
  },
  // 인터뷰
  interview: {
    label: "현업 인터뷰 결과",
    labelEn: "INTERVIEW RESULTS",
    icon: "mic",
    color: "#ed8936",
    bgColor: "bg-orange-50",
    borderColor: "border-orange-200",
  },
  // 이슈
  issue: {
    label: "이슈/Pain Point",
    labelEn: "ISSUES",
    icon: "warning",
    color: "#fc8181",
    bgColor: "bg-red-50",
    borderColor: "border-red-200",
  },
  // 조건부 A: 문서
  document: {
    label: "문서 목록",
    labelEn: "DOCUMENTS",
    icon: "folder",
    color: "#38b2ac",
    bgColor: "bg-teal-50",
    borderColor: "border-teal-200",
  },
  documentAnalysis: {
    label: "문서 구조 분석",
    labelEn: "DOCUMENT ANALYSIS",
    icon: "article",
    color: "#38b2ac",
    bgColor: "bg-teal-50",
    borderColor: "border-teal-200",
  },
  // 조건부 B: 시스템
  function: {
    label: "기능 목록",
    labelEn: "FUNCTIONS",
    icon: "functions",
    color: "#4299e1",
    bgColor: "bg-blue-50",
    borderColor: "border-blue-200",
  },
  screen: {
    label: "화면 목록",
    labelEn: "SCREENS",
    icon: "desktop_windows",
    color: "#4299e1",
    bgColor: "bg-blue-50",
    borderColor: "border-blue-200",
  },
  interface: {
    label: "인터페이스 목록",
    labelEn: "INTERFACES",
    icon: "swap_horiz",
    color: "#4299e1",
    bgColor: "bg-blue-50",
    borderColor: "border-blue-200",
  },
  dataModel: {
    label: "데이터 모델",
    labelEn: "DATA MODEL",
    icon: "storage",
    color: "#4299e1",
    bgColor: "bg-blue-50",
    borderColor: "border-blue-200",
  },
  codeDefinition: {
    label: "코드 정의서",
    labelEn: "CODE DEFINITIONS",
    icon: "code",
    color: "#4299e1",
    bgColor: "bg-blue-50",
    borderColor: "border-blue-200",
  },
};

// ============================================
// 이슈 타입 설정
// ============================================

export interface IssueTypeConfig {
  label: string;
  icon: string;
  color: string;
  bgColor: string;
}

/** 이슈 타입 설정 */
export const ISSUE_TYPES: Record<AsIsIssueType, IssueTypeConfig> = {
  PAIN_POINT: {
    label: "Pain Point",
    icon: "sentiment_dissatisfied",
    color: "text-red-600",
    bgColor: "bg-red-50",
  },
  BOTTLENECK: {
    label: "병목현상",
    icon: "hourglass_top",
    color: "text-amber-600",
    bgColor: "bg-amber-50",
  },
  GAP: {
    label: "Gap",
    icon: "compare_arrows",
    color: "text-blue-600",
    bgColor: "bg-blue-50",
  },
  OTHER: {
    label: "기타",
    icon: "help_outline",
    color: "text-slate-600",
    bgColor: "bg-slate-50",
  },
};

/** 이슈 타입 옵션 (select용) */
export const ISSUE_TYPE_OPTIONS = Object.entries(ISSUE_TYPES).map(
  ([value, config]) => ({
    value: value as AsIsIssueType,
    label: config.label,
    icon: config.icon,
  })
);

// ============================================
// 우선순위 설정
// ============================================

export interface PriorityConfig {
  label: string;
  icon: string;
  color: string;
  bgColor: string;
}

/** 우선순위 설정 */
export const PRIORITIES: Record<Priority, PriorityConfig> = {
  HIGH: {
    label: "높음",
    icon: "keyboard_double_arrow_up",
    color: "text-red-600",
    bgColor: "bg-red-50",
  },
  MEDIUM: {
    label: "중간",
    icon: "remove",
    color: "text-amber-600",
    bgColor: "bg-amber-50",
  },
  LOW: {
    label: "낮음",
    icon: "keyboard_double_arrow_down",
    color: "text-green-600",
    bgColor: "bg-green-50",
  },
};

/** 우선순위 옵션 (select용) */
export const PRIORITY_OPTIONS = Object.entries(PRIORITIES).map(
  ([value, config]) => ({
    value: value as Priority,
    label: config.label,
    icon: config.icon,
  })
);

// ============================================
// Flow Chart 노드 타입 설정
// ============================================

export interface NodeTypeConfig {
  label: string;
  icon: string;
  color: string;
  bgColor: string;
  shape: string;
}

/** Flow Chart 노드 타입 설정 */
export const NODE_TYPES: Record<string, NodeTypeConfig> = {
  process: {
    label: "프로세스",
    icon: "crop_square",
    color: "#4299e1",
    bgColor: "#ebf8ff",
    shape: "rectangle",
  },
  decision: {
    label: "판단",
    icon: "change_history",
    color: "#ed8936",
    bgColor: "#fffbeb",
    shape: "diamond",
  },
  startEnd: {
    label: "시작/종료",
    icon: "panorama_fish_eye",
    color: "#48bb78",
    bgColor: "#f0fff4",
    shape: "ellipse",
  },
  document: {
    label: "문서",
    icon: "description",
    color: "#9f7aea",
    bgColor: "#faf5ff",
    shape: "wave",
  },
  data: {
    label: "데이터",
    icon: "storage",
    color: "#38b2ac",
    bgColor: "#e6fffa",
    shape: "parallelogram",
  },
};

// ============================================
// 기본값 설정
// ============================================

/** 기본 대분류 */
export const DEFAULT_MAJOR_CATEGORY: AsIsMajorCategory = "OTHER";

/** 기본 현행 방식 */
export const DEFAULT_CURRENT_METHOD: AsIsCurrentMethod = "MANUAL";

/** 기본 이슈 타입 */
export const DEFAULT_ISSUE_TYPE: AsIsIssueType = "PAIN_POINT";

/** 기본 우선순위 */
export const DEFAULT_PRIORITY: Priority = "MEDIUM";

// ============================================
// 조건부 섹션 판단 함수
// ============================================

/**
 * 현행 방식이 수기/엑셀인지 확인
 * @param method 현행 방식
 * @returns 수기 또는 엑셀이면 true
 */
export function isManualOrExcel(method: AsIsCurrentMethod): boolean {
  return method === "MANUAL" || method === "EXCEL";
}

/**
 * 현행 방식이 시스템인지 확인
 * @param method 현행 방식
 * @returns 시스템이면 true
 */
export function isSystem(method: AsIsCurrentMethod): boolean {
  return method === "SYSTEM";
}

/**
 * 현행 방식이 혼합인지 확인 (모든 섹션 표시)
 * @param method 현행 방식
 * @returns 혼합이면 true
 */
export function isMixed(method: AsIsCurrentMethod): boolean {
  return method === "MIXED";
}

/**
 * 조건부 섹션 A (수기/엑셀용) 표시 여부
 * @param method 현행 방식
 * @returns 표시해야 하면 true
 */
export function shouldShowSectionA(method: AsIsCurrentMethod): boolean {
  return isManualOrExcel(method) || isMixed(method);
}

/**
 * 조건부 섹션 B (시스템용) 표시 여부
 * @param method 현행 방식
 * @returns 표시해야 하면 true
 */
export function shouldShowSectionB(method: AsIsCurrentMethod): boolean {
  return isSystem(method) || isMixed(method);
}
