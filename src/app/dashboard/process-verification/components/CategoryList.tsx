/**
 * @file src/app/dashboard/process-verification/components/CategoryList.tsx
 * @description
 * 공정검증 카테고리 목록 컴포넌트입니다.
 * 좌측 사이드바 형태로 카테고리를 표시합니다.
 */

"use client";

import { ProcessVerificationCategory } from "../types";

interface CategoryListProps {
  categories: ProcessVerificationCategory[];
  selectedCategoryId: string | null;
  onSelectCategory: (categoryId: string | null) => void;
  isLoading?: boolean;
}

/**
 * 카테고리 목록 컴포넌트
 */
export default function CategoryList({
  categories,
  selectedCategoryId,
  onSelectCategory,
  isLoading,
}: CategoryListProps) {
  // 전체 항목 수 계산
  const totalCount = categories.reduce(
    (sum, cat) => sum + (cat._count?.items || 0),
    0
  );

  if (isLoading) {
    return (
      <div className="w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-700 p-4">
        <div className="animate-pulse space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-10 bg-slate-200 dark:bg-slate-700 rounded" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-700 flex flex-col h-full">
      {/* 헤더 */}
      <div className="p-4 border-b border-slate-200 dark:border-slate-700">
        <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-200">카테고리</h2>
      </div>

      {/* 전체 보기 */}
      <div className="p-2">
        <button
          onClick={() => onSelectCategory(null)}
          className={`w-full text-left px-3 py-2 rounded-lg transition-colors flex items-center justify-between ${
            selectedCategoryId === null
              ? "bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 font-medium"
              : "hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400"
          }`}
        >
          <span>전체</span>
          <span className="text-xs bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400 px-2 py-0.5 rounded-full">
            {totalCount}
          </span>
        </button>
      </div>

      {/* 카테고리 목록 */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {categories.map((category) => (
          <button
            key={category.id}
            onClick={() => onSelectCategory(category.id)}
            className={`w-full text-left px-3 py-2 rounded-lg transition-colors flex items-center justify-between text-sm ${
              selectedCategoryId === category.id
                ? "bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 font-medium"
                : "hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400"
            }`}
          >
            <span className="truncate">{category.name}</span>
            <span className="text-xs bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400 px-2 py-0.5 rounded-full flex-shrink-0 ml-2">
              {category._count?.items || 0}
            </span>
          </button>
        ))}
      </div>

      {/* 카테고리가 없을 때 */}
      {categories.length === 0 && (
        <div className="p-4 text-center text-slate-500 dark:text-slate-400 text-sm">
          카테고리가 없습니다.
          <br />
          Excel 데이터를 가져와주세요.
        </div>
      )}
    </div>
  );
}
