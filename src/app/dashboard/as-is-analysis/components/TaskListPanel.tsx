/**
 * @file src/app/dashboard/as-is-analysis/components/TaskListPanel.tsx
 * @description
 * 좌측 업무 목록 패널 컴포넌트입니다.
 * 대분류별로 그룹핑된 업무 목록을 트리 형태로 표시합니다.
 *
 * 초보자 가이드:
 * 1. **검색**: 업무명/중분류로 필터링
 * 2. **대분류 그룹**: 접기/펴기 가능
 * 3. **항목 클릭**: 해당 업무 선택
 */

"use client";

import { useState, useMemo } from "react";
import { Icon, Input } from "@/components/ui";
import { MAJOR_CATEGORIES, CURRENT_METHODS } from "../constants";
import type { AsIsOverviewItem, AsIsMajorCategory } from "../types";

interface TaskListPanelProps {
  /** 업무 항목 목록 */
  items: AsIsOverviewItem[];
  /** 선택된 항목 */
  selectedItem: AsIsOverviewItem | null;
  /** 항목 선택 핸들러 */
  onSelectItem: (item: AsIsOverviewItem) => void;
  /** 로딩 상태 */
  isLoading: boolean;
}

/**
 * 좌측 업무 목록 패널 컴포넌트
 */
export function TaskListPanel({
  items,
  selectedItem,
  onSelectItem,
  isLoading,
}: TaskListPanelProps) {
  const [search, setSearch] = useState("");
  const [expandedCategories, setExpandedCategories] = useState<Set<AsIsMajorCategory>>(
    new Set(Object.keys(MAJOR_CATEGORIES) as AsIsMajorCategory[])
  );

  // 검색 필터링
  const filteredItems = useMemo(() => {
    if (!search.trim()) return items;
    const query = search.toLowerCase();
    return items.filter(
      (item) =>
        item.taskName.toLowerCase().includes(query) ||
        item.middleCategory.toLowerCase().includes(query)
    );
  }, [items, search]);

  // 대분류별 그룹핑
  const groupedItems = useMemo(() => {
    return filteredItems.reduce((acc, item) => {
      const category = item.majorCategory;
      if (!acc[category]) {
        acc[category] = [];
      }
      acc[category].push(item);
      return acc;
    }, {} as Record<AsIsMajorCategory, AsIsOverviewItem[]>);
  }, [filteredItems]);

  // 카테고리 토글
  const toggleCategory = (category: AsIsMajorCategory) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(category)) {
      newExpanded.delete(category);
    } else {
      newExpanded.add(category);
    }
    setExpandedCategories(newExpanded);
  };

  return (
    <div className="h-full flex flex-col">
      {/* 검색 */}
      <div className="p-3 border-b border-border dark:border-border-dark">
        <Input
          leftIcon="search"
          placeholder="업무 검색..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="text-sm"
        />
      </div>

      {/* 목록 */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="flex items-center justify-center h-32">
            <Icon name="progress_activity" size="lg" className="text-primary animate-spin" />
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 px-4 text-center">
            <Icon name="inbox" size="lg" className="text-text-secondary mb-2" />
            <p className="text-sm text-text-secondary">등록된 업무가 없습니다</p>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 px-4 text-center">
            <Icon name="search_off" size="lg" className="text-text-secondary mb-2" />
            <p className="text-sm text-text-secondary">검색 결과가 없습니다</p>
          </div>
        ) : (
          <div className="py-2">
            {Object.entries(groupedItems).map(([category, categoryItems]) => {
              const config = MAJOR_CATEGORIES[category as AsIsMajorCategory];
              const isExpanded = expandedCategories.has(category as AsIsMajorCategory);

              return (
                <div key={category}>
                  {/* 카테고리 헤더 */}
                  <button
                    onClick={() => toggleCategory(category as AsIsMajorCategory)}
                    className="w-full flex items-center gap-2 px-3 py-2 hover:bg-surface dark:hover:bg-background-dark transition-colors"
                  >
                    <Icon
                      name={isExpanded ? "expand_more" : "chevron_right"}
                      size="xs"
                      className="text-text-secondary"
                    />
                    <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded-md ${config.bgColor}`}>
                      <Icon name={config.icon} size="xs" className={config.color} />
                      <span className={`text-xs font-medium ${config.color}`}>
                        {config.label}
                      </span>
                    </div>
                    <span className="ml-auto text-xs text-text-secondary">
                      {categoryItems.length}
                    </span>
                  </button>

                  {/* 항목 목록 */}
                  {isExpanded && (
                    <div className="pl-6">
                      {categoryItems.map((item) => {
                        const isSelected = selectedItem?.id === item.id;
                        const methodConfig = CURRENT_METHODS[item.currentMethod];
                        const hasAnalysis = !!item.unitAnalysis;

                        return (
                          <button
                            key={item.id}
                            onClick={() => onSelectItem(item)}
                            className={`w-full flex items-start gap-2 px-3 py-2 text-left transition-colors ${
                              isSelected
                                ? "bg-primary/10 border-l-2 border-l-primary"
                                : "hover:bg-surface dark:hover:bg-background-dark border-l-2 border-l-transparent"
                            }`}
                          >
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5">
                                <span className={`text-sm font-medium ${
                                  isSelected ? "text-primary" : "text-text dark:text-white"
                                } truncate`}>
                                  {item.taskName}
                                </span>
                                {hasAnalysis && (
                                  <Icon
                                    name="check_circle"
                                    size="xs"
                                    className="text-success flex-shrink-0"
                                  />
                                )}
                              </div>
                              <div className="flex items-center gap-2 mt-0.5">
                                <span className="text-xs text-text-secondary truncate">
                                  {item.middleCategory}
                                </span>
                                <span className={`text-[10px] px-1.5 py-0.5 rounded ${methodConfig.bgColor} ${methodConfig.color}`}>
                                  {methodConfig.label}
                                </span>
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 통계 */}
      <div className="p-3 border-t border-border dark:border-border-dark bg-surface dark:bg-background-dark">
        <div className="flex items-center justify-between text-xs text-text-secondary">
          <span>전체 업무</span>
          <span className="font-medium">{items.length}개</span>
        </div>
        <div className="flex items-center justify-between text-xs text-text-secondary mt-1">
          <span>분석 완료</span>
          <span className="font-medium text-success">
            {items.filter((i) => i.unitAnalysis).length}개
          </span>
        </div>
      </div>
    </div>
  );
}
