/**
 * @file src/app/dashboard/as-is-analysis/components/OverviewGrid.tsx
 * @description AS-IS 총괄표의 공용 그리드와 단위업무·편집 버튼입니다.
 * 초보자 가이드:
 * - 분류는 각 행에 표시해 정렬·페이지 이동 뒤에도 식별할 수 있습니다.
 * - 추가·수정·삭제 모달은 OverviewTable이 관리합니다.
 */
"use client";
import { useMemo } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { WbsDataGrid } from "@/components/data-grid/WbsDataGrid";
import { Icon } from "@/components/ui";
import { HoverTooltip } from "@/components/common";
import { MAJOR_CATEGORIES, CURRENT_METHODS } from "../constants";
import type { AsIsOverviewItem } from "../types";

interface OverviewGridProps {
  items: AsIsOverviewItem[];
  selectedItem: AsIsOverviewItem | null;
  onSelectItem: (item: AsIsOverviewItem) => void;
  onEdit: (item: AsIsOverviewItem) => void;
  onDelete: (item: AsIsOverviewItem) => void;
}

type TextKey = "asIsManagementNo" | "middleCategory" | "taskName" | "details" | "issueSummary";
function textColumn(accessorKey: TextKey, header: string, size = 200): ColumnDef<AsIsOverviewItem, unknown> {
  return { accessorKey, header, size, minSize: 100, meta: { filterPlaceholder: `${header} 검색` },
    cell: ({ getValue, column }) => { const text = String(getValue() ?? "");
      return <HoverTooltip label={header} content={text} enabled={Boolean(text)}>
        <span className="block truncate" style={{ maxWidth: column.getSize() - 24 }}>{text || "-"}</span>
      </HoverTooltip>; } };
}

const getRowId = (item: AsIsOverviewItem) => item.id;
const pinnedColumns = { left: ["asIsManagementNo"] };

export function OverviewGrid({ items, selectedItem, onSelectItem, onEdit, onDelete }: OverviewGridProps) {
  const columns = useMemo<ColumnDef<AsIsOverviewItem, unknown>[]>(() => [
    textColumn("asIsManagementNo", "관리번호", 130),
    { accessorKey: "majorCategory", header: "대분류", size: 140,
      meta: { filterType: "select", filterOptions: Object.entries(MAJOR_CATEGORIES).map(([value, config]) => ({ value, label: config.label })) },
      cell: ({ row }) => { const config = MAJOR_CATEGORIES[row.original.majorCategory];
        return <span className={`inline-flex items-center gap-1 rounded-md px-2 py-1 ${config.bgColor} ${config.color}`}><Icon name={config.icon} size="xs" />{config.label}</span>; } },
    textColumn("middleCategory", "중분류", 160), textColumn("taskName", "업무명", 240),
    { accessorKey: "currentMethod", header: "현행방식", size: 130,
      meta: { filterType: "select", filterOptions: Object.entries(CURRENT_METHODS).map(([value, config]) => ({ value, label: config.label })) },
      cell: ({ row }) => { const config = CURRENT_METHODS[row.original.currentMethod];
        return <span className={`inline-flex items-center gap-1 rounded-md px-2 py-1 ${config.bgColor} ${config.color}`}><Icon name={config.icon} size="xs" />{config.label}</span>; } },
    textColumn("details", "세부내용", 240), textColumn("issueSummary", "이슈 요약", 240),
    { id: "analysis", header: "분석", size: 70, minSize: 65, enableSorting: false, meta: { filterType: "none" },
      cell: ({ row }) => <button type="button" onClick={() => onSelectItem(row.original)} title="단위업무 분석"
        aria-label={`${row.original.asIsManagementNo || row.original.taskName} 분석`} className="size-7 rounded text-primary focus-visible:ring-2 focus-visible:ring-primary">
        <Icon name={row.original.unitAnalysis ? "check" : "arrow_forward"} size="xs" />
      </button> },
    { id: "edit", header: "수정", size: 70, minSize: 65, enableSorting: false, meta: { filterType: "none" },
      cell: ({ row }) => <button type="button" onClick={() => onEdit(row.original)} title="수정"
        aria-label={`${row.original.asIsManagementNo || row.original.taskName} 수정`} className="size-7 rounded text-primary focus-visible:ring-2 focus-visible:ring-primary"><Icon name="edit" size="xs" /></button> },
    { id: "delete", header: "삭제", size: 70, minSize: 65, enableSorting: false, meta: { filterType: "none" },
      cell: ({ row }) => <button type="button" onClick={() => onDelete(row.original)} title="삭제"
        aria-label={`${row.original.asIsManagementNo || row.original.taskName} 삭제`} className="size-7 rounded text-error focus-visible:ring-2 focus-visible:ring-primary"><Icon name="delete" size="xs" /></button> },
  ], [onSelectItem, onEdit, onDelete]);

  return <div className="h-[min(640px,70dvh)] min-h-80 min-w-0 rounded-xl border border-border dark:border-border-dark bg-background-white dark:bg-surface-dark">
    <WbsDataGrid data={items} columns={columns} getRowId={getRowId} selectedRowId={selectedItem?.id}
      defaultPinnedColumns={pinnedColumns} emptyMessage="등록된 업무가 없습니다." />
  </div>;
}
