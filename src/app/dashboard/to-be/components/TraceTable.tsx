/**
 * @file src/app/dashboard/to-be/components/TraceTable.tsx
 * @description TO-BE 추적표 탭 (3단계): AS-IS → TO-BE → SFR → WBS 한 줄 추적 + 엑셀 다운로드.
 * 초보자 가이드:
 * - 그리드는 공용 WbsDataGrid. 칸 정의는 traceColumns.tsx
 * - 엑셀은 서버(/api/to-be/trace/export)가 같은 행으로 만든다 (로그인 쿠키로 바로 내려받음)
 */
"use client";

import { WbsDataGrid } from "@/components/data-grid/WbsDataGrid";
import { Button } from "@/components/ui";
import { traceColumns, type TraceRow } from "./traceColumns";

const getRowId = (row: TraceRow) => row.key;
const pinnedColumns = { left: ["asIs"] };

export function TraceTable({ projectId, rows }: { projectId: string; rows: TraceRow[] }) {
  const download = () => { window.location.href = `/api/to-be/trace/export?projectId=${encodeURIComponent(projectId)}`; };
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-text-secondary">TO-BE 업무 한 줄에 연결 AS-IS · 기능추적표 SFR(적용 진행) · WBS(상태 · 진척률)를 모았습니다.</p>
        <Button variant="outline" leftIcon="download" onClick={download} disabled={rows.length === 0}>엑셀 다운로드</Button>
      </div>
      <div className="h-[min(680px,72dvh)] min-h-80 min-w-0 rounded-xl border border-border dark:border-border-dark bg-background-white dark:bg-surface-dark">
        <WbsDataGrid data={rows} columns={traceColumns} getRowId={getRowId} defaultPinnedColumns={pinnedColumns} emptyMessage="추적할 AS-IS · TO-BE 업무가 없습니다." />
      </div>
    </div>
  );
}
