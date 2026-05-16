export type TaskGridColumnId =
  | "select"
  | "index"
  | "businessUnit"
  | "stageCategory"
  | "majorCategory"
  | "name"
  | "status"
  | "targetDate"
  | "targetDiff"
  | "stage"
  | "predecessor"
  | "assignees"
  | "code"
  | "actions";

export interface TaskGridColumn {
  id: TaskGridColumnId;
  label: string;
  width: number;
  minWidth: number;
  resizable?: boolean;
}

export const DEFAULT_TASK_GRID_COLUMNS: TaskGridColumn[] = [
  { id: "actions", label: "", width: 74, minWidth: 72 },
  { id: "select", label: "", width: 36, minWidth: 36 },
  { id: "index", label: "#", width: 46, minWidth: 42 },
  { id: "businessUnit", label: "사업부", width: 70, minWidth: 64, resizable: true },
  { id: "stageCategory", label: "카테고리", width: 110, minWidth: 90, resizable: true },
  { id: "majorCategory", label: "대분류", width: 110, minWidth: 90, resizable: true },
  { id: "name", label: "기능명", width: 220, minWidth: 160, resizable: true },
  { id: "status", label: "상태", width: 90, minWidth: 80, resizable: true },
  { id: "targetDate", label: "목표일자", width: 112, minWidth: 100, resizable: true },
  { id: "targetDiff", label: "차이", width: 72, minWidth: 64, resizable: true },
  { id: "stage", label: "단계", width: 460, minWidth: 260, resizable: true },
  { id: "predecessor", label: "선행", width: 120, minWidth: 100, resizable: true },
  { id: "assignees", label: "담당자", width: 220, minWidth: 160, resizable: true },
  { id: "code", label: "코드", width: 80, minWidth: 70, resizable: true },
];

export type TaskGridColumnWidths = Map<TaskGridColumnId, number>;

export function buildGridTemplateColumns(
  columns: TaskGridColumn[],
  widths: TaskGridColumnWidths
): string {
  return columns
    .map((column) => `${Math.max(column.minWidth, widths.get(column.id) ?? column.width)}px`)
    .join(" ");
}

export function getGridMinWidth(columns: TaskGridColumn[], widths: TaskGridColumnWidths): string {
  const total = columns.reduce((sum, column) => (
    sum + Math.max(column.minWidth, widths.get(column.id) ?? column.width)
  ), 0);
  return `${total}px`;
}

export function resizeColumnWidth(column: TaskGridColumn, currentWidth: number, deltaX: number): number {
  return Math.max(column.minWidth, currentWidth + deltaX);
}

export function serializeColumnWidths(widths: TaskGridColumnWidths): string {
  return JSON.stringify(Object.fromEntries(widths));
}

export function deserializeColumnWidths(
  value: string | null,
  columns: TaskGridColumn[]
): TaskGridColumnWidths {
  if (!value) return new Map();

  try {
    const parsed = JSON.parse(value) as Record<string, unknown>;
    const columnsById = new Map(columns.map((column) => [column.id, column]));
    const widths: TaskGridColumnWidths = new Map();

    for (const [id, width] of Object.entries(parsed)) {
      const column = columnsById.get(id as TaskGridColumnId);
      if (!column || typeof width !== "number" || !Number.isFinite(width)) continue;
      if (width < column.minWidth) continue;
      widths.set(column.id, width);
    }

    return widths;
  } catch {
    return new Map();
  }
}
