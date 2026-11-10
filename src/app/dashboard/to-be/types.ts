/**
 * @file src/app/dashboard/to-be/types.ts
 * @description TO-BE 설계 화면의 라벨 · 색 설정입니다.
 *
 * 초보자 가이드:
 * 1. 대분류는 AS-IS 와 같은 설정(MAJOR_CATEGORIES)을 그대로 쓴다
 * 2. 한국어 라벨은 src/lib/to-be/labels.ts (서버 엑셀과 같이 씀), 여기서는 배지 색 · 아이콘만 정한다
 * 3. 색: 배경은 500/10 반투명, 글자는 600/400 (파스텔 금지)
 */

import type { ToBeItem } from "@/lib/api";
import { CHANGE_TYPE_LABEL as C, FIX_RESULT_LABEL as F, STATUS_LABEL as S, TARGET_METHOD_LABEL as T } from "@/lib/to-be/labels";

export { needsImplementation, WBS_STATUS_LABEL } from "@/lib/to-be/labels";

export { MAJOR_CATEGORIES, MAJOR_CATEGORY_OPTIONS } from "../as-is-analysis/constants";
export type { ToBeItem };

interface BadgeConfig {
  label: string;
  className: string;
  icon: string;
}

export const CHANGE_TYPE_CONFIG: Record<ToBeItem["changeType"], BadgeConfig> = {
  NEW: { label: C.NEW, className: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400", icon: "add_circle" },
  IMPROVE: { label: C.IMPROVE, className: "bg-sky-500/10 text-sky-600 dark:text-sky-400", icon: "trending_up" },
  KEEP: { label: C.KEEP, className: "bg-slate-500/10 text-slate-600 dark:text-slate-300", icon: "pause_circle" },
  RETIRE: { label: C.RETIRE, className: "bg-rose-500/10 text-rose-600 dark:text-rose-400", icon: "remove_circle" },
};

export const TARGET_METHOD_CONFIG: Record<ToBeItem["targetMethod"], BadgeConfig> = {
  SYSTEM: { label: T.SYSTEM, className: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400", icon: "computer" },
  AUTO: { label: T.AUTO, className: "bg-violet-500/10 text-violet-600 dark:text-violet-400", icon: "precision_manufacturing" },
  POP: { label: T.POP, className: "bg-amber-500/10 text-amber-600 dark:text-amber-400", icon: "touch_app" },
  PDA: { label: T.PDA, className: "bg-teal-500/10 text-teal-600 dark:text-teal-400", icon: "smartphone" },
  MANUAL: { label: T.MANUAL, className: "bg-slate-500/10 text-slate-600 dark:text-slate-300", icon: "edit_note" },
};

export const STATUS_CONFIG: Record<ToBeItem["status"], BadgeConfig> = {
  DRAFT: { label: S.DRAFT, className: "bg-slate-500/10 text-slate-600 dark:text-slate-300", icon: "edit" },
  REVIEW: { label: S.REVIEW, className: "bg-amber-500/10 text-amber-600 dark:text-amber-400", icon: "forum" },
  CONFIRMED: { label: S.CONFIRMED, className: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400", icon: "verified" },
};

export const PRIORITY_LABEL: Record<NonNullable<ToBeItem["priority"]>, string> = { HIGH: "높음", MEDIUM: "보통", LOW: "낮음" };

/** 개선 매핑 결과 (2단계) */
export const FIX_RESULT_CONFIG: Record<"RESOLVED" | "PARTIAL" | "OPEN", { label: string; className: string }> = {
  RESOLVED: { label: F.RESOLVED, className: "text-emerald-600 dark:text-emerald-400" },
  PARTIAL: { label: F.PARTIAL, className: "text-amber-600 dark:text-amber-400" },
  OPEN: { label: F.OPEN, className: "text-rose-600 dark:text-rose-400" },
};
