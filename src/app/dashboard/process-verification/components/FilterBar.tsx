/**
 * @file src/app/dashboard/process-verification/components/FilterBar.tsx
 * @description
 * 공정검증 필터 바 컴포넌트입니다.
 * 검색 및 필터링 기능을 제공합니다.
 * customer-requirements 스타일과 통일됨.
 */

"use client";

import { useState } from "react";
import { Icon, Input } from "@/components/ui";
import { BUSINESS_UNITS } from "@/constants/business-units";
import {
  FilterState,
  VerificationStatus,
  verificationStatusConfig,
} from "../types";

interface FilterBarProps {
  filter: FilterState;
  onFilterChange: (filter: Partial<FilterState>) => void;
  totalCount: number;
  appliedCount: number;
  viewMode: "grid" | "comparison";
  onViewModeChange: (mode: "grid" | "comparison") => void;
}

/**
 * 필터 바 컴포넌트
 * 카테고리 필터는 좌측 사이드바에서 선택하므로 제외
 */
export default function FilterBar({
  filter,
  onFilterChange,
  viewMode,
  onViewModeChange,
}: FilterBarProps) {
  const [searchInput, setSearchInput] = useState(filter.search);

  // 검색 실행
  const handleSearch = () => {
    onFilterChange({ search: searchInput });
  };

  // Enter 키로 검색
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  };

  return (
    <div className="flex flex-wrap items-center justify-between gap-4">
      {/* 좌측: 필터 */}
      <div className="flex flex-wrap gap-4">
        <div className="w-64">
          <Input
            leftIcon="search"
            placeholder="검색..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={handleSearch}
          />
        </div>

        {/* 사업부 필터 */}
        <select
          value={filter.businessUnit}
          onChange={(e) =>
            onFilterChange({
              businessUnit: e.target.value,
            })
          }
          className="px-3 py-2 rounded-lg bg-surface dark:bg-surface-dark border border-border dark:border-border-dark text-sm text-text dark:text-white"
        >
          {BUSINESS_UNITS.map((unit) => (
            <option key={unit} value={unit}>
              {unit}
            </option>
          ))}
        </select>

        {/* 적용 필터 */}
        <select
          value={filter.isApplied === null ? "all" : filter.isApplied ? "Y" : "N"}
          onChange={(e) => {
            const val = e.target.value;
            onFilterChange({
              isApplied: val === "all" ? null : val === "Y",
            });
          }}
          className="px-3 py-2 rounded-lg bg-surface dark:bg-surface-dark border border-border dark:border-border-dark text-sm text-text dark:text-white"
        >
          <option value="all">전체 적용</option>
          <option value="Y">적용 (Y)</option>
          <option value="N">미적용 (N)</option>
        </select>

        {/* 상태 필터 */}
        <select
          value={filter.status || ""}
          onChange={(e) =>
            onFilterChange({
              status: e.target.value
                ? (e.target.value as VerificationStatus)
                : null,
            })
          }
          className="px-3 py-2 rounded-lg bg-surface dark:bg-surface-dark border border-border dark:border-border-dark text-sm text-text dark:text-white"
        >
          <option value="">전체 상태</option>
          {Object.entries(verificationStatusConfig).map(([key, config]) => (
            <option key={key} value={key}>
              {config.label}
            </option>
          ))}
        </select>
      </div>

      {/* 우측: 보기 모드 전환 */}
      <div className="flex items-center gap-1 p-1 bg-surface dark:bg-background-dark rounded-lg">
        <button
          onClick={() => onViewModeChange("grid")}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
            viewMode === "grid"
              ? "bg-background-white dark:bg-surface-dark text-primary shadow-sm"
              : "text-text-secondary hover:text-text dark:hover:text-white"
          }`}
          title="상세 그리드"
        >
          <Icon name="table_chart" size="xs" />
          <span className="hidden sm:inline">상세 그리드</span>
        </button>
        <button
          onClick={() => onViewModeChange("comparison")}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
            viewMode === "comparison"
              ? "bg-background-white dark:bg-surface-dark text-primary shadow-sm"
              : "text-text-secondary hover:text-text dark:hover:text-white"
          }`}
          title="그룹 비교"
        >
          <Icon name="compare_arrows" size="xs" />
          <span className="hidden sm:inline">그룹 비교</span>
        </button>
      </div>
    </div>
  );
}
