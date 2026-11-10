/**
 * @file src/app/dashboard/to-be/types.ts
 * @description TO-BE 설계 화면의 라벨 · 색 설정입니다.
 *
 * 초보자 가이드:
 * 1. 대분류는 AS-IS 와 같은 설정(MAJOR_CATEGORIES)을 그대로 쓴다
 * 2. 변화 유형 · 목표 방식 · 상태 · 우선순위 라벨은 여기서만 정한다
 * 3. 색: 배경은 500/10 반투명, 글자는 600/400 (파스텔 금지)
 */

import type { ToBeItem } from "@/lib/api";

export { MAJOR_CATEGORIES, MAJOR_CATEGORY_OPTIONS } from "../as-is-analysis/constants";
export type { ToBeItem };

interface BadgeConfig {
  label: string;
  className: string;
  icon: string;
}

export const CHANGE_TYPE_CONFIG: Record<ToBeItem["changeType"], BadgeConfig> = {
  NEW: { label: "신규", className: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400", icon: "add_circle" },
  IMPROVE: { label: "개선", className: "bg-sky-500/10 text-sky-600 dark:text-sky-400", icon: "trending_up" },
  KEEP: { label: "유지", className: "bg-slate-500/10 text-slate-600 dark:text-slate-300", icon: "pause_circle" },
  RETIRE: { label: "폐지", className: "bg-rose-500/10 text-rose-600 dark:text-rose-400", icon: "remove_circle" },
};

export const TARGET_METHOD_CONFIG: Record<ToBeItem["targetMethod"], BadgeConfig> = {
  SYSTEM: { label: "시스템", className: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400", icon: "computer" },
  AUTO: { label: "자동(설비 연계)", className: "bg-violet-500/10 text-violet-600 dark:text-violet-400", icon: "precision_manufacturing" },
  POP: { label: "POP", className: "bg-amber-500/10 text-amber-600 dark:text-amber-400", icon: "touch_app" },
  PDA: { label: "PDA", className: "bg-teal-500/10 text-teal-600 dark:text-teal-400", icon: "smartphone" },
  MANUAL: { label: "수기 유지", className: "bg-slate-500/10 text-slate-600 dark:text-slate-300", icon: "edit_note" },
};

export const STATUS_CONFIG: Record<ToBeItem["status"], BadgeConfig> = {
  DRAFT: { label: "작성중", className: "bg-slate-500/10 text-slate-600 dark:text-slate-300", icon: "edit" },
  REVIEW: { label: "협의중", className: "bg-amber-500/10 text-amber-600 dark:text-amber-400", icon: "forum" },
  CONFIRMED: { label: "확정", className: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400", icon: "verified" },
};

export const PRIORITY_LABEL: Record<NonNullable<ToBeItem["priority"]>, string> = { HIGH: "높음", MEDIUM: "보통", LOW: "낮음" };

/** 개선 매핑 결과 (2단계) */
export const FIX_RESULT_CONFIG: Record<"RESOLVED" | "PARTIAL" | "OPEN", { label: string; className: string }> = {
  RESOLVED: { label: "해결", className: "text-emerald-600 dark:text-emerald-400" },
  PARTIAL: { label: "부분 해결", className: "text-amber-600 dark:text-amber-400" },
  OPEN: { label: "미해결", className: "text-rose-600 dark:text-rose-400" },
};
