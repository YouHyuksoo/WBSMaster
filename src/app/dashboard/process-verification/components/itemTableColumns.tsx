/**
 * @file src/app/dashboard/process-verification/components/itemTableColumns.tsx
 * @description 기능추적표의 jisung-ui 컬럼과 기존 편집 동작을 연결합니다.
 * 초보자 가이드:
 * - 일반 값은 accessorKey, 적용·상태는 accessorFn으로 정렬·필터 값을 제공합니다.
 * - 저장은 부모의 기존 onApplyChange를 사용합니다.
 */
import type { ColumnDef } from "@tanstack/react-table";
import { Icon } from "@/components/ui";
import {
  getMasterApply, verificationStatusConfig,
  type ProcessVerificationMaster, type VerificationStatus,
} from "../types";

export interface ApplyChange {
  isApplied?: boolean;
  status?: VerificationStatus;
}

export interface ItemTableActions {
  onApplyChange: (masterId: string, change: ApplyChange) => Promise<void>;
  onEditItem?: (item: ProcessVerificationMaster) => void;
  onDeleteItem?: (item: ProcessVerificationMaster) => void;
}

type TextField = "managementCode" | "category" | "managementArea" | "detailItem" |
  "verificationDetail" | "acceptanceStatus" | "mesMapping" | "asIsCode" | "toBeCode";

function textColumn(accessorKey: TextField, header: string, size: number): ColumnDef<ProcessVerificationMaster, unknown> {
  return { accessorKey, header, size, minSize: 80, meta: { filterPlaceholder: `${header} 검색` },
    cell: ({ getValue }) => {
      const text = String(getValue() ?? "");
      return <span className="block truncate" title={text}>{text || "-"}</span>;
    },
  };
}

export function createItemTableColumns(actions: ItemTableActions): ColumnDef<ProcessVerificationMaster, unknown>[] {
  return [
    { id: "actions", header: "작업", size: 80, minSize: 80, enableSorting: false,
      meta: { filterType: "none" },
      cell: ({ row }) => <div className="flex items-center gap-1">
        <button type="button" onClick={() => actions.onEditItem?.(row.original)}
          aria-label={`${row.original.managementCode} 수정`} title="수정"
          className="size-7 rounded-lg flex items-center justify-center text-text-secondary hover:text-primary hover:bg-primary/10 focus-visible:ring-2 focus-visible:ring-primary">
          <Icon name="edit" size="xs" />
        </button>
        <button type="button" onClick={() => actions.onDeleteItem?.(row.original)}
          aria-label={`${row.original.managementCode} 삭제`} title="삭제"
          className="size-7 rounded-lg flex items-center justify-center text-text-secondary hover:text-error hover:bg-error/10 focus-visible:ring-2 focus-visible:ring-primary">
          <Icon name="delete" size="xs" />
        </button>
      </div>,
    },
    { accessorKey: "productType", header: "제품유형", size: 90, meta: { filterType: "select" } },
    textColumn("managementCode", "관리코드", 120),
    // 개발범위(요약) 연결 번호를 바로 보이게 관리코드 옆에 둔다 (2026-11-10)
    textColumn("asIsCode", "AS-IS 관리번호", 150),
    textColumn("category", "구분", 100),
    textColumn("managementArea", "관리영역", 140),
    textColumn("detailItem", "세부항목", 160),
    textColumn("verificationDetail", "세부검증", 220),
    { id: "isApplied", header: "적용", size: 80,
      accessorFn: item => getMasterApply(item)?.isApplied ? "적용" : "미적용",
      meta: { filterType: "select", align: "center", filterPlaceholder: "적용 여부 전체",
        filterOptions: ["적용", "미적용"].map(value => ({ value, label: value })) },
      cell: ({ row }) => {
        const item = row.original;
        const checked = getMasterApply(item)?.isApplied ?? false;
        return <input type="checkbox" checked={checked}
          onChange={event => void actions.onApplyChange(item.id, { isApplied: event.target.checked })}
          aria-label={`${item.managementCode} 적용`} className="size-4 accent-primary cursor-pointer" />;
      },
    },
    { id: "status", header: "상태", size: 130,
      accessorFn: item => verificationStatusConfig[getMasterApply(item)?.status ?? "PENDING"].label,
      meta: { filterType: "select", filterPlaceholder: "검증 상태 전체",
        filterOptions: Object.values(verificationStatusConfig).map(({ label }) => ({ value: label, label })) },
      cell: ({ row }) => {
        const item = row.original;
        const status = getMasterApply(item)?.status ?? "PENDING";
        const config = verificationStatusConfig[status];
        return <select value={status} aria-label={`${item.managementCode} 검증 상태`}
          onChange={event => void actions.onApplyChange(item.id, { status: event.target.value as VerificationStatus })}
          className={`w-full px-2 py-1 rounded-md text-xs border border-transparent focus:ring-2 focus:ring-primary ${config.bgColor} ${config.color}`}>
          {Object.entries(verificationStatusConfig).map(([value, option]) =>
            <option key={value} value={value} className="bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100">{option.label}</option>)}
        </select>;
      },
    },
    textColumn("acceptanceStatus", "수용여부", 180),
    textColumn("mesMapping", "MES/IT 매핑", 140),
    { id: "existingMes", header: "기존MES", size: 90,
      accessorFn: item => item.existingMes ? "Y" : "N", meta: { filterType: "select", align: "center",
        filterOptions: ["Y", "N"].map(value => ({ value, label: value })) } },
    textColumn("toBeCode", "TO-BE 관리번호", 140),
  ];
}
