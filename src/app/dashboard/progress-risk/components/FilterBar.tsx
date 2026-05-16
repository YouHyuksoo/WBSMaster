/**
 * @file src/app/dashboard/progress-risk/components/FilterBar.tsx
 * @description Filter controls for the progress task list.
 */
"use client";

import { Input } from "@/components/ui";
import { STAGE_CATEGORY_LABEL, STAGE_CATEGORY_ORDER, type StageCategory } from "@/lib/stage-categories";
import type { ProgressTask } from "../types";
import {
  PROGRESS_TASK_STATUS_LABEL,
  PROGRESS_TASK_STATUS_OPTIONS,
  type ProgressTaskStatus,
} from "./taskStatusOptions";

export interface Filters {
  search: string;
  status: "all" | ProgressTaskStatus;
  businessUnit: string;
  category: "" | StageCategory;
  majorCategory: string;
}

interface Props {
  tasks: ProgressTask[];
  filters: Filters;
  onChange: (filters: Filters) => void;
}

export function FilterBar({ tasks, filters, onChange }: Props) {
  const set = (patch: Partial<Filters>) => onChange({ ...filters, ...patch });
  const businessUnits = [...new Set(tasks.map(t => t.businessUnit).filter((b): b is string => !!b))].sort();
  const categories = STAGE_CATEGORY_ORDER.filter((category) =>
    tasks.some((task) => task.stageCategory === category)
  );
  const majorCategorySource = filters.category
    ? tasks.filter((task) => task.stageCategory === filters.category)
    : tasks;
  const majorCategories = [...new Set(majorCategorySource.map(t => t.category).filter((c): c is string => !!c))].sort();

  return (
    <div className="flex flex-wrap gap-3 items-center">
      <div className="w-64">
        <Input
          leftIcon="search"
          placeholder="task 검색..."
          value={filters.search}
          onChange={e => set({ search: e.target.value })}
        />
      </div>

      <select
        aria-label="카테고리"
        value={filters.category}
        onChange={e => set({ category: e.target.value as Filters["category"], majorCategory: "" })}
        className="text-xs px-2 py-1.5 rounded bg-surface dark:bg-surface-dark border border-border dark:border-border-dark text-text dark:text-white hover:bg-background-white dark:hover:bg-background-dark transition-colors cursor-pointer"
      >
        <option value="">카테고리 ▾</option>
        {categories.map(category => (
          <option key={category} value={category}>{STAGE_CATEGORY_LABEL[category]}</option>
        ))}
      </select>

      <select
        aria-label="대분류"
        value={filters.majorCategory}
        onChange={e => set({ majorCategory: e.target.value })}
        className="text-xs px-2 py-1.5 rounded bg-surface dark:bg-surface-dark border border-border dark:border-border-dark text-text dark:text-white hover:bg-background-white dark:hover:bg-background-dark transition-colors cursor-pointer"
      >
        <option value="">대분류 ▾</option>
        {majorCategories.map(c => (
          <option key={c} value={c}>{c}</option>
        ))}
      </select>

      <select
        aria-label="상태"
        value={filters.status}
        onChange={e => set({ status: e.target.value as Filters["status"] })}
        className="text-xs px-2 py-1.5 rounded bg-surface dark:bg-surface-dark border border-border dark:border-border-dark text-text dark:text-white hover:bg-background-white dark:hover:bg-background-dark transition-colors cursor-pointer"
      >
        <option value="all">상태 ▾</option>
        {PROGRESS_TASK_STATUS_OPTIONS.map(status => (
          <option key={status} value={status}>{PROGRESS_TASK_STATUS_LABEL[status]}</option>
        ))}
      </select>

      <select
        aria-label="사업부"
        value={filters.businessUnit}
        onChange={e => set({ businessUnit: e.target.value })}
        className="text-xs px-2 py-1.5 rounded bg-surface dark:bg-surface-dark border border-border dark:border-border-dark text-text dark:text-white hover:bg-background-white dark:hover:bg-background-dark transition-colors cursor-pointer"
      >
        <option value="">사업부 ▾</option>
        {businessUnits.map(b => (
          <option key={b} value={b}>{b}</option>
        ))}
      </select>
    </div>
  );
}

export function applyFilters(tasks: ProgressTask[], f: Filters): ProgressTask[] {
  return tasks.filter(t => {
    if (
      f.search &&
      !t.name.toLowerCase().includes(f.search.toLowerCase()) &&
      !t.code?.toLowerCase().includes(f.search.toLowerCase())
    ) {
      return false;
    }

    if (f.status !== "all" && t.status !== f.status) return false;

    if (f.businessUnit && t.businessUnit !== f.businessUnit) return false;
    if (f.category && t.stageCategory !== f.category) return false;
    if (f.majorCategory && t.category !== f.majorCategory) return false;

    return true;
  });
}
