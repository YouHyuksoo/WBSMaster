/**
 * @file src/app/dashboard/as-is-analysis/components/AsIsDetailGrid.tsx
 * @description AS-IS 세부 표가 공유하는 jisung-ui 그리드입니다.
 * 초보자 가이드:
 * - fields는 원본 필드·표시 라벨·선택적 배지 렌더링을 정의합니다.
 * - 편집 모달과 삭제 확인은 기존 화면의 콜백·상태를 그대로 사용합니다.
 */
"use client";
import { useMemo, type ReactNode } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { WbsDataGrid } from "@/components/data-grid/WbsDataGrid";
import { Icon } from "@/components/ui";
import { HoverTooltip } from "@/components/common";

interface DetailField<T> {
  key: keyof T & string;
  label: string;
  width?: number;
  render?: (row: T) => ReactNode;
  value?: (row: T) => string | number | boolean | null | undefined;
  options?: { value: string; label: string }[];
}

interface DetailGridProps<T> {
  rows: T[];
  fields: DetailField<T>[];
  onEdit: (row: T) => void;
  onDelete: (row: T) => void;
  pending?: boolean;
  deleting?: boolean;
  confirmingId?: string | null;
  onConfirmDelete?: (row: T) => void;
  onCancelDelete?: () => void;
}

const getRowId = (row: { id: string }) => row.id;
const pinnedColumns = { right: ["actions"] };

export function AsIsDetailGrid<T extends { id: string }>({ rows, fields, onEdit, onDelete, pending, deleting,
  confirmingId, onConfirmDelete, onCancelDelete }: DetailGridProps<T>) {
  const columns = useMemo<ColumnDef<T, unknown>[]>(() => [
    ...fields.map(field => ({ id: field.key, header: field.label, size: field.width ?? 180, minSize: 85,
      accessorFn: (row: T) => { const value = field.value ? field.value(row) : row[field.key];
        return typeof value === "boolean" ? (value ? "Y" : "N") : value ?? ""; },
      meta: { filterPlaceholder: `${field.label} 검색`, filterType: field.options ? "select" : "text", filterOptions: field.options },
      cell: ({ row, column, getValue }) => {
        const text = String(getValue() ?? "");
        return <HoverTooltip label={field.label} content={text} enabled={Boolean(text)}>
          <div className="truncate" style={{ maxWidth: Math.max(50, column.getSize() - 24) }}>
            {field.render ? field.render(row.original) : text || "-"}
          </div>
        </HoverTooltip>;
      },
    } satisfies ColumnDef<T, unknown>)),
    { id: "actions", header: "작업", size: 100, minSize: 100, enableSorting: false, meta: { filterType: "none" },
      cell: ({ row }) => <div className="flex items-center justify-center gap-1">
        {confirmingId === row.original.id ? <>
          <button type="button" aria-label={`${row.original.id} 삭제 확인`} title="삭제 확인" disabled={deleting}
            onClick={() => onConfirmDelete?.(row.original)} className="size-7 rounded bg-error text-white disabled:opacity-50"><Icon name="check" size="xs" /></button>
          <button type="button" aria-label={`${row.original.id} 삭제 취소`} title="삭제 취소" onClick={onCancelDelete}
            className="size-7 rounded bg-surface text-text"><Icon name="close" size="xs" /></button>
        </> : <>
          <button type="button" aria-label={`${row.original.id} 수정`} title="수정" disabled={pending}
            onClick={() => onEdit(row.original)} className="size-7 rounded text-text-secondary hover:text-primary disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-primary"><Icon name="edit" size="xs" /></button>
          <button type="button" aria-label={`${row.original.id} 삭제`} title="삭제" disabled={pending}
            onClick={() => onDelete(row.original)} className="size-7 rounded text-text-secondary hover:text-error disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-primary"><Icon name="delete" size="xs" /></button>
        </>}
      </div> },
  ], [fields, onEdit, onDelete, pending, deleting, confirmingId, onConfirmDelete, onCancelDelete]);

  return <div className="min-h-44 min-w-0 bg-background-white dark:bg-surface-dark"
    style={{ height: Math.min(520, 140 + Math.min(rows.length, 20) * 44), maxHeight: "70dvh" }}>
    <WbsDataGrid data={rows} columns={columns} getRowId={getRowId} defaultPinnedColumns={pinnedColumns} />
  </div>;
}
