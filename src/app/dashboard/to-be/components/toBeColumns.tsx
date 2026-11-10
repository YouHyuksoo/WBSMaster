/**
 * @file src/app/dashboard/to-be/components/toBeColumns.tsx
 * @description TO-BE 총괄표(공용 그리드) 컬럼과 수정 · 삭제 동작입니다.
 * 초보자 가이드:
 * - 정렬 · 필터는 표시값(라벨)으로 동작하도록 accessorFn 으로 라벨을 넘긴다
 * - 연결 AS-IS · 연결 SFR · 연결 WBS 는 코드 목록을 쉼표로 보여 주고 마우스를 올리면 전체를 보여 준다
 * - SFR · WBS 가 비었을 때 "미연결" 경고는 구현 대상(유지 · 폐지 제외)에만 보인다
 */
import type { ColumnDef } from "@tanstack/react-table";
import Link from "next/link";
import { Icon } from "@/components/ui";
import { HoverTooltip } from "@/components/common";
import { CHANGE_TYPE_CONFIG, MAJOR_CATEGORIES, PRIORITY_LABEL, STATUS_CONFIG, TARGET_METHOD_CONFIG, needsImplementation, type ToBeItem } from "../types";

export interface ToBeActions {
  onEdit: (item: ToBeItem) => void;
  onDelete: (item: ToBeItem) => void;
}

function badge(config: { label: string; className: string; icon: string }) {
  return <span className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs ${config.className}`}><Icon name={config.icon} size="xs" />{config.label}</span>;
}

function longText(header: string, text: string, width: number) {
  return <HoverTooltip label={header} content={text} enabled={Boolean(text)}>
    <span className="block truncate" style={{ maxWidth: width - 24 }}>{text || "-"}</span>
  </HoverTooltip>;
}

const missing = (item: ToBeItem) => needsImplementation(item.changeType) ? <span className="text-warning text-xs">미연결</span> : <span className="text-text-secondary text-xs">-</span>;

const select = (options: Record<string, { label: string }>) => ({ filterType: "select" as const, filterOptions: Object.values(options).map((o) => ({ value: o.label, label: o.label })) });

export function createToBeColumns(actions: ToBeActions): ColumnDef<ToBeItem, unknown>[] {
  return [
    { id: "actions", header: "작업", size: 104, minSize: 104, enableSorting: false, meta: { filterType: "none" },
      cell: ({ row }) => <div className="flex gap-1">
        <Link href={`/dashboard/to-be/${row.original.id}`} aria-label={`${row.original.toBeManagementNo} 단위업무 설계`} title="단위업무 설계" className="size-6 inline-flex items-center justify-center text-text-secondary hover:text-primary focus-visible:ring-2 focus-visible:ring-primary"><Icon name="design_services" size="xs" /></Link>
        <button type="button" onClick={() => actions.onEdit(row.original)} aria-label={`${row.original.toBeManagementNo} 수정`} title="수정" className="size-6 text-text-secondary hover:text-primary focus-visible:ring-2 focus-visible:ring-primary"><Icon name="edit" size="xs" /></button>
        <button type="button" onClick={() => actions.onDelete(row.original)} aria-label={`${row.original.toBeManagementNo} 삭제`} title="삭제" className="size-6 text-text-secondary hover:text-error focus-visible:ring-2 focus-visible:ring-primary"><Icon name="delete" size="xs" /></button>
      </div> },
    { accessorKey: "toBeManagementNo", header: "TO-BE 번호", size: 110, meta: { filterPlaceholder: "번호 검색" },
      cell: ({ getValue }) => <span className="tabular-nums font-semibold">{String(getValue())}</span> },
    { id: "majorCategory", header: "대분류", size: 110, accessorFn: (r) => MAJOR_CATEGORIES[r.majorCategory as keyof typeof MAJOR_CATEGORIES]?.label ?? r.majorCategory, meta: select(MAJOR_CATEGORIES) },
    { accessorKey: "middleCategory", header: "중분류", size: 130, meta: { filterPlaceholder: "중분류 검색" } },
    { accessorKey: "taskName", header: "업무명", size: 220, meta: { filterPlaceholder: "업무명 검색" }, cell: ({ getValue }) => longText("업무명", String(getValue() ?? ""), 220) },
    { id: "changeType", header: "변화 유형", size: 110, accessorFn: (r) => CHANGE_TYPE_CONFIG[r.changeType].label, meta: select(CHANGE_TYPE_CONFIG), cell: ({ row }) => badge(CHANGE_TYPE_CONFIG[row.original.changeType]) },
    { id: "targetMethod", header: "목표 방식", size: 140, accessorFn: (r) => TARGET_METHOD_CONFIG[r.targetMethod].label, meta: select(TARGET_METHOD_CONFIG), cell: ({ row }) => badge(TARGET_METHOD_CONFIG[row.original.targetMethod]) },
    { id: "asIs", header: "연결 AS-IS", size: 160, accessorFn: (r) => r.asIsItems.map((a) => a.asIsManagementNo ?? a.taskName).join(", "),
      meta: { filterPlaceholder: "AS-IS 검색" },
      cell: ({ row }) => longText("연결 AS-IS", row.original.asIsItems.map((a) => `${a.asIsManagementNo ?? ""} ${a.taskName}`.trim()).join("\n"), 160) },
    { id: "sfr", header: "연결 SFR", size: 150, accessorFn: (r) => r.sfrCodes.join(", "), meta: { filterPlaceholder: "SFR 검색" },
      cell: ({ row }) => row.original.sfrCodes.length ? longText("연결 SFR", row.original.sfrCodes.join(", "), 150) : missing(row.original) },
    { id: "wbs", header: "연결 WBS", size: 130, accessorFn: (r) => r.wbsItems.map((w) => w.code).join(", "), meta: { filterPlaceholder: "WBS 검색", align: "left" },
      cell: ({ row }) => row.original.wbsItems.length
        ? <HoverTooltip label="연결 WBS" content={row.original.wbsItems.map((w) => `${w.code} ${w.name}`).join("\n")}><span className="block truncate tabular-nums" style={{ maxWidth: 106 }}>{row.original.wbsItems.map((w) => w.code).join(", ")}</span></HoverTooltip>
        : missing(row.original) },
    { accessorKey: "summary", header: "개선 요약", size: 260, meta: { filterPlaceholder: "개선 요약 검색" }, cell: ({ getValue }) => longText("개선 요약", String(getValue() ?? ""), 260) },
    { id: "priority", header: "우선순위", size: 90, accessorFn: (r) => (r.priority ? PRIORITY_LABEL[r.priority] : "-"),
      meta: { filterType: "select", filterOptions: Object.values(PRIORITY_LABEL).map((l) => ({ value: l, label: l })) } },
    { id: "status", header: "상태", size: 100, accessorFn: (r) => STATUS_CONFIG[r.status].label, meta: select(STATUS_CONFIG), cell: ({ row }) => badge(STATUS_CONFIG[row.original.status]) },
  ];
}
