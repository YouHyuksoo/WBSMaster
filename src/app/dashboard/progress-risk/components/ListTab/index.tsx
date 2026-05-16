/**
 * @file src/app/dashboard/progress-risk/components/ListTab/index.tsx
 * @description 리스트 탭 (TaskGrid) — page에서 분리
 *
 * 초보자 가이드:
 * 1. **applyFilters**: 필터 조건 적용 → 필터링된 목록 반환
 * 2. **TaskGrid**: 필터링된 task들을 그리드로 표시
 */
"use client";

import { useMemo, useState } from "react";
import type { ProgressTask } from "@/lib/api";
import { applyFilters, type Filters } from "../FilterBar";
import { TaskGrid } from "../TaskGrid";
import { PaginationControls } from "./PaginationControls";
import { getPageForTask } from "./listPagination";
import { getListDisplayItems, type ListViewMode } from "./listViewMode";
import { sortProgressTasksForGrid } from "./taskSorting";

interface Props {
  tasks: ProgressTask[];
  projectId: string;
  filters: Filters;
  viewMode: ListViewMode;
  onViewModeChange: (mode: ListViewMode) => void;
  highlightTaskId?: string | null;
}

const PAGE_SIZE = 20;

export function ListTab({ tasks, projectId, filters, viewMode, onViewModeChange, highlightTaskId }: Props) {
  const filterKey = JSON.stringify(filters);
  const [pageState, setPageState] = useState({ filterKey, page: 1 });
  const filtered = useMemo(() => sortProgressTasksForGrid(applyFilters(tasks, filters)), [tasks, filters]);
  const requestedPage = pageState.filterKey === filterKey ? pageState.page : 1;
  const highlightPage = getPageForTask(filtered, highlightTaskId, PAGE_SIZE);
  const paginated = getListDisplayItems(filtered, viewMode, highlightPage ?? requestedPage, PAGE_SIZE);
  const setPage = (page: number) => setPageState({ filterKey, page });

  return (
    <div className="space-y-3">
      <TaskGrid
        tasks={paginated.items}
        projectId={projectId}
        highlightTaskId={highlightTaskId}
        virtualizeRows={viewMode === "scroll"}
        viewMode={viewMode}
        onViewModeChange={onViewModeChange}
        startIndex={paginated.startIndex || 1}
      />
      {paginated.showPagination && (
        <PaginationControls
          page={paginated.page}
          totalPages={paginated.totalPages}
          startIndex={paginated.startIndex}
          endIndex={paginated.endIndex}
          totalItems={paginated.totalItems}
          onPageChange={setPage}
        />
      )}
    </div>
  );
}
