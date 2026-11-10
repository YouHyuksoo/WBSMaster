/**
 * @file src/app/dashboard/process-verification/components/ItemTable.tsx
 * @description 기능추적표를 공용 jisung-ui DataGrid로 표시합니다.
 * 초보자 가이드:
 * - 정렬·컬럼 필터·너비·순서·페이지 이동은 공용 그리드가 처리합니다.
 * - 적용·상태·수정·삭제는 기존 부모 콜백으로 전달합니다.
 */
"use client";

import { useMemo } from "react";
import { WbsDataGrid } from "@/components/data-grid/WbsDataGrid";
import type { ProcessVerificationMaster } from "../types";
import { createItemTableColumns, type ItemTableActions } from "./itemTableColumns";

export type { ApplyChange } from "./itemTableColumns";

interface ItemTableProps extends ItemTableActions {
  items: ProcessVerificationMaster[];
  isLoading?: boolean;
}

const getRowId = (item: ProcessVerificationMaster) => item.id;
const pinnedColumns = { left: ["actions"] };

export default function ItemTable({ items, isLoading, onApplyChange, onEditItem, onDeleteItem }: ItemTableProps) {
  const columns = useMemo(() => createItemTableColumns({ onApplyChange, onEditItem, onDeleteItem }),
    [onApplyChange, onEditItem, onDeleteItem]);

  return <WbsDataGrid data={items} columns={columns} getRowId={getRowId}
    isLoading={isLoading} emptyMessage="항목이 없습니다."
    defaultPinnedColumns={pinnedColumns} />;
}
