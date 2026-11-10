/**
 * @file src/app/dashboard/interviews/components/interviewColumns.tsx
 * @description 인터뷰 공용 그리드의 컬럼과 편집·이관 동작입니다.
 * 초보자 가이드:
 * - 정렬·필터는 전체 목록에서 실행하고 이관된 행은 재이관을 막습니다.
 */
import type { ColumnDef } from "@tanstack/react-table";
import { Icon } from "@/components/ui";
import { HoverTooltip } from "@/components/common";
import { TRANSFER_STATUS_CONFIG, TRANSFER_TYPE_CONFIG, type Interview, type InterviewTransferType } from "../types";

export interface InterviewActions {
  onEdit: (interview: Interview) => void;
  onDelete: (interview: Interview) => void;
  onTransfer: (interview: Interview, type: InterviewTransferType) => void;
}

type TextField = "title" | "category" | "interviewer" | "interviewee" | "currentProcess" | "painPoints" | "desiredResults" | "technicalConstraints" | "questions" | "remarks";

function textColumn(accessorKey: TextField, header: string, size = 180): ColumnDef<Interview, unknown> {
  return { accessorKey, header, size, minSize: 100, meta: { filterPlaceholder: `${header} 검색` },
    cell: ({ getValue, column }) => {
      const text = String(getValue() ?? "");
      return <HoverTooltip label={header} content={text} enabled={Boolean(text)} strong={accessorKey === "title"}>
        <span className="block truncate" style={{ maxWidth: column.getSize() - 24 }}>{text || "-"}</span>
      </HoverTooltip>;
    } };
}

export function createInterviewColumns(actions: InterviewActions): ColumnDef<Interview, unknown>[] {
  return [
    { id: "actions", header: "수정", size: 80, minSize: 80, enableSorting: false, meta: { filterType: "none" },
      cell: ({ row }) => <div className="flex gap-1">
        <button type="button" onClick={() => actions.onEdit(row.original)} aria-label={`${row.original.code} 수정`} title="수정" className="size-6 text-text-secondary hover:text-primary focus-visible:ring-2 focus-visible:ring-primary"><Icon name="edit" size="xs" /></button>
        <button type="button" onClick={() => actions.onDelete(row.original)} aria-label={`${row.original.code} 삭제`} title="삭제" className="size-6 text-text-secondary hover:text-error focus-visible:ring-2 focus-visible:ring-primary"><Icon name="delete" size="xs" /></button>
      </div> },
    { accessorKey: "transferStatus", header: "이관상태", size: 120, meta: { filterType: "select",
      filterOptions: Object.entries(TRANSFER_STATUS_CONFIG).map(([value, config]) => ({ value, label: config.label })) },
      cell: ({ row }) => { const config = TRANSFER_STATUS_CONFIG[row.original.transferStatus];
        return <span className={`inline-flex items-center gap-1 rounded-md px-2 py-1 ${config.bgColor} ${config.color}`}><Icon name={config.icon} size="xs" />{config.label}</span>; } },
    textColumn("title", "제목", 240),
    { accessorKey: "interviewDate", header: "일자", size: 110, meta: { filterType: "date" },
      cell: ({ getValue }) => { const value = getValue() as string; const date = value ? new Date(value) : null;
        return <span title={value}>{date && !Number.isNaN(date.getTime()) ? `${date.getMonth() + 1}/${date.getDate()}` : "-"}</span>; } },
    textColumn("category", "업무영역", 110), textColumn("interviewer", "진행자", 110), textColumn("interviewee", "대상자", 110),
    textColumn("currentProcess", "현재방식", 240), textColumn("painPoints", "문제점", 200),
    textColumn("desiredResults", "원하는결과", 200), textColumn("technicalConstraints", "기술제약", 180),
    textColumn("questions", "궁금한점", 180), textColumn("remarks", "비고", 180),
    { id: "transfer", header: "이관", size: 150, minSize: 130, enableSorting: false, meta: { filterType: "none" },
      cell: ({ row }) => <select value="" aria-label={`${row.original.code} 이관`} disabled={row.original.transferStatus === "TRANSFERRED"}
        onChange={event => { if (event.target.value && row.original.transferStatus !== "TRANSFERRED") actions.onTransfer(row.original, event.target.value as InterviewTransferType); }}
        className="w-full rounded border border-border bg-surface p-1 text-text disabled:opacity-50 focus:ring-2 focus:ring-primary">
        <option value="">{row.original.transferStatus === "TRANSFERRED" ? "이미 이관됨" : "이관하기"}</option>
        {Object.entries(TRANSFER_TYPE_CONFIG).map(([value, config]) => <option key={value} value={value}>{config.label}</option>)}
      </select> },
  ];
}
