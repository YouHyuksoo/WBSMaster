/**
 * @file src/app/dashboard/to-be/components/ToBeTable.tsx
 * @description TO-BE 총괄표: 공용 그리드(WbsDataGrid)에 TO-BE 업무를 보여 줍니다.
 * 초보자 가이드:
 * - 수정 칸은 왼쪽에 고정. 정렬 · 칼럼 필터 · 페이지 이동은 공용 그리드가 맡는다
 */
"use client";

import { useMemo } from "react";
import { WbsDataGrid } from "@/components/data-grid/WbsDataGrid";
import type { ToBeItem } from "../types";
import { createToBeColumns, type ToBeActions } from "./toBeColumns";

const getRowId = (row: ToBeItem) => row.id;
const pinnedColumns = { left: ["actions"] };

export function ToBeTable({ items, onEdit, onDelete, emptyMessage = "TO-BE 업무가 없습니다. AS-IS에서 초안 만들기로 시작하세요." }: ToBeActions & { items: ToBeItem[]; emptyMessage?: string }) {
  const columns = useMemo(() => createToBeColumns({ onEdit, onDelete }), [onEdit, onDelete]);
  return (
    <div className="h-[min(680px,72dvh)] min-h-80 min-w-0 rounded-xl border border-border dark:border-border-dark bg-background-white dark:bg-surface-dark">
      <WbsDataGrid data={items} columns={columns} getRowId={getRowId} defaultPinnedColumns={pinnedColumns} emptyMessage={emptyMessage} />
    </div>
  );
}
