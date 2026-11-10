/**
 * @file src/app/dashboard/to-be/components/traceColumns.tsx
 * @description TO-BE 추적표(AS-IS → TO-BE → SFR → WBS) 공용 그리드 컬럼입니다.
 * 초보자 가이드:
 * - 한 줄 = TO-BE 업무 하나. TO-BE 가 없는 AS-IS 는 "(TO-BE 없음)" 줄로 맨 뒤에 나온다
 * - 목록 칸(AS-IS · SFR · WBS)은 코드만 보여 주고, 마우스를 올리면 이름 · 진행까지 보여 준다
 * - SFR 적용 = 연결 SFR 의 세부 기능(L4) 적용 수 합계, WBS 진척 = 연결 WBS 진척률 평균
 * - 비었을 때 "미연결" 경고는 구현 대상(유지 · 폐지 제외)에만 보인다
 */
import type { ColumnDef } from "@tanstack/react-table";
import Link from "next/link";
import { HoverTooltip } from "@/components/common";
import { Icon } from "@/components/ui";
import type { ToBeAnalysis } from "@/lib/api";
import { CHANGE_TYPE_CONFIG, STATUS_CONFIG, WBS_STATUS_LABEL } from "../types";

export type TraceRow = ToBeAnalysis["trace"][number];

function listCell(header: string, codes: string[], lines: string[], width: number) {
  return (
    <HoverTooltip label={header} content={lines.join("\n")} enabled={lines.length > 0}>
      <span className="block truncate tabular-nums" style={{ maxWidth: width - 24 }}>{codes.join(", ")}</span>
    </HoverTooltip>
  );
}

const empty = (r: TraceRow) =>
  r.toBe?.needsImplementation ? <span className="text-warning text-xs">미연결</span> : <span className="text-text-secondary text-xs">-</span>;

function badge(c: { label: string; className: string; icon: string }) {
  return <span className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs ${c.className}`}><Icon name={c.icon} size="xs" />{c.label}</span>;
}

export const sfrSum = (r: TraceRow) => r.sfr.reduce((s, f) => ({ applied: s.applied + f.applied, total: s.total + f.total, verified: s.verified + f.verified }), { applied: 0, total: 0, verified: 0 });
export const wbsAvg = (r: TraceRow) => (r.wbs.length ? Math.round(r.wbs.reduce((s, w) => s + w.progress, 0) / r.wbs.length) : null);

export const traceColumns: ColumnDef<TraceRow, unknown>[] = [
  { id: "asIs", header: "AS-IS", size: 190, accessorFn: (r) => r.asIs.map((a) => `${a.no ?? ""} ${a.taskName}`).join(", "), meta: { filterPlaceholder: "AS-IS 검색" },
    cell: ({ row }) => row.original.asIs.length
      ? listCell("AS-IS", row.original.asIs.map((a) => a.no ?? a.taskName), row.original.asIs.map((a) => `${a.no ?? ""} ${a.taskName}`.trim()), 190)
      : <span className="text-text-secondary text-xs">-</span> },
  { id: "toBeNo", header: "TO-BE 번호", size: 110, accessorFn: (r) => r.toBe?.no ?? "(TO-BE 없음)", meta: { filterPlaceholder: "번호 검색" },
    cell: ({ row }) => row.original.toBe
      ? <Link href={`/dashboard/to-be/${row.original.toBe.id}`} className="tabular-nums font-semibold text-primary hover:underline">{row.original.toBe.no}</Link>
      : <span className="text-warning text-xs">TO-BE 없음</span> },
  { id: "toBeName", header: "TO-BE 업무명", size: 220, accessorFn: (r) => r.toBe?.taskName ?? "", meta: { filterPlaceholder: "업무명 검색" },
    cell: ({ row }) => (
      <HoverTooltip label="TO-BE 업무명" content={row.original.toBe?.taskName ?? ""} enabled={!!row.original.toBe}>
        <span className="block truncate" style={{ maxWidth: 196 }}>{row.original.toBe?.taskName ?? (row.original.asIs[0]?.taskName ?? "")}</span>
      </HoverTooltip>
    ) },
  { id: "changeType", header: "변화 유형", size: 100, accessorFn: (r) => (r.toBe ? CHANGE_TYPE_CONFIG[r.toBe.changeType].label : ""),
    meta: { filterType: "select", filterOptions: Object.values(CHANGE_TYPE_CONFIG).map((c) => ({ value: c.label, label: c.label })) },
    cell: ({ row }) => (row.original.toBe ? badge(CHANGE_TYPE_CONFIG[row.original.toBe.changeType]) : null) },
  { id: "status", header: "상태", size: 96, accessorFn: (r) => (r.toBe ? STATUS_CONFIG[r.toBe.status].label : ""),
    meta: { filterType: "select", filterOptions: Object.values(STATUS_CONFIG).map((c) => ({ value: c.label, label: c.label })) },
    cell: ({ row }) => (row.original.toBe ? badge(STATUS_CONFIG[row.original.toBe.status]) : null) },
  { id: "sfr", header: "SFR", size: 190, accessorFn: (r) => r.sfr.map((f) => f.code).join(", "), meta: { filterPlaceholder: "SFR 검색" },
    cell: ({ row }) => row.original.sfr.length
      ? listCell("SFR", row.original.sfr.map((f) => f.code), row.original.sfr.map((f) => `${f.code} ${f.label} · ${f.total ? `적용 ${f.applied}/${f.total} · 검증 ${f.verified}` : "기능추적표에 없음"}`), 190)
      : empty(row.original) },
  { id: "sfrApplied", header: "SFR 적용", size: 120, enableSorting: false, meta: { filterType: "none" }, accessorFn: (r) => sfrSum(r).applied,
    cell: ({ row }) => {
      const s = sfrSum(row.original);
      return s.total ? <span className="tabular-nums text-xs">{s.applied}/{s.total} · 검증 {s.verified}</span> : <span className="text-text-secondary text-xs">-</span>;
    } },
  { id: "wbs", header: "WBS", size: 170, accessorFn: (r) => r.wbs.map((w) => w.code).join(", "), meta: { filterPlaceholder: "WBS 검색", align: "left" },
    cell: ({ row }) => row.original.wbs.length
      ? listCell("WBS", row.original.wbs.map((w) => w.code), row.original.wbs.map((w) => `${w.code} ${w.name} · ${WBS_STATUS_LABEL[w.status] ?? w.status} ${w.progress}%`), 170)
      : empty(row.original) },
  { id: "wbsProgress", header: "WBS 진척", size: 100, meta: { filterType: "none" }, accessorFn: (r) => wbsAvg(r) ?? -1,
    cell: ({ row }) => {
      const avg = wbsAvg(row.original);
      return avg === null ? <span className="text-text-secondary text-xs">-</span> : <span className="tabular-nums text-xs">평균 {avg}%</span>;
    } },
];
