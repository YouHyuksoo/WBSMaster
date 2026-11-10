/**
 * @file src/app/dashboard/process-verification/components/FilterBar.tsx
 * @description
 * 공정검증 필터 바 컴포넌트입니다.
 * 검색 및 필터링 기능을 제공합니다.
 * customer-requirements 스타일과 통일됨.
 *
 * 초보자 가이드:
 * 1. **검색**: Enter 또는 입력창을 벗어나면 검색어를 적용한다
 * 2. **제품유형**: SMD / HANES 로 마스터를 거른다
 * 3. **상태**: 검증 상태 선택 값을 FilterState.status 에 담는다 (목록 필터링에는 아직 미반영)
 * 4. 카테고리는 좌측 사이드바(CategoryList)에서 고른다
 */

"use client";

import { useState } from "react";
import { Input } from "@/components/ui";
import {
  FilterState,
  VerificationStatus,
  verificationStatusConfig,
  PRODUCT_TYPES,
  ProductType,
} from "../types";

interface FilterBarProps {
  filter: FilterState;
  onFilterChange: (filter: Partial<FilterState>) => void;
}

/**
 * 필터 바 컴포넌트
 * 카테고리 필터는 좌측 사이드바에서 선택하므로 제외
 */
export default function FilterBar({
  filter,
  onFilterChange,
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

        {/* 제품유형 필터 */}
        <select
          value={filter.productType || ""}
          onChange={(e) =>
            onFilterChange({
              productType: e.target.value ? (e.target.value as ProductType) : null,
            })
          }
          className="px-3 py-2 rounded-lg bg-surface dark:bg-surface-dark border border-border dark:border-border-dark text-sm text-text dark:text-white"
        >
          <option value="">전체 제품유형</option>
          {PRODUCT_TYPES.map((type) => (
            <option key={type} value={type}>
              {type}
            </option>
          ))}
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
    </div>
  );
}
