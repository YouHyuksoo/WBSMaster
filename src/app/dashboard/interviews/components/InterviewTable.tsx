/**
 * @file src/app/dashboard/interviews/components/InterviewTable.tsx
 * @description 인터뷰 목록을 jisung-ui 공용 그리드로 표시합니다.
 * 초보자 가이드:
 * - 전체 필터 결과를 전달하며 수정·삭제·이관은 부모 콜백을 사용합니다.
 */
"use client";
import { useMemo } from "react";
import { WbsDataGrid } from "@/components/data-grid/WbsDataGrid";
import type { Interview } from "../types";
import { createInterviewColumns, type InterviewActions } from "./interviewColumns";

interface InterviewTableProps extends InterviewActions { interviews: Interview[]; emptyMessage?: string }
const getRowId = (row: Interview) => row.id;
const pinnedColumns = { left: ["actions"] };

export function InterviewTable({ interviews, onEdit, onDelete, onTransfer, emptyMessage = "등록된 인터뷰가 없습니다." }: InterviewTableProps) {
  const columns = useMemo(() => createInterviewColumns({ onEdit, onDelete, onTransfer }), [onEdit, onDelete, onTransfer]);
  return <div className="h-[min(640px,70dvh)] min-h-80 min-w-0 rounded-xl border border-border dark:border-border-dark bg-background-white dark:bg-surface-dark">
    <WbsDataGrid data={interviews} columns={columns} getRowId={getRowId} defaultPinnedColumns={pinnedColumns} emptyMessage={emptyMessage} />
  </div>;
}
