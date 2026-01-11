/**
 * @file src/app/dashboard/customer-requirements/components/FilterBar.tsx
 * @description
 * 고객요구사항 필터 바 컴포넌트입니다.
 * 사업부, 적용여부, 검색어로 필터링할 수 있습니다.
 *
 * 초보자 가이드:
 * 1. **businessUnit**: 사업부 필터
 * 2. **applyStatus**: 적용여부 필터
 * 3. **search**: 검색어 (관리번호, 기능명, 요구사항)
 */

"use client";

import { useState, useCallback } from "react";
import { Search, Filter, X } from "lucide-react";
import {
  type FilterState,
  APPLY_STATUS_LABELS,
  BUSINESS_UNITS,
} from "../types";

interface FilterBarProps {
  filters: FilterState;
  onFilterChange: (filters: Partial<FilterState>) => void;
  businessUnits?: string[];
}

/**
 * 필터 바 컴포넌트
 */
export function FilterBar({
  filters,
  onFilterChange,
  businessUnits = [...BUSINESS_UNITS],
}: FilterBarProps) {
  const [searchInput, setSearchInput] = useState(filters.search);

  // 검색 실행
  const handleSearch = useCallback(() => {
    onFilterChange({ search: searchInput });
  }, [searchInput, onFilterChange]);

  // Enter 키 처리
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter") {
        handleSearch();
      }
    },
    [handleSearch]
  );

  // 필터 초기화
  const handleReset = useCallback(() => {
    setSearchInput("");
    onFilterChange({
      businessUnit: "",
      applyStatus: "",
      search: "",
    });
  }, [onFilterChange]);

  // 활성 필터 개수
  const activeFilters = [
    filters.businessUnit,
    filters.applyStatus,
    filters.search,
  ].filter(Boolean).length;

  return (
    <div className="flex flex-col gap-3 p-4 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
      <div className="flex flex-wrap items-center gap-3">
        {/* 검색 입력 */}
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="관리번호, 기능명, 요구사항 검색..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={handleKeyDown}
            className="w-full pl-10 pr-4 py-2 text-sm border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* 사업부 필터 */}
        <select
          value={filters.businessUnit}
          onChange={(e) => onFilterChange({ businessUnit: e.target.value })}
          className="px-3 py-2 text-sm border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">전체 사업부</option>
          {businessUnits.map((unit) => (
            <option key={unit} value={unit}>
              {unit}
            </option>
          ))}
        </select>

        {/* 적용여부 필터 */}
        <select
          value={filters.applyStatus}
          onChange={(e) => onFilterChange({ applyStatus: e.target.value })}
          className="px-3 py-2 text-sm border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">전체 상태</option>
          {Object.entries(APPLY_STATUS_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>

        {/* 검색 버튼 */}
        <button
          onClick={handleSearch}
          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
        >
          검색
        </button>

        {/* 초기화 버튼 */}
        {activeFilters > 0 && (
          <button
            onClick={handleReset}
            className="flex items-center gap-1 px-3 py-2 text-sm text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
          >
            <X className="w-4 h-4" />
            초기화
          </button>
        )}
      </div>

      {/* 활성 필터 표시 */}
      {activeFilters > 0 && (
        <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
          <Filter className="w-4 h-4" />
          <span>
            {activeFilters}개 필터 적용됨
            {filters.businessUnit && ` · 사업부: ${filters.businessUnit}`}
            {filters.applyStatus &&
              ` · 상태: ${APPLY_STATUS_LABELS[filters.applyStatus as keyof typeof APPLY_STATUS_LABELS]}`}
            {filters.search && ` · 검색: "${filters.search}"`}
          </span>
        </div>
      )}
    </div>
  );
}
