/**
 * @file src/app/dashboard/progress-risk/components/ListTab/index.tsx
 * @description 리스트 탭 (FilterBar + TaskGrid) — page에서 분리
 *
 * 초보자 가이드:
 * 1. **FilterBar**: 검색 + 상태 + 카테고리 + 담당자 필터
 * 2. **applyFilters**: 필터 조건 적용 → 필터링된 목록 반환
 * 3. **TaskGrid**: 필터링된 task들을 그리드로 표시
 */
"use client";

import type { ProgressTask } from "@/lib/api";
import { FilterBar, applyFilters, type Filters } from "../FilterBar";
import { TaskGrid } from "../TaskGrid";

interface Props {
  tasks: ProgressTask[];
  projectId: string;
  filters: Filters;
  onFiltersChange: (f: Filters) => void;
}

export function ListTab({ tasks, projectId, filters, onFiltersChange }: Props) {
  const filtered = applyFilters(tasks, filters);

  return (
    <div className="space-y-4">
      <FilterBar tasks={tasks} filters={filters} onChange={onFiltersChange} />
      <TaskGrid tasks={filtered} projectId={projectId} />
    </div>
  );
}
