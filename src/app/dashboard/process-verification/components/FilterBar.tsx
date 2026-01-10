/**
 * @file src/app/dashboard/process-verification/components/FilterBar.tsx
 * @description
 * 공정검증 필터 바 컴포넌트입니다.
 * 검색, 필터링, Excel 가져오기 기능을 제공합니다.
 */

"use client";

import { useState } from "react";
import {
  FilterState,
  VerificationStatus,
  verificationStatusConfig,
} from "../types";

interface FilterBarProps {
  filter: FilterState;
  onFilterChange: (filter: Partial<FilterState>) => void;
  onImportExcel: () => void;
  isImporting?: boolean;
  totalCount: number;
  appliedCount: number;
}

/**
 * 필터 바 컴포넌트
 */
export default function FilterBar({
  filter,
  onFilterChange,
  onImportExcel,
  isImporting,
  totalCount,
  appliedCount,
}: FilterBarProps) {
  const [searchInput, setSearchInput] = useState(filter.search);

  // 검색 실행
  const handleSearch = () => {
    onFilterChange({ search: searchInput });
  };

  // Enter 키로 검색
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  };

  return (
    <div className="bg-white border-b border-slate-200 p-4">
      <div className="flex flex-wrap items-center gap-4">
        {/* 검색 */}
        <div className="flex-1 min-w-[200px] max-w-md">
          <div className="relative">
            <input
              type="text"
              placeholder="검색 (관리영역, 세부항목, 코드...)"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={handleKeyDown}
              className="w-full pl-10 pr-4 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </div>
        </div>

        {/* 적용 필터 */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-slate-600">적용:</span>
          <div className="flex rounded-lg border border-slate-300 overflow-hidden">
            <button
              onClick={() => onFilterChange({ isApplied: null })}
              className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                filter.isApplied === null
                  ? "bg-blue-500 text-white"
                  : "bg-white text-slate-600 hover:bg-slate-50"
              }`}
            >
              전체
            </button>
            <button
              onClick={() => onFilterChange({ isApplied: true })}
              className={`px-3 py-1.5 text-xs font-medium transition-colors border-l border-slate-300 ${
                filter.isApplied === true
                  ? "bg-blue-500 text-white"
                  : "bg-white text-slate-600 hover:bg-slate-50"
              }`}
            >
              Y
            </button>
            <button
              onClick={() => onFilterChange({ isApplied: false })}
              className={`px-3 py-1.5 text-xs font-medium transition-colors border-l border-slate-300 ${
                filter.isApplied === false
                  ? "bg-blue-500 text-white"
                  : "bg-white text-slate-600 hover:bg-slate-50"
              }`}
            >
              N
            </button>
          </div>
        </div>

        {/* 상태 필터 */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-slate-600">상태:</span>
          <select
            value={filter.status || ""}
            onChange={(e) =>
              onFilterChange({
                status: e.target.value
                  ? (e.target.value as VerificationStatus)
                  : null,
              })
            }
            className="text-sm border border-slate-300 rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">전체</option>
            {Object.entries(verificationStatusConfig).map(([key, config]) => (
              <option key={key} value={key}>
                {config.label}
              </option>
            ))}
          </select>
        </div>

        {/* 통계 */}
        <div className="flex items-center gap-4 text-sm text-slate-500 ml-auto">
          <span>
            전체: <strong className="text-slate-700">{totalCount}</strong>
          </span>
          <span>
            적용: <strong className="text-blue-600">{appliedCount}</strong>
          </span>
        </div>

        {/* Excel 가져오기 버튼 */}
        <button
          onClick={onImportExcel}
          disabled={isImporting}
          className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isImporting ? (
            <>
              <svg
                className="animate-spin w-4 h-4"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              가져오는 중...
            </>
          ) : (
            <>
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                />
              </svg>
              Excel 가져오기
            </>
          )}
        </button>
      </div>
    </div>
  );
}
