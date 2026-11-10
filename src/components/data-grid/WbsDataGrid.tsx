/**
 * @file src/components/data-grid/WbsDataGrid.tsx
 * @description jisung-ui DataGrid의 WBS 공통 기본 설정입니다.
 * 초보자 가이드:
 * - 화면마다 data·columns·고유 행 ID를 전달합니다.
 * - 전역 테마 대신 기존 WBS 색상 토큰을 사용합니다.
 */
"use client";

import DataGrid, { type DataGridProps } from "@jisung/ui/data-grid";
import { useMemo } from "react";
import { createInstance } from "i18next";
import { I18nextProvider } from "react-i18next";

const gridI18n = createInstance();
void gridI18n.init({ lng: "ko", fallbackLng: "ko", initAsync: false, resources: { ko: { translation: {} } },
  interpolation: { escapeValue: false } });

export function WbsDataGrid<T>(props: DataGridProps<T>) {
  // 선택형 필터는 "적용"에 "미적용"이 섞이지 않도록 정확히 비교한다.
  const columns = useMemo(() => props.columns.map(column =>
    column.meta?.filterType === "select" && !column.filterFn
      ? { ...column, filterFn: "equalsString" as const } : column), [props.columns]);
  return (
    <I18nextProvider i18n={gridI18n}>
      <div className="h-full min-h-0 min-w-0 p-3" data-wbs-data-grid>
        <DataGrid pageSize={20} enableColumnResizing enableColumnReordering
          enableColumnFilter enableColumnPinning showColumnBorder enableFullscreen
          enableExport={false} {...props} columns={columns} />
      </div>
    </I18nextProvider>
  );
}
