/**
 * @file src/app/dashboard/progress-risk/components/TaskGrid.tsx
 * @description task 그리드 — 헤더 + 행 목록
 *
 * 초보자 가이드:
 * 1. **COLS**: 그리드 컬럼 폭 정의 (TaskRow와 공유)
 * 2. **헤더**: 고정 헤더 행 (배경색 dark:bg-background-dark)
 * 3. **TaskRow**: 각 task를 개별 행으로 렌더 + highlight 지원
 */
import { useMemo, useRef, useState } from "react";
import { Button, useToast } from "@/components/ui";
import { useStageDefs, useUpdateProgressTask } from "@/hooks";
import type { ProgressStageDef, ProgressTask } from "@/lib/api";
import { STAGE_CATEGORY_LABEL, type StageCategory } from "@/lib/stage-categories";
import { TaskRow } from "./TaskRow";
import { EditTaskPanel } from "./EditTaskModal";
import {
  buildGridTemplateColumns,
  DEFAULT_TASK_GRID_COLUMNS,
  deserializeColumnWidths,
  getGridMinWidth,
  resizeColumnWidth,
  serializeColumnWidths,
  type TaskGridColumn,
  type TaskGridColumnWidths,
} from "./taskGridColumns";
import { PROGRESS_TASK_STATUS_LABEL, PROGRESS_TASK_STATUS_OPTIONS, type ProgressTaskStatus } from "./taskStatusOptions";
import { getVirtualTaskRange } from "./TaskGridVirtualization";
import type { ListViewMode } from "./ListTab/listViewMode";

interface Props {
  tasks: ProgressTask[];
  projectId: string;
  highlightTaskId?: string | null;
  virtualizeRows?: boolean;
  viewMode?: ListViewMode;
  onViewModeChange?: (mode: ListViewMode) => void;
  /** 현재 페이지의 첫 행 번호 (1-based). 페이지 2/PAGE_SIZE=20 → 21. 기본값 1. */
  startIndex?: number;
}

/** 대분류 자동완성 옵션 — TaskRow의 input list 속성과 매칭 */
const CATEGORY_OPTIONS = ["자재관리", "생산관리", "품질관리", "공정관리", "설비관리", "기준관리", "출하관리", "재고관리"];
const VIRTUAL_ROW_HEIGHT = 45;
const VIRTUAL_OVERSCAN = 8;
const COLUMN_WIDTH_STORAGE_PREFIX = "progress-risk-task-grid-column-widths";

export function getBulkStageOptions(
  tasks: ProgressTask[],
  stages: ProgressStageDef[],
  selectedIds: Set<string>
): { category: StageCategory | null; stages: ProgressStageDef[]; disabledReason: string | null } {
  const selectedTasks = tasks.filter((task) => selectedIds.has(task.id));
  if (selectedTasks.length === 0) {
    return { category: null, stages: [], disabledReason: "행을 선택하세요." };
  }

  const categories = new Set(selectedTasks.map((task) => task.stageCategory));
  if (categories.size > 1) {
    return { category: null, stages: [], disabledReason: "같은 카테고리의 행만 선택하세요." };
  }

  const category = selectedTasks[0].stageCategory;
  const options = stages
    .filter((stage) => stage.category === category)
    .sort((a, b) => a.order - b.order);

  return {
    category,
    stages: options,
    disabledReason: options.length === 0 ? "선택한 카테고리에 등록된 단계가 없습니다." : null,
  };
}

export function getSelectedTaskIds(tasks: ProgressTask[], selectedIds: Set<string>): string[] {
  return tasks.filter((task) => selectedIds.has(task.id)).map((task) => task.id);
}

export function TaskGrid({ tasks, projectId, highlightTaskId, virtualizeRows = false, viewMode, onViewModeChange, startIndex = 1 }: Props) {
  const toast = useToast();
  const update = useUpdateProgressTask(projectId);
  const { data: allStages = [] } = useStageDefs(projectId);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkStageId, setBulkStageId] = useState("");
  const [bulkTargetDate, setBulkTargetDate] = useState("");
  const [bulkStatus, setBulkStatus] = useState<"" | ProgressTaskStatus>("");
  const [isBulkUpdating, setIsBulkUpdating] = useState(false);
  const [isBulkTargetUpdating, setIsBulkTargetUpdating] = useState(false);
  const [isBulkStatusUpdating, setIsBulkStatusUpdating] = useState(false);
  const [columnWidths, setColumnWidths] = useState<TaskGridColumnWidths>(() => {
    if (typeof window === "undefined") return new Map();
    return deserializeColumnWidths(
      window.localStorage.getItem(`${COLUMN_WIDTH_STORAGE_PREFIX}:${projectId}`),
      DEFAULT_TASK_GRID_COLUMNS
    );
  });
  const [scrollState, setScrollState] = useState({ scrollTop: 0, viewportHeight: 620 });
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const resizeRef = useRef<{
    column: TaskGridColumn;
    startX: number;
    startWidth: number;
  } | null>(null);
  const allVisibleSelected = tasks.length > 0 && tasks.every((task) => selectedIds.has(task.id));
  const selectedCount = tasks.filter((task) => selectedIds.has(task.id)).length;
  const gridCols = buildGridTemplateColumns(DEFAULT_TASK_GRID_COLUMNS, columnWidths);
  const gridMinWidth = getGridMinWidth(DEFAULT_TASK_GRID_COLUMNS, columnWidths);
  const isAnyBulkUpdating = isBulkUpdating || isBulkTargetUpdating || isBulkStatusUpdating;
  const bulkOptions = useMemo(
    () => getBulkStageOptions(tasks, allStages, selectedIds),
    [tasks, allStages, selectedIds]
  );
  const canBulkUpdate = selectedCount > 0 && !!bulkStageId && !bulkOptions.disabledReason && !isAnyBulkUpdating;
  const canBulkTargetUpdate = selectedCount > 0 && !!bulkTargetDate && !isAnyBulkUpdating;
  const canBulkStatusUpdate = selectedCount > 0 && !!bulkStatus && !isAnyBulkUpdating;
  const virtualRange = useMemo(
    () => getVirtualTaskRange({
      totalItems: tasks.length,
      scrollTop: scrollState.scrollTop,
      viewportHeight: scrollState.viewportHeight,
      rowHeight: VIRTUAL_ROW_HEIGHT,
      overscan: VIRTUAL_OVERSCAN,
    }),
    [tasks.length, scrollState.scrollTop, scrollState.viewportHeight]
  );
  const visibleTasks = virtualizeRows
    ? tasks.slice(virtualRange.start, virtualRange.end)
    : tasks;
  const editingTask = editingTaskId ? tasks.find((task) => task.id === editingTaskId) ?? null : null;

  const setTaskSelected = (taskId: string, checked: boolean) => {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (checked) {
        next.add(taskId);
      } else {
        next.delete(taskId);
      }
      return next;
    });
  };

  const toggleAllVisible = (checked: boolean) => {
    setSelectedIds((current) => {
      const next = new Set(current);
      for (const task of tasks) {
        if (checked) {
          next.add(task.id);
        } else {
          next.delete(task.id);
        }
      }
      return next;
    });
  };

  const handleBulkStageChange = async () => {
    if (!canBulkUpdate) return;

    const targetIds = getSelectedTaskIds(tasks, selectedIds);
    try {
      setIsBulkUpdating(true);
      await Promise.all(
        targetIds.map((id) => update.mutateAsync({ id, data: { currentStageId: bulkStageId } }))
      );
      toast.success(`${targetIds.length}개 행의 단계가 변경되었습니다.`);
      setSelectedIds(new Set());
      setBulkStageId("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "단계 일괄 변경 실패");
    } finally {
      setIsBulkUpdating(false);
    }
  };

  const handleBulkTargetDateChange = async () => {
    if (!canBulkTargetUpdate) return;

    const targetIds = getSelectedTaskIds(tasks, selectedIds);
    try {
      setIsBulkTargetUpdating(true);
      await Promise.all(
        targetIds.map((id) => update.mutateAsync({ id, data: { endDate: bulkTargetDate } }))
      );
      toast.success(`${targetIds.length}개 행의 목표일자가 변경되었습니다.`);
      setSelectedIds(new Set());
      setBulkTargetDate("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "목표일 일괄 변경 실패");
    } finally {
      setIsBulkTargetUpdating(false);
    }
  };

  const handleBulkStatusChange = async () => {
    if (!canBulkStatusUpdate) return;

    const targetIds = getSelectedTaskIds(tasks, selectedIds);
    try {
      setIsBulkStatusUpdating(true);
      await Promise.all(
        targetIds.map((id) => update.mutateAsync({ id, data: { status: bulkStatus } }))
      );
      toast.success(`${targetIds.length}개 행의 상태가 변경되었습니다.`);
      setSelectedIds(new Set());
      setBulkStatus("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "상태 일괄 변경 실패");
    } finally {
      setIsBulkStatusUpdating(false);
    }
  };

  const startResize = (column: TaskGridColumn, clientX: number) => {
    resizeRef.current = {
      column,
      startX: clientX,
      startWidth: columnWidths.get(column.id) ?? column.width,
    };
    window.addEventListener("mousemove", handleResizeMove);
    window.addEventListener("mouseup", stopResize, { once: true });
  };

  const handleResizeMove = (event: MouseEvent) => {
    const state = resizeRef.current;
    if (!state) return;
    const nextWidth = resizeColumnWidth(state.column, state.startWidth, event.clientX - state.startX);
    setColumnWidths((current) => {
      const next = new Map(current);
      next.set(state.column.id, nextWidth);
      window.localStorage.setItem(`${COLUMN_WIDTH_STORAGE_PREFIX}:${projectId}`, serializeColumnWidths(next));
      return next;
    });
  };

  const stopResize = () => {
    resizeRef.current = null;
    window.removeEventListener("mousemove", handleResizeMove);
  };

  return (
    <div className="flex items-start gap-3">
      <div
        className={`min-w-0 flex-1 bg-background-white dark:bg-surface-dark border border-border dark:border-border-dark rounded-xl overflow-x-auto ${
          virtualizeRows ? "max-h-[calc(100vh-320px)] overflow-y-auto" : "overflow-hidden"
        }`}
        onScroll={(event) => {
          if (!virtualizeRows) return;
          const target = event.currentTarget;
          setScrollState({
            scrollTop: target.scrollTop,
            viewportHeight: target.clientHeight,
          });
        }}
      >
      <datalist id="progress-task-category-options">
        {CATEGORY_OPTIONS.map((c) => (
          <option key={c} value={c} />
        ))}
      </datalist>
      <div className="flex flex-wrap items-center gap-2 border-b border-border dark:border-border-dark bg-background-white dark:bg-surface-dark px-3 py-2">
        <span className="text-[11px] font-medium text-text-secondary">
          선택 {selectedCount}개
        </span>
        <select
          value={bulkStageId}
          onChange={(e) => setBulkStageId(e.target.value)}
          disabled={!!bulkOptions.disabledReason || isAnyBulkUpdating}
          aria-label="일괄 변경 단계"
          className="h-8 rounded border border-border dark:border-border-dark bg-surface dark:bg-background-dark px-2 text-[11px] text-text dark:text-white disabled:cursor-not-allowed disabled:opacity-50"
        >
          <option value="">
            {bulkOptions.category
              ? `${STAGE_CATEGORY_LABEL[bulkOptions.category]} 단계 선택`
              : "단계 선택"}
          </option>
          {bulkOptions.stages.map((stage) => (
            <option key={stage.id} value={stage.id}>
              {stage.name}
            </option>
          ))}
        </select>
        <Button
          variant="secondary"
          size="sm"
          onClick={handleBulkStageChange}
          disabled={!canBulkUpdate}
          isLoading={isBulkUpdating}
        >
          {isBulkUpdating ? "처리 중..." : "단계 일괄 변경"}
        </Button>
        <input
          type="date"
          value={bulkTargetDate}
          onChange={(event) => setBulkTargetDate(event.target.value)}
          disabled={isAnyBulkUpdating}
          aria-label="일괄 변경 목표일"
          className="h-8 rounded border border-border dark:border-border-dark bg-surface dark:bg-background-dark px-2 text-[11px] text-text dark:text-white disabled:cursor-not-allowed disabled:opacity-50"
        />
        <Button
          variant="secondary"
          size="sm"
          onClick={handleBulkTargetDateChange}
          disabled={!canBulkTargetUpdate}
          isLoading={isBulkTargetUpdating}
        >
          {isBulkTargetUpdating ? "처리 중..." : "목표일 일괄 변경"}
        </Button>
        <select
          value={bulkStatus}
          onChange={(event) => setBulkStatus(event.target.value as "" | ProgressTaskStatus)}
          disabled={isAnyBulkUpdating}
          aria-label="일괄 변경 상태"
          className="h-8 rounded border border-border dark:border-border-dark bg-surface dark:bg-background-dark px-2 text-[11px] text-text dark:text-white disabled:cursor-not-allowed disabled:opacity-50"
        >
          <option value="">상태 선택</option>
          {PROGRESS_TASK_STATUS_OPTIONS.map((status) => (
            <option key={status} value={status}>{PROGRESS_TASK_STATUS_LABEL[status]}</option>
          ))}
        </select>
        <Button
          variant="secondary"
          size="sm"
          onClick={handleBulkStatusChange}
          disabled={!canBulkStatusUpdate}
          isLoading={isBulkStatusUpdating}
        >
          {isBulkStatusUpdating ? "처리 중..." : "상태 일괄 변경"}
        </Button>
        {isBulkUpdating && (
          <span className="text-[11px] text-primary" role="status">
            선택한 {selectedCount}개 행을 DB에 반영하는 중입니다.
          </span>
        )}
        {isBulkTargetUpdating && (
          <span className="text-[11px] text-primary" role="status">
            선택한 {selectedCount}개 행의 목표일자를 DB에 반영하는 중입니다.
          </span>
        )}
        {isBulkStatusUpdating && (
          <span className="text-[11px] text-primary" role="status">
            선택한 {selectedCount}개 행의 상태를 DB에 반영하는 중입니다.
          </span>
        )}
        {onViewModeChange && viewMode && (
          <div className="ml-auto flex items-center gap-1.5 rounded-md border border-border bg-background-white px-1.5 py-1 dark:border-border-dark dark:bg-surface-dark">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-text-secondary">보기</span>
            <div className="flex rounded bg-surface p-0.5 dark:bg-background-dark">
              <button
                type="button"
                onClick={() => onViewModeChange("pagination")}
                className={`h-6 rounded px-2 text-[11px] font-semibold transition-colors ${
                  viewMode === "pagination"
                    ? "bg-background-white text-primary shadow-sm dark:bg-surface-dark"
                    : "text-text-secondary hover:text-text dark:hover:text-white"
                }`}
              >
                페이지
              </button>
              <button
                type="button"
                onClick={() => onViewModeChange("scroll")}
                className={`h-6 rounded px-2 text-[11px] font-semibold transition-colors ${
                  viewMode === "scroll"
                    ? "bg-background-white text-primary shadow-sm dark:bg-surface-dark"
                    : "text-text-secondary hover:text-text dark:hover:text-white"
                }`}
              >
                스크롤
              </button>
            </div>
          </div>
        )}
        {bulkOptions.disabledReason && selectedCount > 0 && (
          <span className="text-[11px] text-warning">{bulkOptions.disabledReason}</span>
        )}
      </div>
      {/* 헤더 행 */}
      <div
        className="grid gap-1.5 px-3 py-2 bg-surface dark:bg-background-dark border-b border-border dark:border-border-dark text-[11px] font-semibold text-text-secondary uppercase"
        style={{ gridTemplateColumns: gridCols, minWidth: gridMinWidth }}
      >
        {DEFAULT_TASK_GRID_COLUMNS.map((column) => (
          <HeaderCell
            key={column.id}
            column={column}
            allVisibleSelected={allVisibleSelected}
            isBulkUpdating={isAnyBulkUpdating}
            onToggleAllVisible={toggleAllVisible}
            onResizeStart={startResize}
          />
        ))}
      </div>

      {/* task 목록 */}
      {virtualizeRows && virtualRange.topPadding > 0 && (
        <div style={{ height: virtualRange.topPadding, minWidth: gridMinWidth }} />
      )}
      {visibleTasks.map((task, idx) => (
        <TaskRow
          key={`${task.id}:${task.name}:${task.category ?? ""}:${task.endDate}`}
          index={startIndex + (virtualizeRows ? virtualRange.start : 0) + idx}
          task={task}
          projectId={projectId}
          allTasks={tasks}
          gridCols={gridCols}
          minWidth={gridMinWidth}
          highlighted={highlightTaskId === task.id}
          selected={selectedIds.has(task.id)}
          onSelectChange={(checked) => {
            if (!isAnyBulkUpdating) setTaskSelected(task.id, checked);
          }}
          onEditRequest={(target) => setEditingTaskId(target.id)}
        />
      ))}
      {virtualizeRows && virtualRange.bottomPadding > 0 && (
        <div style={{ height: virtualRange.bottomPadding, minWidth: gridMinWidth }} />
      )}
      </div>
      {editingTask && (
        <aside className="sticky top-4 max-h-[calc(100vh-140px)] w-[380px] shrink-0 overflow-y-auto rounded-xl border border-border bg-background-white shadow-sm dark:border-border-dark dark:bg-surface-dark">
          <div className="flex items-center justify-between border-b border-border px-4 py-3 dark:border-border-dark">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-text dark:text-white">행 수정</p>
              <p className="truncate text-xs text-text-secondary">{editingTask.code} {editingTask.name}</p>
            </div>
            <button
              type="button"
              onClick={() => setEditingTaskId(null)}
              className="rounded px-2 py-1 text-xs text-text-secondary transition-colors hover:bg-surface hover:text-text dark:hover:bg-background-dark dark:hover:text-white"
              aria-label="수정 패널 닫기"
            >
              닫기
            </button>
          </div>
          <div className="p-4">
            <EditTaskPanel
              key={`${editingTask.id}:${editingTask.updatedAt}`}
              projectId={projectId}
              task={editingTask}
              allTasks={tasks}
              onClose={() => setEditingTaskId(null)}
            />
          </div>
        </aside>
      )}
    </div>
  );
}

function HeaderCell({
  column,
  allVisibleSelected,
  isBulkUpdating,
  onToggleAllVisible,
  onResizeStart,
}: {
  column: TaskGridColumn;
  allVisibleSelected: boolean;
  isBulkUpdating: boolean;
  onToggleAllVisible: (checked: boolean) => void;
  onResizeStart: (column: TaskGridColumn, clientX: number) => void;
}) {
  return (
    <div className="relative flex min-w-0 items-center">
      {column.id === "select" ? (
        <input
          type="checkbox"
          checked={allVisibleSelected}
          onChange={(e) => onToggleAllVisible(e.target.checked)}
          disabled={isBulkUpdating}
          aria-label="현재 목록 전체 선택"
          className="mx-auto size-4 accent-primary"
        />
      ) : (
        <span className="truncate">{column.label}</span>
      )}
      {column.resizable && (
        <button
          type="button"
          aria-label={`${column.label} 컬럼 폭 조정`}
          className="absolute -right-1 top-[-8px] h-[calc(100%+16px)] w-2 cursor-col-resize border-r border-transparent hover:border-primary/60"
          onMouseDown={(event) => {
            event.preventDefault();
            onResizeStart(column, event.clientX);
          }}
        />
      )}
    </div>
  );
}
