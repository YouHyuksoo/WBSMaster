/**
 * @file src/app/dashboard/process-verification/page.tsx
 * @description
 * 기능추적표(공정검증) 페이지입니다.
 * Excel에서 가져온 공정검증 항목을 카테고리별로 관리합니다.
 *
 * 초보자 가이드:
 * 1. 좌측 사이드바에서 카테고리 선택
 * 2. 우측 테이블에서 항목 조회/편집
 * 3. Excel 가져오기로 데이터 일괄 등록
 */

"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { CategoryList, ItemTable, FilterBar } from "./components";
import {
  ProcessVerificationCategory,
  ProcessVerificationItem,
  FilterState,
} from "./types";

/**
 * 기본 프로젝트 ID 가져오기 (첫 번째 프로젝트 사용)
 */
async function getDefaultProjectId(): Promise<string | null> {
  try {
    const res = await fetch("/api/projects");
    if (!res.ok) return null;
    const projects = await res.json();
    return projects[0]?.id || null;
  } catch {
    return null;
  }
}

/**
 * 기능추적표 페이지 컴포넌트
 */
export default function ProcessVerificationPage() {
  const searchParams = useSearchParams();

  // 상태
  const [projectId, setProjectId] = useState<string | null>(null);
  const [categories, setCategories] = useState<ProcessVerificationCategory[]>([]);
  const [items, setItems] = useState<ProcessVerificationItem[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterState>({
    categoryId: null,
    isApplied: null,
    status: null,
    search: "",
  });
  const [isLoadingCategories, setIsLoadingCategories] = useState(true);
  const [isLoadingItems, setIsLoadingItems] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  // 프로젝트 ID 초기화
  useEffect(() => {
    const urlProjectId = searchParams.get("projectId");
    if (urlProjectId) {
      setProjectId(urlProjectId);
    } else {
      getDefaultProjectId().then((id) => {
        if (id) setProjectId(id);
      });
    }
  }, [searchParams]);

  // 카테고리 로드
  const loadCategories = useCallback(async () => {
    if (!projectId) return;

    setIsLoadingCategories(true);
    try {
      const res = await fetch(
        `/api/process-verification/categories?projectId=${projectId}`
      );
      if (res.ok) {
        const data = await res.json();
        setCategories(data);
      }
    } catch (error) {
      console.error("카테고리 로드 실패:", error);
    } finally {
      setIsLoadingCategories(false);
    }
  }, [projectId]);

  // 항목 로드
  const loadItems = useCallback(async () => {
    if (!projectId) return;

    setIsLoadingItems(true);
    try {
      const params = new URLSearchParams();
      params.set("projectId", projectId);

      if (selectedCategoryId) {
        params.set("categoryId", selectedCategoryId);
      }
      if (filter.isApplied !== null) {
        params.set("isApplied", String(filter.isApplied));
      }
      if (filter.search) {
        params.set("search", filter.search);
      }

      const res = await fetch(`/api/process-verification/items?${params}`);
      if (res.ok) {
        const data = await res.json();
        setItems(data);
      }
    } catch (error) {
      console.error("항목 로드 실패:", error);
    } finally {
      setIsLoadingItems(false);
    }
  }, [projectId, selectedCategoryId, filter.isApplied, filter.search]);

  // 프로젝트 ID 변경 시 카테고리 로드
  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  // 카테고리 또는 필터 변경 시 항목 로드
  useEffect(() => {
    loadItems();
  }, [loadItems]);

  // 필터링된 항목
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      if (filter.status && item.status !== filter.status) {
        return false;
      }
      return true;
    });
  }, [items, filter.status]);

  // 통계 계산
  const stats = useMemo(() => {
    return {
      total: filteredItems.length,
      applied: filteredItems.filter((item) => item.isApplied).length,
    };
  }, [filteredItems]);

  // 카테고리 선택 핸들러
  const handleSelectCategory = (categoryId: string | null) => {
    setSelectedCategoryId(categoryId);
    setFilter((prev) => ({ ...prev, categoryId }));
  };

  // 필터 변경 핸들러
  const handleFilterChange = (newFilter: Partial<FilterState>) => {
    setFilter((prev) => ({ ...prev, ...newFilter }));
  };

  // 항목 업데이트 핸들러
  const handleUpdateItem = async (
    id: string,
    data: Partial<ProcessVerificationItem>
  ) => {
    try {
      const res = await fetch(`/api/process-verification/items/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (res.ok) {
        const updatedItem = await res.json();
        setItems((prev) =>
          prev.map((item) => (item.id === id ? updatedItem : item))
        );
      }
    } catch (error) {
      console.error("항목 업데이트 실패:", error);
    }
  };

  // Excel 가져오기 핸들러
  const handleImportExcel = async () => {
    if (!projectId) {
      alert("프로젝트가 선택되지 않았습니다.");
      return;
    }

    const confirmImport = confirm(
      "Excel 데이터를 가져오시겠습니까?\n\n" +
        "scripts/excel_data.xlsx 파일의 데이터가 등록됩니다.\n" +
        "(기존 데이터는 유지됩니다)"
    );

    if (!confirmImport) return;

    setIsImporting(true);
    try {
      const res = await fetch("/api/process-verification/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId, clearExisting: false }),
      });

      const result = await res.json();

      if (res.ok) {
        alert(
          `Excel 가져오기 완료!\n\n` +
            `카테고리 생성: ${result.stats.categoriesCreated}개\n` +
            `항목 생성: ${result.stats.itemsCreated}개\n` +
            (result.stats.skippedSheets.length > 0
              ? `건너뛴 시트: ${result.stats.skippedSheets.join(", ")}`
              : "")
        );
        loadCategories();
        loadItems();
      } else {
        alert(`가져오기 실패: ${result.error}`);
      }
    } catch (error) {
      console.error("Excel 가져오기 실패:", error);
      alert("Excel 가져오기 중 오류가 발생했습니다.");
    } finally {
      setIsImporting(false);
    }
  };

  // 프로젝트가 없는 경우
  if (!projectId && !isLoadingCategories) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center text-slate-500">
          <p>프로젝트를 찾을 수 없습니다.</p>
          <p className="text-sm mt-2">먼저 프로젝트를 생성해주세요.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-slate-50">
      {/* 헤더 */}
      <div className="bg-white border-b border-slate-200 px-6 py-4">
        <h1 className="text-xl font-bold text-slate-800">기능추적표</h1>
        <p className="text-sm text-slate-500 mt-1">
          공정검증 항목을 관리하고 검증 상태를 추적합니다.
        </p>
      </div>

      {/* 필터 바 */}
      <FilterBar
        filter={filter}
        onFilterChange={handleFilterChange}
        onImportExcel={handleImportExcel}
        isImporting={isImporting}
        totalCount={stats.total}
        appliedCount={stats.applied}
      />

      {/* 메인 컨텐츠 */}
      <div className="flex flex-1 overflow-hidden">
        {/* 카테고리 사이드바 */}
        <CategoryList
          categories={categories}
          selectedCategoryId={selectedCategoryId}
          onSelectCategory={handleSelectCategory}
          isLoading={isLoadingCategories}
        />

        {/* 항목 테이블 */}
        <div className="flex-1 overflow-auto bg-white">
          <ItemTable
            items={filteredItems}
            isLoading={isLoadingItems}
            onUpdateItem={handleUpdateItem}
          />
        </div>
      </div>
    </div>
  );
}
