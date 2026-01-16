/**
 * @file src/app/dashboard/process-verification/components/CategoryList.tsx
 * @description
 * 공정검증 카테고리 목록 컴포넌트입니다.
 * 좌측 사이드바 형태로 카테고리와 관리영역을 계층 구조로 표시합니다.
 *
 * 구조:
 * - 카테고리(구분) > 관리영역 2단계 레벨
 * - 카테고리 클릭 시 펼침/접힘
 * - 관리영역 클릭 시 해당 영역만 필터링
 */

"use client";

import { useState, useMemo } from "react";
import { Icon } from "@/components/ui";
import { ProcessVerificationCategory, ProcessVerificationItem } from "../types";

interface CategoryListProps {
  categories: ProcessVerificationCategory[];
  items: ProcessVerificationItem[];
  selectedCategoryId: string | null;
  selectedManagementArea: string | null;
  onSelectCategory: (categoryId: string | null) => void;
  onSelectManagementArea: (managementArea: string | null) => void;
  isLoading?: boolean;
}

/**
 * 카테고리 목록 컴포넌트
 * 카테고리 > 관리영역 2단계 트리 구조
 */
export default function CategoryList({
  categories,
  items,
  selectedCategoryId,
  selectedManagementArea,
  onSelectCategory,
  onSelectManagementArea,
  isLoading,
}: CategoryListProps) {
  // 펼쳐진 카테고리 ID 목록
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());

  // 전체 항목 수 계산
  const totalCount = items.length;

  // 카테고리별 항목 수 및 관리영역 목록 계산
  const categoryData = useMemo(() => {
    return categories.map((category) => {
      const categoryItems = items.filter((item) => item.categoryId === category.id);

      // 해당 카테고리의 고유한 관리영역 목록 및 각 영역별 카운트
      const managementAreaMap = new Map<string, number>();
      categoryItems.forEach((item) => {
        if (item.managementArea) {
          const count = managementAreaMap.get(item.managementArea) || 0;
          managementAreaMap.set(item.managementArea, count + 1);
        }
      });

      // 관리영역을 배열로 변환하고 정렬
      const managementAreas = Array.from(managementAreaMap.entries())
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => a.name.localeCompare(b.name, "ko"));

      return {
        ...category,
        itemCount: categoryItems.length,
        managementAreas,
      };
    });
  }, [categories, items]);

  // 카테고리 펼침/접힘 토글
  const toggleCategory = (categoryId: string) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(categoryId)) {
        next.delete(categoryId);
      } else {
        next.add(categoryId);
      }
      return next;
    });
  };

  // 카테고리 선택 핸들러
  const handleSelectCategory = (categoryId: string) => {
    onSelectCategory(categoryId);
    onSelectManagementArea(null); // 관리영역 선택 해제
    // 자동으로 펼치기
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      next.add(categoryId);
      return next;
    });
  };

  // 관리영역 선택 핸들러
  const handleSelectManagementArea = (categoryId: string, managementArea: string) => {
    onSelectCategory(categoryId);
    onSelectManagementArea(managementArea);
  };

  // 전체 선택 핸들러
  const handleSelectAll = () => {
    onSelectCategory(null);
    onSelectManagementArea(null);
  };

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
    <div className="w-72 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-700 flex flex-col max-h-[calc(100vh-300px)]">
      {/* 헤더 */}
      <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex-shrink-0">
        <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-200">카테고리</h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">구분 &gt; 관리영역</p>
      </div>

      {/* 전체 보기 */}
      <div className="p-2 flex-shrink-0">
        <button
          onClick={handleSelectAll}
          className={`w-full text-left px-3 py-2 rounded-lg transition-colors flex items-center justify-between ${
            selectedCategoryId === null && selectedManagementArea === null
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

      {/* 카테고리 목록 - 스크롤 영역 */}
      <div
        className="flex-1 overflow-y-auto p-2 space-y-1"
        style={{
          scrollbarWidth: "thin",
          scrollbarColor: "#94a3b8 transparent",
        }}
      >
        {categoryData.map((category) => {
          const isExpanded = expandedCategories.has(category.id);
          const isSelected = selectedCategoryId === category.id && selectedManagementArea === null;

          return (
            <div key={category.id}>
              {/* 카테고리 행 */}
              <div className="flex items-center">
                {/* 펼침/접힘 버튼 */}
                <button
                  onClick={() => toggleCategory(category.id)}
                  className="size-6 flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 flex-shrink-0"
                >
                  <Icon
                    name={isExpanded ? "expand_more" : "chevron_right"}
                    size="xs"
                  />
                </button>

                {/* 카테고리 버튼 */}
                <button
                  onClick={() => handleSelectCategory(category.id)}
                  className={`flex-1 text-left px-2 py-2 rounded-lg transition-colors flex items-center justify-between text-sm ${
                    isSelected
                      ? "bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 font-medium"
                      : "hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400"
                  }`}
                >
                  <span className="truncate font-medium">{category.name}</span>
                  <span className="text-xs bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400 px-2 py-0.5 rounded-full flex-shrink-0 ml-2">
                    {category.itemCount}
                  </span>
                </button>
              </div>

              {/* 관리영역 목록 (펼쳐진 경우) */}
              {isExpanded && category.managementAreas.length > 0 && (
                <div className="ml-6 mt-1 space-y-0.5 border-l-2 border-slate-200 dark:border-slate-700 pl-2">
                  {category.managementAreas.map((area) => {
                    const isAreaSelected =
                      selectedCategoryId === category.id &&
                      selectedManagementArea === area.name;

                    return (
                      <button
                        key={area.name}
                        onClick={() => handleSelectManagementArea(category.id, area.name)}
                        className={`w-full text-left px-2 py-1.5 rounded-md transition-colors flex items-center justify-between text-xs ${
                          isAreaSelected
                            ? "bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 font-medium"
                            : "hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400"
                        }`}
                      >
                        <span className="truncate">{area.name}</span>
                        <span className="text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-500 px-1.5 py-0.5 rounded flex-shrink-0 ml-2">
                          {area.count}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
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
