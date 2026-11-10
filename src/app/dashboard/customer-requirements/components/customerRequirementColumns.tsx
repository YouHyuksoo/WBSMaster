/**
 * @file src/app/dashboard/customer-requirements/components/customerRequirementColumns.tsx
 * @description 요구사항관리 DataGrid의 12개 컬럼과 기존 업무 동작을 정의합니다.
 * 초보자 가이드:
 * - 상태는 원본 Enum 값으로 필터링하고 셀에서는 한글로 표시합니다.
 * - 긴 문구는 기존 HoverTooltip으로 전체 내용을 확인합니다.
 */
import type { ColumnDef } from "@tanstack/react-table";
import { Icon } from "@/components/ui";
import { HoverTooltip } from "@/components/common";
import { APPLY_STATUS_CONFIG, type ApplyStatus, type CustomerRequirement } from "../types";

export interface CustomerRequirementActions {
  onEdit: (requirement: CustomerRequirement) => void;
  onDelete: (requirement: CustomerRequirement) => void;
  onStatusChange: (id: string, status: ApplyStatus) => void;
  onTransferToDiscussion?: (requirement: CustomerRequirement) => void;
}

type TextField = "code" | "category" | "functionName" | "content" | "solution" | "requester" | "remarks" | "toBeCode";

function textColumn(accessorKey: TextField, header: string, size: number, tooltip = false): ColumnDef<CustomerRequirement, unknown> {
  return { accessorKey, header, size, minSize: 90,
    meta: { filterPlaceholder: `${header} 검색` },
    cell: ({ row, getValue, column }) => {
      const text = String(getValue() ?? "");
      const isFunction = accessorKey === "functionName";
      const inactive = ["REJECTED", "HOLD"].includes(row.original.applyStatus);
      const content = <span style={{ maxWidth: Math.max(50, column.getSize() - 24) }}
        className={`block truncate ${isFunction ? "font-medium" : "text-text-secondary"} ${isFunction && inactive ? "line-through text-text-secondary" : ""}`} title={tooltip ? undefined : text}>
        {text || "-"}
      </span>;
      return tooltip ? <HoverTooltip label={header} content={text} enabled={Boolean(text)} strong={isFunction}>
        {content}
      </HoverTooltip> : content;
    },
  };
}

function dateColumn(accessorKey: "requestDate" | "completeDate", header: string): ColumnDef<CustomerRequirement, unknown> {
  return { accessorKey, header, size: 110, minSize: 100,
    meta: { filterType: "date", align: "center" },
    cell: ({ getValue }) => {
      const value = getValue() as string | null | undefined;
      const date = value ? new Date(value) : null;
      return <span title={value ?? ""}>{date && !Number.isNaN(date.getTime()) ? `${date.getMonth() + 1}/${date.getDate()}` : "-"}</span>;
    },
  };
}

export function createCustomerRequirementColumns(actions: CustomerRequirementActions): ColumnDef<CustomerRequirement, unknown>[] {
  return [
    { id: "actions", header: "액션", size: 105, minSize: 100, enableSorting: false,
      meta: { filterType: "none" },
      cell: ({ row }) => {
        const requirement = row.original;
        return <div className="flex items-center gap-0.5">
          <button type="button" onClick={() => actions.onEdit(requirement)} title="수정"
            aria-label={`${requirement.code} 수정`}
            className="size-6 rounded flex items-center justify-center text-text-secondary hover:bg-primary/10 hover:text-primary focus-visible:ring-2 focus-visible:ring-primary">
            <Icon name="edit" size="xs" />
          </button>
          <button type="button" onClick={() => actions.onDelete(requirement)} title="삭제"
            aria-label={`${requirement.code} 삭제`}
            className="size-6 rounded flex items-center justify-center text-text-secondary hover:bg-error/10 hover:text-error focus-visible:ring-2 focus-visible:ring-primary">
            <Icon name="delete" size="xs" />
          </button>
          {actions.onTransferToDiscussion && <button type="button" onClick={() => actions.onTransferToDiscussion?.(requirement)}
            title="협의요청으로 이관" aria-label={`${requirement.code} 협의요청으로 이관`}
            className="size-6 rounded flex items-center justify-center text-text-secondary hover:bg-yellow-500/10 hover:text-yellow-500 focus-visible:ring-2 focus-visible:ring-primary">
            <Icon name="forum" size="xs" />
          </button>}
        </div>;
      },
    },
    { accessorKey: "applyStatus", header: "상태", size: 125, minSize: 110,
      meta: { filterType: "select", filterPlaceholder: "상태 전체",
        filterOptions: Object.entries(APPLY_STATUS_CONFIG).map(([value, config]) => ({ value, label: config.label })) },
      cell: ({ row }) => {
        const requirement = row.original;
        const config = APPLY_STATUS_CONFIG[requirement.applyStatus] ?? APPLY_STATUS_CONFIG.REVIEWING;
        return <select value={requirement.applyStatus} aria-label={`${requirement.code} 상태`}
          onChange={event => actions.onStatusChange(requirement.id, event.target.value as ApplyStatus)}
          className={`w-full px-2 py-1 rounded-md text-xs font-medium focus:ring-2 focus:ring-primary ${config.bgColor} ${config.color}`}>
          {Object.entries(APPLY_STATUS_CONFIG).map(([value, option]) =>
            <option key={value} value={value} className="bg-background-white dark:bg-surface-dark text-text">{option.label}</option>)}
        </select>;
      },
    },
    textColumn("code", "요구번호", 130),
    textColumn("category", "업무구분", 100),
    textColumn("functionName", "기능명", 180, true),
    textColumn("content", "요구사항", 280, true),
    textColumn("solution", "적용방안", 220, true),
    dateColumn("requestDate", "요청일"),
    dateColumn("completeDate", "처리완료일"),
    textColumn("requester", "요청자", 110),
    textColumn("remarks", "제약사항", 180, true),
    textColumn("toBeCode", "To-Be", 130),
  ];
}
