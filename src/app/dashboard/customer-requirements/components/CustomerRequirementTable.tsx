/**
 * @file src/app/dashboard/customer-requirements/components/CustomerRequirementTable.tsx
 * @description 요구사항관리를 공용 jisung-ui DataGrid로 표시합니다.
 * 초보자 가이드:
 * - 전체 필터 결과를 전달하면 정렬·컬럼 필터·페이지 이동을 그리드가 처리합니다.
 * - 수정·삭제·상태 변경·협의요청 이관은 기존 부모 콜백으로 연결합니다.
 */
"use client";

import { useMemo } from "react";
import { WbsDataGrid } from "@/components/data-grid/WbsDataGrid";
import type { CustomerRequirement } from "../types";
import { createCustomerRequirementColumns, type CustomerRequirementActions } from "./customerRequirementColumns";

interface CustomerRequirementTableProps extends CustomerRequirementActions {
  requirements: CustomerRequirement[];
  emptyMessage?: string;
}

const getRowId = (requirement: CustomerRequirement) => requirement.id;
const pinnedColumns = { left: ["actions"] };

export function CustomerRequirementTable({ requirements, emptyMessage = "등록된 고객요구사항이 없습니다.",
  onEdit, onDelete, onStatusChange, onTransferToDiscussion }: CustomerRequirementTableProps) {
  const columns = useMemo(() => createCustomerRequirementColumns({ onEdit, onDelete, onStatusChange, onTransferToDiscussion }),
    [onEdit, onDelete, onStatusChange, onTransferToDiscussion]);

  return <div className="h-[min(640px,70dvh)] min-h-80 min-w-0 rounded-xl border border-border dark:border-border-dark bg-background-white dark:bg-surface-dark">
    <WbsDataGrid data={requirements} columns={columns} getRowId={getRowId}
      defaultPinnedColumns={pinnedColumns} emptyMessage={emptyMessage} />
  </div>;
}
