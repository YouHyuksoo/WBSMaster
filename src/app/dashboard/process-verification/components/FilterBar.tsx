/**
 * @file src/app/dashboard/process-verification/components/FilterBar.tsx
 * @description
 * 공정검증 필터 바 컴포넌트입니다.
 * 검색 및 필터링 기능을 제공합니다.
 */

"use client";

import { useState } from "react";
import { Icon } from "@/components/ui";
import { BUSINESS_UNITS } from "@/constants/business-units";
import {
  FilterState,
  VerificationStatus,
  verificationStatusConfig,
  ProcessVerificationCategory,
} from "../types";

interface FilterBarProps {
  filter: FilterState;
  onFilterChange: (filter: Partial<FilterState>) => void;
  totalCount: number;
  appliedCount: number;
  categories: ProcessVerificationCategory[];
  viewMode: "grid" | "comparison";
  onViewModeChange: (mode: "grid" | "comparison") => void;
}

/**
 * 필터 바 컴포넌트
 */
export default function FilterBar({
  filter,
  onFilterChange,
  totalCount,
  appliedCount,
  categories,
  viewMode,
  onViewModeChange,
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
    <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 p-4">
      <div className="flex flex-wrap items-center gap-4">
        {/* 검색 */}
        <div className="flex-1 min-w-[150px] max-w-xs">
          <div className="relative">
            <input
              type="text"
              placeholder="검색..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={handleKeyDown}
              className="w-full pl-10 pr-4 py-2 text-sm border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500"
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

        {/* 카테고리 필터 */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-slate-600 dark:text-slate-400">카테고리:</span>
          <select
            value={filter.categoryId || ""}
            onChange={(e) =>
              onFilterChange({
                categoryId: e.target.value || null,
              })
            }
            className="text-sm border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-1.5 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">전체</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </div>

        {/* 적용 필터 */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-slate-600 dark:text-slate-400">적용:</span>
          <div className="flex rounded-lg border border-slate-300 dark:border-slate-600 overflow-hidden">
            <button
              onClick={() => onFilterChange({ isApplied: null })}
              className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                filter.isApplied === null
                  ? "bg-blue-500 text-white"
                  : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700"
              }`}
            >
              전체
            </button>
            <button
              onClick={() => onFilterChange({ isApplied: true })}
              className={`px-3 py-1.5 text-xs font-medium transition-colors border-l border-slate-300 dark:border-slate-600 ${
                filter.isApplied === true
                  ? "bg-blue-500 text-white"
                  : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700"
              }`}
            >
              Y
            </button>
            <button
              onClick={() => onFilterChange({ isApplied: false })}
              className={`px-3 py-1.5 text-xs font-medium transition-colors border-l border-slate-300 dark:border-slate-600 ${
                filter.isApplied === false
                  ? "bg-blue-500 text-white"
                  : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700"
              }`}
            >
              N
            </button>
          </div>
        </div>

        {/* 상태 필터 */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-slate-600 dark:text-slate-400">상태:</span>
          <select
            value={filter.status || ""}
            onChange={(e) =>
              onFilterChange({
                status: e.target.value
                  ? (e.target.value as VerificationStatus)
                  : null,
              })
            }
            className="text-sm border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-1.5 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">전체</option>
            {Object.entries(verificationStatusConfig).map(([key, config]) => (
              <option key={key} value={key}>
                {config.label}
              </option>
            ))}
          </select>
        </div>

        {/* 사업부 필터 */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-slate-600 dark:text-slate-400">사업부:</span>
          <select
            value={filter.businessUnit}
            onChange={(e) =>
              onFilterChange({
                businessUnit: e.target.value,
              })
            }
            className="text-sm border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-1.5 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            {BUSINESS_UNITS.map((unit) => (
              <option key={unit} value={unit}>
                {unit}
              </option>
            ))}
          </select>
        </div>

        {/* 통계 */}
        <div className="flex items-center gap-4 text-sm text-slate-500 dark:text-slate-400 ml-auto">
          <span>
            전체: <strong className="text-slate-700 dark:text-slate-200">{totalCount}</strong>
          </span>
          <span>
            적용: <strong className="text-blue-600 dark:text-blue-400">{appliedCount}</strong>
          </span>
        </div>

        {/* 뷰 모드 선택 */}
        <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg">
          <button
            onClick={() => onViewModeChange("grid")}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
              viewMode === "grid"
                ? "bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
            }`}
          >
            <Icon name="table_chart" size="xs" />
            <span>상세 그리드</span>
          </button>
          <button
            onClick={() => onViewModeChange("comparison")}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
              viewMode === "comparison"
                ? "bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
            }`}
          >
            <Icon name="compare_arrows" size="xs" />
            <span>그룹 비교</span>
          </button>
        </div>
      </div>
    </div>
  );
}
