/**
 * @file src/app/dashboard/progress-risk/components/FilterBar.tsx
 * @description task 그리드 상단 필터 바 (검색 + 필터 핀 + 카테고리/담당자 드롭다운)
 *
 * 초보자 가이드:
 * 1. **검색**: 태스크명/코드로 검색
 * 2. **상태 핀**: 4가지 상태 버튼 (전체, 지연, 진행중, 완료)
 * 3. **카테고리 드롭다운**: 선택 가능한 카테고리 필터
 * 4. **담당자 드롭다운**: 선택 가능한 담당자 필터
 */
"use client";

import { Input } from "@/components/ui";
import type { ProgressTask } from "../types";

export interface Filters {
  search: string;
  status: "all" | "delayed" | "in_progress" | "completed";
  category: string;
  userId: string;
}

interface Props {
  tasks: ProgressTask[];
  filters: Filters;
  onChange: (filters: Filters) => void;
}

/**
 * FilterBar 컴포넌트
 * 검색, 상태 필터 핀, 카테고리/담당자 드롭다운 제공
 */
export function FilterBar({ tasks, filters, onChange }: Props) {
  // 중복 제거된 카테고리 목록
  const categories = [...new Set(tasks.map(t => t.category).filter((c): c is string => !!c))].sort();

  // 담당자 목록 (중복 제거)
  const users = [
    ...new Map(
      tasks
        .flatMap(t => t.assignees)
        .map(a => [a.userId, a.user])
    ).values(),
  ].sort((a, b) => (a.name || "").localeCompare(b.name || ""));

  // 상태별 카운트
  const counts = {
    all: tasks.length,
    delayed: tasks.filter(t => t.status === "DELAYED").length,
    in_progress: tasks.filter(t => t.status === "IN_PROGRESS").length,
    completed: tasks.filter(t => t.status === "COMPLETED").length,
  };

  // 필터 업데이트 헬퍼
  const set = (patch: Partial<Filters>) => onChange({ ...filters, ...patch });

  // 상태 버튼 클래스
  const pillClass = (key: Filters["status"]) =>
    `px-2.5 py-1 rounded-full border text-xs cursor-pointer transition-colors ${
      filters.status === key
        ? "bg-primary/15 border-primary/40 text-primary font-medium"
        : "bg-white/5 dark:bg-white/5 border-white/10 text-text-secondary hover:bg-white/10 dark:hover:bg-white/10"
    }`;

  return (
    <div className="flex flex-wrap gap-3 items-center">
      {/* 검색창 */}
      <div className="w-64">
        <Input
          leftIcon="search"
          placeholder="task 검색..."
          value={filters.search}
          onChange={e => set({ search: e.target.value })}
        />
      </div>

      {/* 상태 핀 */}
      <button className={pillClass("all")} onClick={() => set({ status: "all" })}>
        전체 {counts.all}
      </button>
      <button className={pillClass("delayed")} onClick={() => set({ status: "delayed" })}>
        지연 {counts.delayed}
      </button>
      <button className={pillClass("in_progress")} onClick={() => set({ status: "in_progress" })}>
        진행중 {counts.in_progress}
      </button>
      <button className={pillClass("completed")} onClick={() => set({ status: "completed" })}>
        완료 {counts.completed}
      </button>

      {/* 카테고리 드롭다운 */}
      <select
        value={filters.category}
        onChange={e => set({ category: e.target.value })}
        className="text-xs px-2 py-1.5 rounded bg-surface dark:bg-surface-dark border border-border dark:border-border-dark text-text dark:text-white hover:bg-background-white dark:hover:bg-background-dark transition-colors cursor-pointer"
      >
        <option value="">카테고리 ▾</option>
        {categories.map(c => (
          <option key={c} value={c}>
            {c}
          </option>
        ))}
      </select>

      {/* 담당자 드롭다운 */}
      <select
        value={filters.userId}
        onChange={e => set({ userId: e.target.value })}
        className="text-xs px-2 py-1.5 rounded bg-surface dark:bg-surface-dark border border-border dark:border-border-dark text-text dark:text-white hover:bg-background-white dark:hover:bg-background-dark transition-colors cursor-pointer"
      >
        <option value="">담당자 ▾</option>
        {users.map(u => (
          <option key={u.id} value={u.id}>
            {u.name || "(이름없음)"}
          </option>
        ))}
      </select>
    </div>
  );
}

/**
 * 필터 적용 함수 (page에서 사용)
 * @param tasks 원본 task 배열
 * @param f 필터 객체
 * @returns 필터링된 task 배열
 */
export function applyFilters(tasks: ProgressTask[], f: Filters): ProgressTask[] {
  return tasks.filter(t => {
    // 1. 검색 필터 (이름/코드)
    if (
      f.search &&
      !t.name.toLowerCase().includes(f.search.toLowerCase()) &&
      !t.code?.toLowerCase().includes(f.search.toLowerCase())
    ) {
      return false;
    }

    // 2. 상태 필터
    if (f.status === "delayed" && t.status !== "DELAYED") return false;
    if (f.status === "in_progress" && t.status !== "IN_PROGRESS") return false;
    if (f.status === "completed" && t.status !== "COMPLETED") return false;

    // 3. 카테고리 필터
    if (f.category && t.category !== f.category) return false;

    // 4. 담당자 필터
    if (f.userId && !t.assignees.some(a => a.userId === f.userId)) return false;

    return true;
  });
}
