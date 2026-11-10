/**
 * @file src/app/dashboard/field-issues/components/fieldIssueColumns.tsx
 * @description 이슈사항관리의 13개 컬럼과 기존 편집·상태·이관 동작입니다.
 * 초보자 가이드:
 * - 상태는 원본 Enum으로 비교하고 기존 레거시 상태도 유지합니다.
 * - 긴 설명과 해결방안은 기존 툴팁으로 전체 내용을 확인합니다.
 */
import type { ColumnDef } from "@tanstack/react-table";
import { Icon } from "@/components/ui";
import { HoverTooltip } from "@/components/common";
import { STATUS_CONFIG, type FieldIssue, type FieldIssueStatus } from "../types";

export interface FieldIssueActions {
  onEdit: (issue: FieldIssue) => void;
  onDelete: (issue: FieldIssue) => void;
  onStatusChange: (id: string, status: FieldIssueStatus) => void;
  onTransferToDiscussion?: (issue: FieldIssue) => void;
}

type TextField = "code" | "category" | "title" | "description" | "issuer" | "assignee" | "proposedSolution" | "finalSolution";

function textColumn(accessorKey: TextField, header: string, size: number, tooltip = false): ColumnDef<FieldIssue, unknown> {
  return { accessorKey, header, size, minSize: 90, meta: { filterPlaceholder: `${header} 검색` },
    cell: ({ row, getValue, column }) => {
      const text = String(getValue() ?? "");
      const isTitle = accessorKey === "title";
      const content = <span style={{ maxWidth: Math.max(50, column.getSize() - 24) }}
        className={`block truncate ${isTitle ? "font-medium" : "text-text-secondary"} ${isTitle && row.original.status === "COMPLETED" ? "line-through text-text-secondary" : ""}`}
        title={tooltip ? undefined : text}>{text || "-"}</span>;
      return tooltip ? <HoverTooltip label={header} content={text} enabled={Boolean(text)} strong={isTitle}>{content}</HoverTooltip> : content;
    } };
}

function dateColumn(accessorKey: "registeredDate" | "targetDate" | "completedDate", header: string): ColumnDef<FieldIssue, unknown> {
  return { accessorKey, header, size: 110, minSize: 100, meta: { filterType: "date", align: "center" },
    cell: ({ getValue }) => {
      const value = getValue() as string | null | undefined;
      const date = value ? new Date(value) : null;
      return <span title={value ?? ""}>{date && !Number.isNaN(date.getTime()) ? `${date.getMonth() + 1}/${date.getDate()}` : "-"}</span>;
    } };
}

export function createFieldIssueColumns(actions: FieldIssueActions): ColumnDef<FieldIssue, unknown>[] {
  return [
    { id: "actions", header: "수정", size: 105, minSize: 100, enableSorting: false, meta: { filterType: "none" },
      cell: ({ row }) => {
        const issue = row.original;
        return <div className="flex items-center gap-0.5">
          <button type="button" onClick={() => actions.onEdit(issue)} title="수정" aria-label={`${issue.code} 수정`}
            className="size-6 rounded flex items-center justify-center text-text-secondary hover:text-primary hover:bg-primary/10 focus-visible:ring-2 focus-visible:ring-primary"><Icon name="edit" size="xs" /></button>
          <button type="button" onClick={() => actions.onDelete(issue)} title="삭제" aria-label={`${issue.code} 삭제`}
            className="size-6 rounded flex items-center justify-center text-text-secondary hover:text-error hover:bg-error/10 focus-visible:ring-2 focus-visible:ring-primary"><Icon name="delete" size="xs" /></button>
          {actions.onTransferToDiscussion && <button type="button" onClick={() => actions.onTransferToDiscussion?.(issue)}
            title="협의요청으로 이관" aria-label={`${issue.code} 협의요청으로 이관`}
            className="size-6 rounded flex items-center justify-center text-text-secondary hover:text-yellow-500 hover:bg-yellow-500/10 focus-visible:ring-2 focus-visible:ring-primary"><Icon name="forum" size="xs" /></button>}
        </div>;
      } },
    { accessorKey: "status", header: "상태", size: 130, minSize: 115,
      meta: { filterType: "select", filterPlaceholder: "상태 전체",
        filterOptions: Object.entries(STATUS_CONFIG).map(([value, config]) => ({ value, label: config.label })) },
      cell: ({ row }) => {
        const issue = row.original;
        const config = STATUS_CONFIG[issue.status] ?? STATUS_CONFIG.OPEN;
        return <select value={issue.status} aria-label={`${issue.code} 상태`}
          onChange={event => actions.onStatusChange(issue.id, event.target.value as FieldIssueStatus)}
          className={`w-full px-2 py-1 rounded-md text-xs font-medium focus:ring-2 focus:ring-primary ${config.bgColor} ${config.color}`}>
          {Object.entries(STATUS_CONFIG).map(([value, option]) =>
            <option key={value} value={value} className="bg-background-white dark:bg-surface-dark text-text">{option.label}</option>)}
        </select>;
      } },
    textColumn("code", "이슈번호", 130), textColumn("category", "업무", 100),
    textColumn("title", "이슈관리명", 220, true), textColumn("description", "이슈 설명", 280, true),
    dateColumn("registeredDate", "등록일"), textColumn("issuer", "이슈어", 120), textColumn("assignee", "담당자", 120),
    dateColumn("targetDate", "타겟일"), dateColumn("completedDate", "완료일"),
    textColumn("proposedSolution", "제안된 해결방안", 240, true), textColumn("finalSolution", "최종 적용방안", 240, true),
  ];
}
