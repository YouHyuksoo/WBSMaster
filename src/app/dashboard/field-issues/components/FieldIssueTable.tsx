/**
 * @file src/app/dashboard/field-issues/components/FieldIssueTable.tsx
 * @description 이슈사항관리를 공용 jisung-ui DataGrid로 표시합니다.
 * 초보자 가이드:
 * - 전체 필터 결과를 넘기며 그리드가 정렬·검색·페이지 이동을 처리합니다.
 * - 수정·삭제·상태 변경·협의요청 이관은 기존 부모 콜백을 사용합니다.
 */
"use client";
import { useMemo } from "react";
import { WbsDataGrid } from "@/components/data-grid/WbsDataGrid";
import type { FieldIssue } from "../types";
import { createFieldIssueColumns, type FieldIssueActions } from "./fieldIssueColumns";

interface FieldIssueTableProps extends FieldIssueActions { issues: FieldIssue[]; emptyMessage?: string }
const getRowId = (issue: FieldIssue) => issue.id;
const pinnedColumns = { left: ["actions"] };

export function FieldIssueTable({ issues, onEdit, onDelete, onStatusChange, onTransferToDiscussion,
  emptyMessage = "등록된 현업이슈가 없습니다." }: FieldIssueTableProps) {
  const columns = useMemo(() => createFieldIssueColumns({ onEdit, onDelete, onStatusChange, onTransferToDiscussion }),
    [onEdit, onDelete, onStatusChange, onTransferToDiscussion]);
  return <div className="h-[min(640px,70dvh)] min-h-80 min-w-0 rounded-xl border border-border dark:border-border-dark bg-background-white dark:bg-surface-dark">
    <WbsDataGrid data={issues} columns={columns} getRowId={getRowId} defaultPinnedColumns={pinnedColumns} emptyMessage={emptyMessage} />
  </div>;
}
